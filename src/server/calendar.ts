import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { db, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError, PermissionError } from "@/lib/permissions";
import { addDays, daysBetween, localDate, zonedInstant } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import { schedule, cancelJobs } from "@/lib/jobs";
import { requirePermission, isUuid } from "./access";
import { notify, orgMemberIds } from "./notify";
import type { Actor } from "./accounts";

/**
 * Availability calendar and holds (M6). The exclusion constraint on calendar_entries
 * makes overlapping active entries on one space impossible, so placing a hold (and, in
 * Build 2, accepting a quote) is atomic: the losing transaction fails with 23P01.
 */
export type Kind = "block" | "tentative_hold" | "booking_hold" | "booked";
export type DayRange = { start: Date; end: Date };

export function isOverlapError(e: unknown): boolean {
  return e instanceof postgres.PostgresError && (e.code === "23P01" || e.constraint_name === "calendar_no_overlap");
}

/** Ranges an event occupies: whole local days for day/half-day spaces, exact hours for hourly ones (FR-M6-01). */
export function rangesForDays(days: { date: string; start: string; end: string }[], unit: string, tz: string): DayRange[] {
  return days.map((d) => {
    if (unit === "hour") {
      const start = zonedInstant(d.date, d.start, tz);
      let end = zonedInstant(d.date, d.end, tz);
      if (end <= start) end = new Date(end.getTime() + 86_400_000); // spans midnight (§12.1)
      return { start, end };
    }
    return { start: zonedInstant(d.date, "00:00", tz), end: zonedInstant(addDays(d.date, 1), "00:00", tz) };
  });
}

async function spaceForCalendar(actor: Actor, spaceId: string, permission: string, sql: Tx = db()) {
  if (!isUuid(spaceId)) throw new PermissionError();
  const m = await requirePermission(actor.userId, "venue_operator", permission, sql);
  const [s] = await sql`
    select s.id, s.name, s.buffer_hours, p.timezone, p.operator_id, coalesce(r.unit, 'day') as unit
    from spaces s join properties p on p.id = s.property_id left join rate_cards r on r.space_id = s.id
    where s.id = ${spaceId} and p.operator_id = ${m.orgId}`;
  if (!s) throw new PermissionError();
  return { m, space: s };
}

/** Releases holds whose expiry has passed on the app clock, so they never block new work (FR-M6-04). */
export async function releaseExpiredHolds(sql: Tx = db(), spaceId?: string): Promise<string[]> {
  const at = await now();
  const rows = spaceId
    ? await sql`update calendar_entries set released_at = ${at}, release_reason = 'expired'
        where released_at is null and kind = 'tentative_hold' and expires_at <= ${at} and space_id = ${spaceId} returning enquiry_id`
    : await sql`update calendar_entries set released_at = ${at}, release_reason = 'expired'
        where released_at is null and kind = 'tentative_hold' and expires_at <= ${at} returning enquiry_id`;
  return [...new Set(rows.map((r) => String(r.enquiry_id)))];
}

/** Buffer between bookings (FR-M6-08): returns the end of a neighbouring entry that violates the buffer, if any. */
export async function bufferConflict(spaceId: string, ranges: DayRange[], bufferHours: number, sql: Tx = db(), ignoreEnquiryId?: string) {
  if (bufferHours <= 0) return null;
  const pad = bufferHours * 3600_000;
  for (const r of ranges) {
    const [hit] = await sql`
      select upper(during) as ends_at, lower(during) as starts_at from calendar_entries
      where space_id = ${spaceId} and released_at is null and kind <> 'block'
        and (${ignoreEnquiryId ?? null}::uuid is null or enquiry_id is distinct from ${ignoreEnquiryId ?? null}::uuid)
        and during && tstzrange(${new Date(r.start.getTime() - pad)}, ${new Date(r.end.getTime() + pad)})
      limit 1`;
    if (hit) return { endsAt: hit.ends_at as Date, startsAt: hit.starts_at as Date };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Venue view (FR-M6-01) and organizer view (FR-M6-02)
// ---------------------------------------------------------------------------
export async function venueCalendar(actor: Actor, spaceId: string, from: string, to: string) {
  const { space } = await spaceForCalendar(actor, spaceId, "enquiry.view");
  await releaseExpiredHolds(db(), spaceId);
  const tz = String(space.timezone);
  const entries = await db()`
    select c.id, c.kind, lower(c.during) as starts_at, upper(c.during) as ends_at, c.reason, c.expires_at, c.series_id,
           c.enquiry_id, e.name as event_name
    from calendar_entries c left join enquiries q on q.id = c.enquiry_id left join events e on e.id = q.event_id
    where c.space_id = ${spaceId} and c.released_at is null
      and c.during && tstzrange(${zonedInstant(from, "00:00", tz)}, ${zonedInstant(addDays(to, 1), "00:00", tz)})
    order by lower(c.during)`;
  return { space, entries, days: dayStates(entries, from, to, tz, "venue") };
}

export type DayState = "available" | "unavailable" | "limited" | Kind;

function dayStates(entries: readonly Record<string, unknown>[], from: string, to: string, tz: string, viewer: "venue" | "organizer") {
  const out: { date: string; state: DayState }[] = [];
  const n = Math.min(daysBetween(from, to), 400);
  for (let i = 0; i <= n; i++) {
    const date = addDays(from, i);
    const s = zonedInstant(date, "00:00", tz).getTime();
    const e = zonedInstant(addDays(date, 1), "00:00", tz).getTime();
    const hits = entries.filter((x) => new Date(x.starts_at as Date).getTime() < e && new Date(x.ends_at as Date).getTime() > s);
    let state: DayState = "available";
    const order: Kind[] = ["booked", "block", "booking_hold", "tentative_hold"];
    const top = order.find((k) => hits.some((h) => h.kind === k));
    if (top) state = viewer === "venue" ? top : top === "booked" || top === "block" ? "unavailable" : "limited";
    out.push({ date, state });
  }
  return out;
}

/** Organizers see only Available / Unavailable / Limited availability (FR-M6-02). */
export async function publicAvailability(spaceId: string, from: string, to: string) {
  if (!isUuid(spaceId)) return [];
  const [s] = await db()`select p.timezone from spaces s join properties p on p.id = s.property_id where s.id = ${spaceId}`;
  if (!s) return [];
  const tz = String(s.timezone);
  await releaseExpiredHolds(db(), spaceId);
  const entries = await db()`
    select kind, lower(during) as starts_at, upper(during) as ends_at from calendar_entries
    where space_id = ${spaceId} and released_at is null
      and during && tstzrange(${zonedInstant(from, "00:00", tz)}, ${zonedInstant(addDays(to, 1), "00:00", tz)})`;
  return dayStates(entries, from, to, tz, "organizer");
}

// ---------------------------------------------------------------------------
// Blocks (FR-M6-03), including weekly recurring blocks
// ---------------------------------------------------------------------------
export async function blockDates(
  actor: Actor,
  spaceId: string,
  input: { from: string; to: string; reason?: string; weeklyUntil?: string | null },
): Promise<number> {
  const { space } = await spaceForCalendar(actor, spaceId, "calendar.edit");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to) || input.to < input.from) throw new AppError("errors.invalidValue");
  if (daysBetween(input.from, input.to) > 366) throw new AppError("calendar.rangeTooLong");
  const tz = String(space.timezone);
  const at = await now();
  const series = input.weeklyUntil ? randomUUID() : null;
  const occurrences: { from: string; to: string }[] = [{ from: input.from, to: input.to }];
  if (input.weeklyUntil) {
    if (input.weeklyUntil < input.to || daysBetween(input.from, input.weeklyUntil) > 366) throw new AppError("calendar.rangeTooLong");
    for (let k = 1; ; k++) {
      const f = addDays(input.from, 7 * k);
      if (f > input.weeklyUntil) break;
      occurrences.push({ from: f, to: addDays(input.to, 7 * k) });
    }
  }
  try {
    await db().begin(async (sql) => {
      await releaseExpiredHolds(sql, spaceId);
      for (const o of occurrences) {
        await sql`
          insert into calendar_entries (space_id, during, kind, series_id, reason, created_by, created_at)
          values (${spaceId}, tstzrange(${zonedInstant(o.from, "00:00", tz)}, ${zonedInstant(addDays(o.to, 1), "00:00", tz)}),
                  'block', ${series}, ${input.reason?.trim() || null}, ${actor.userId}, ${at})`;
      }
    });
  } catch (e) {
    if (isOverlapError(e)) throw new AppError("calendar.blockOverlaps");
    throw e;
  }
  return occurrences.length;
}

export async function removeBlock(actor: Actor, spaceId: string, entryId: string, wholeSeries = false): Promise<void> {
  await spaceForCalendar(actor, spaceId, "calendar.edit");
  const at = await now();
  const [e] = await db()`select series_id from calendar_entries where id = ${entryId} and space_id = ${spaceId} and kind = 'block'`;
  if (!e) throw new PermissionError();
  if (wholeSeries && e.series_id) {
    await db()`update calendar_entries set released_at = ${at}, release_reason = 'removed' where series_id = ${e.series_id as string} and released_at is null and lower(during) >= ${at}`;
  } else {
    await db()`update calendar_entries set released_at = ${at}, release_reason = 'removed' where id = ${entryId}`;
  }
}

// ---------------------------------------------------------------------------
// Tentative holds (FR-M6-04)
// ---------------------------------------------------------------------------
export async function placeTentativeHold(actor: Actor, enquiryId: string, days?: number): Promise<{ expiresAt: Date }> {
  if (!isUuid(enquiryId)) throw new PermissionError();
  const m = await requirePermission(actor.userId, "venue_operator", "calendar.edit");
  const [q] = await db()`
    select q.id, q.status, q.space_id, e.days, e.name as event_name, e.organizer_org_id, s.buffer_hours, p.timezone, coalesce(r.unit, 'day') as unit
    from enquiries q join events e on e.id = q.event_id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    left join rate_cards r on r.space_id = s.id
    where q.id = ${enquiryId} and p.operator_id = ${m.orgId}`;
  if (!q) throw new PermissionError();
  if (["declined", "expired", "withdrawn", "lost", "accepted"].includes(String(q.status))) throw new AppError("enquiries.closed");
  const s = await getSettings();
  const holdDays = days ?? Number(s.tentative_hold_default_days);
  if (!Number.isInteger(holdDays) || holdDays < 1 || holdDays > Number(s.tentative_hold_max_days)) {
    throw new AppError("calendar.holdDaysInvalid", { max: Number(s.tentative_hold_max_days) });
  }
  const at = await now();
  const expiresAt = new Date(at.getTime() + holdDays * 86_400_000);
  const ranges = rangesForDays(q.days as { date: string; start: string; end: string }[], String(q.unit), String(q.timezone));
  try {
    await db().begin(async (sql) => {
      await releaseExpiredHolds(sql, String(q.space_id));
      const existing = await sql`select 1 from calendar_entries where enquiry_id = ${enquiryId} and kind = 'tentative_hold' and released_at is null`;
      if (existing.length) throw new AppError("calendar.holdExists");
      const conflict = await bufferConflict(String(q.space_id), ranges, Number(q.buffer_hours), sql, enquiryId);
      if (conflict) throw new AppError("calendar.bufferViolated");
      for (const r of ranges) {
        await sql`
          insert into calendar_entries (space_id, during, kind, enquiry_id, expires_at, created_by, created_at)
          values (${q.space_id as string}, tstzrange(${r.start}, ${r.end}), 'tentative_hold', ${enquiryId}, ${expiresAt}, ${actor.userId}, ${at})`;
      }
    });
  } catch (e) {
    if (isOverlapError(e)) throw new AppError("calendar.holdConflict");
    throw e;
  }
  await schedule("hold.expire", expiresAt, { enquiryId }, { uniqueKey: `hold:${enquiryId}:expire` });
  await schedule("hold.expiring", new Date(expiresAt.getTime() - 24 * 3600_000), { enquiryId }, { uniqueKey: `hold:${enquiryId}:reminder` });
  await notify({
    userIds: await orgMemberIds(String(q.organizer_org_id)),
    event: "hold_placed",
    values: { event: String(q.event_name), date: localDate(expiresAt, String(q.timezone)) },
    link: `/enquiry/${enquiryId}`,
  });
  return { expiresAt };
}

export async function releaseTentativeHold(actor: Actor, enquiryId: string): Promise<void> {
  const m = await requirePermission(actor.userId, "venue_operator", "calendar.edit");
  const at = await now();
  const rows = await db()`
    update calendar_entries c set released_at = ${at}, release_reason = 'released'
    from spaces s join properties p on p.id = s.property_id
    where c.space_id = s.id and p.operator_id = ${m.orgId} and c.enquiry_id = ${enquiryId}
      and c.kind = 'tentative_hold' and c.released_at is null
    returning c.id`;
  if (!rows.length) throw new PermissionError();
  await cancelJobs(`hold:${enquiryId}:`);
  await notifyHolder(enquiryId, "hold_released");
}

async function notifyHolder(enquiryId: string, event: string) {
  const [q] = await db()`select e.organizer_org_id, e.name from enquiries q join events e on e.id = q.event_id where q.id = ${enquiryId}`;
  if (!q) return;
  await notify({ userIds: await orgMemberIds(String(q.organizer_org_id)), event, values: { event: String(q.name) }, link: `/enquiry/${enquiryId}` });
}

/** Job: hold.expire */
export async function expireHoldJob(enquiryId: string): Promise<void> {
  const released = await releaseExpiredHolds();
  if (released.includes(enquiryId)) await notifyHolder(enquiryId, "hold_expired");
}

/** Job: hold.expiring (24 h before) */
export async function holdExpiringJob(enquiryId: string): Promise<void> {
  const [h] = await db()`select 1 from calendar_entries where enquiry_id = ${enquiryId} and kind = 'tentative_hold' and released_at is null`;
  if (h) await notifyHolder(enquiryId, "hold_expiring");
}

export async function holdForEnquiry(enquiryId: string) {
  await releaseExpiredHolds();
  const [h] = await db()`
    select min(expires_at) as expires_at from calendar_entries where enquiry_id = ${enquiryId} and kind = 'tentative_hold' and released_at is null`;
  return h?.expires_at ? { expiresAt: h.expires_at as Date } : null;
}
