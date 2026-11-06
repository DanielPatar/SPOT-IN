import { db, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError, PermissionError } from "@/lib/permissions";
import { loadHolidays } from "@/lib/holidays";
import { businessDayDeadline, hoursBefore } from "@/lib/business-days";
import { getSettings } from "@/lib/settings";
import { schedule, cancelJobs } from "@/lib/jobs";
import { formatDateTime, localDate, weekdayOf, zonedInstant, addDays } from "@/lib/time";
import { enforce } from "@/lib/rate-limit";
import { requirePermission, requireVerified, membershipOf, isUuid } from "./access";
import { adminIds, notify, orgMemberIds } from "./notify";
import { storeUpload, type StoredFile } from "./files";
import type { Actor } from "./accounts";

/** Events (projects) and enquiries (M9). */
export const EVENT_TYPES = ["exhibition", "bazaar", "brand_activation", "concert", "workshop", "seminar", "community", "other"] as const;
export const CATEGORIES = ["fashion", "food", "tech", "music", "arts", "sports", "education", "business", "community", "other"] as const;
export const FACILITIES = ["power", "wifi", "loading", "parking", "fnb_sampling", "selling", "live_music", "open_flame", "vehicles"] as const;
export const DECLINE_REASONS = ["dates_unavailable", "capacity", "proposal_not_suitable", "other"] as const;
export const OPEN_STATUSES = ["submitted", "viewed", "info_requested", "responded", "quoted"] as const;
const MAX_FILES = 5;
const MAX_PER_SEND = 5;
const MAX_OPEN_PER_EVENT = 10;
const MAX_NEW_PER_DAY = 20;

export type EventDayInput = { date: string; start: string; end: string };
export type EventInput = {
  name: string;
  type: string;
  brand?: string;
  category: string;
  description?: string;
  expectedAttendance: number;
  days: EventDayInput[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  requiredFacilities?: string[];
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanEvent(input: EventInput) {
  if (!input.name.trim()) throw new AppError("errors.nameRequired");
  if (!EVENT_TYPES.includes(input.type as never) || !CATEGORIES.includes(input.category as never)) throw new AppError("errors.invalidValue");
  if (!Number.isInteger(input.expectedAttendance) || input.expectedAttendance < 1) throw new AppError("events.attendanceInvalid");
  const days = [...input.days]
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) throw new AppError("events.datesRequired");
  if (days.length > 31) throw new AppError("events.tooManyDays");
  for (const d of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !HHMM.test(d.start) || !HHMM.test(d.end) || d.start === d.end) throw new AppError("events.dayInvalid");
  }
  if (new Set(days.map((d) => d.date)).size !== days.length) throw new AppError("events.duplicateDay");
  for (const v of [input.budgetMin, input.budgetMax]) if (v != null && (!Number.isSafeInteger(v) || v < 0)) throw new AppError("errors.amountInvalid");
  if (input.budgetMin != null && input.budgetMax != null && input.budgetMax < input.budgetMin) throw new AppError("events.budgetInvalid");
  return {
    name: input.name.trim(),
    type: input.type,
    brand: input.brand?.trim() || null,
    category: input.category,
    description: input.description?.trim() || null,
    expected_attendance: input.expectedAttendance,
    days,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    required_facilities: (input.requiredFacilities ?? []).filter((f) => FACILITIES.includes(f as never)),
  };
}

async function eventOfOrganizer(actor: Actor, eventId: string, permission = "event.edit", sql: Tx = db()) {
  if (!isUuid(eventId)) throw new PermissionError();
  const m = await requirePermission(actor.userId, "organizer", permission, sql);
  const [e] = await sql`select * from events where id = ${eventId} and organizer_org_id = ${m.orgId}`;
  if (!e) throw new PermissionError();
  return { m, event: e };
}

/** FR-M9-01, FR-M9-02 */
export async function createEvent(actor: Actor, input: EventInput, files: { name: string; bytes: Buffer }[] = []): Promise<string> {
  const m = await requirePermission(actor.userId, "organizer", "event.edit");
  const v = cleanEvent(input);
  if (files.length > MAX_FILES) throw new AppError("events.tooManyFiles", { max: MAX_FILES });
  const stored: StoredFile[] = [];
  for (const f of files) stored.push(await storeUpload(actor.userId, "proposal", f)); // each scanned, ≤ 10 MB
  const at = await now();
  return db().begin(async (sql) => {
    const [e] = await sql`
      insert into events (organizer_org_id, name, type, brand, category, description, expected_attendance, days, budget_min, budget_max,
        required_facilities, created_by, created_at, updated_at)
      values (${m.orgId}, ${v.name}, ${v.type}, ${v.brand}, ${v.category}, ${v.description}, ${v.expected_attendance}, ${sql.json(v.days)},
        ${v.budget_min}, ${v.budget_max}, ${v.required_facilities}, ${actor.userId}, ${at}, ${at})
      returning id`;
    for (const f of stored) await sql`insert into event_files (event_id, file_id) values (${e!.id as string}, ${f.id})`;
    return String(e!.id);
  });
}

/** FR-M9-09: editing the event notifies every enquired venue. (Quote flagging arrives with quotes in Build 2.) */
export async function updateEvent(actor: Actor, eventId: string, input: EventInput): Promise<void> {
  const { event } = await eventOfOrganizer(actor, eventId);
  const v = cleanEvent(input);
  const at = await now();
  await db()`
    update events set name = ${v.name}, type = ${v.type}, brand = ${v.brand}, category = ${v.category}, description = ${v.description},
      expected_attendance = ${v.expected_attendance}, days = ${db().json(v.days)}, budget_min = ${v.budget_min}, budget_max = ${v.budget_max},
      required_facilities = ${v.required_facilities}, updated_at = ${at}
    where id = ${eventId}`;
  const open = await db()`
    select q.id, p.operator_id from enquiries q join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    where q.event_id = ${eventId} and q.status in ${db()(OPEN_STATUSES as unknown as string[])}`;
  for (const q of open) {
    await notify({ userIds: await orgMemberIds(String(q.operator_id), ["owner", "staff"]), event: "event_edited", values: { event: String(event.name) }, link: `/venue/enquiry/${q.id}` });
  }
}

export async function addEventFiles(actor: Actor, eventId: string, files: { name: string; bytes: Buffer }[]): Promise<void> {
  await eventOfOrganizer(actor, eventId);
  const [c] = await db()`select count(*)::int as n from event_files where event_id = ${eventId}`;
  if (Number(c!.n) + files.length > MAX_FILES) throw new AppError("events.tooManyFiles", { max: MAX_FILES });
  for (const f of files) {
    const s = await storeUpload(actor.userId, "proposal", f);
    await db()`insert into event_files (event_id, file_id) values (${eventId}, ${s.id})`;
  }
}

// ---------------------------------------------------------------------------
// Pre-submit warnings (FR-M9-05) — warnings, never blocks
// ---------------------------------------------------------------------------
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function enquiryWarnings(
  event: { days: EventDayInput[]; expected_attendance: number; required_facilities: string[] },
  space: { max_capacity: number; min_days: number; max_days: number | null; power_kva: number | null; wifi: boolean; permitted_activities: string[]; operating_hours: Record<string, unknown> },
): string[] {
  const w: string[] = [];
  const hours = space.operating_hours ?? {};
  if (Object.keys(hours).length && event.days.some((d) => hours[WEEKDAY_KEYS[weekdayOf(d.date)]!] === null || hours[WEEKDAY_KEYS[weekdayOf(d.date)]!] === undefined)) {
    w.push("outside_operating_days");
  }
  if (event.days.length < space.min_days || (space.max_days != null && event.days.length > space.max_days)) w.push("length_outside_limits");
  if (space.max_capacity > 0 && event.expected_attendance > space.max_capacity) w.push("above_capacity");
  const missing = event.required_facilities.filter((f) => {
    if (f === "power") return !space.power_kva;
    if (f === "wifi") return !space.wifi;
    if (["fnb_sampling", "selling", "live_music", "open_flame", "vehicles"].includes(f)) return !space.permitted_activities.includes(f);
    return false;
  });
  if (missing.length) w.push("facilities_missing");
  return w;
}

export async function previewEnquiry(actor: Actor, eventId: string, spaceIds: string[]) {
  const { event } = await eventOfOrganizer(actor, eventId, "enquiry.send");
  const spaces = await loadEnquirableSpaces(spaceIds);
  return spaces.map((s) => ({
    spaceId: String(s.id),
    name: String(s.name),
    propertyName: String(s.property_name),
    questions: s.enquiry_questions as { id: string; label: string }[],
    warnings: enquiryWarnings(event as never, s as never),
  }));
}

async function loadEnquirableSpaces(spaceIds: string[], sql: Tx = db()) {
  const ids = spaceIds.filter(isUuid);
  if (!ids.length) return [];
  return sql`
    select s.id, s.name, s.max_capacity, s.min_days, s.max_days, s.power_kva, s.wifi, s.permitted_activities, s.enquiry_questions, s.status,
           p.name as property_name, p.operator_id, p.timezone, p.operating_hours, o.status as operator_status
    from spaces s join properties p on p.id = s.property_id join organizations o on o.id = p.operator_id
    where s.id in ${sql(ids)}`;
}

/**
 * FR-M9-03, -04, -05, -07: one send creates one independent enquiry (and thread) per space,
 * each with its own business-day response deadline in the property's time zone.
 */
export async function sendEnquiries(
  actor: Actor,
  eventId: string,
  spaceIds: string[],
  answers: Record<string, Record<string, string>> = {},
): Promise<string[]> {
  await requireVerified(actor.userId);
  const { m, event } = await eventOfOrganizer(actor, eventId, "enquiry.send");
  const unique = [...new Set(spaceIds)];
  if (!unique.length) throw new AppError("enquiries.noSpaces");
  if (unique.length > MAX_PER_SEND) throw new AppError("enquiries.limitPerSend", { max: MAX_PER_SEND });
  await enforce(`enquiry-send:${actor.userId}`, 30, 3600);
  const at = await now();
  const settings = await getSettings();
  const holidays = await loadHolidays();
  const venueMembership = await membershipOf(actor.userId, "venue_operator");

  const created = await db().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtext(${"enquiry-limits:" + m.orgId}))`;
    const [open] = await sql`select count(*)::int as n from enquiries where event_id = ${eventId} and status in ${sql(OPEN_STATUSES as unknown as string[])}`;
    if (Number(open!.n) + unique.length > MAX_OPEN_PER_EVENT) throw new AppError("enquiries.limitOpenPerEvent", { max: MAX_OPEN_PER_EVENT });
    const dayStart = zonedInstant(localDate(at, "Asia/Jakarta"), "00:00", "Asia/Jakarta");
    const [today] = await sql`
      select count(*)::int as n from enquiries q join events e on e.id = q.event_id
      where e.organizer_org_id = ${m.orgId} and q.created_at >= ${dayStart} and q.created_at < ${zonedInstant(addDays(localDate(at, "Asia/Jakarta"), 1), "00:00", "Asia/Jakarta")}`;
    if (Number(today!.n) + unique.length > MAX_NEW_PER_DAY) throw new AppError("enquiries.limitPerDay", { max: MAX_NEW_PER_DAY });

    const spaces = await loadEnquirableSpaces(unique, sql);
    if (spaces.length !== unique.length) throw new AppError("enquiries.spaceUnavailable");
    const out: { id: string; operatorId: string; spaceName: string; deadline: Date; tz: string }[] = [];
    for (const s of spaces) {
      if (s.status !== "published" || s.operator_status !== "active") throw new AppError("enquiries.spaceUnavailable");
      if (venueMembership && venueMembership.orgId === String(s.operator_id)) throw new AppError("enquiries.ownSpace");
      const qs = (s.enquiry_questions as { id: string; label: string }[]) ?? [];
      const given = answers[String(s.id)] ?? {};
      const clean: Record<string, string> = {};
      for (const q of qs) {
        const a = (given[q.id] ?? "").trim();
        if (!a) throw new AppError("enquiries.answerRequired", { space: String(s.name), question: q.label });
        clean[q.id] = a.slice(0, 2000);
      }
      const dup = await sql`select 1 from enquiries where event_id = ${eventId} and space_id = ${s.id as string} and status in ${sql(OPEN_STATUSES as unknown as string[])}`;
      if (dup.length) throw new AppError("enquiries.alreadyOpen", { space: String(s.name) });
      const tz = String(s.timezone);
      const deadline = businessDayDeadline(at, Number(settings.response_deadline_business_days), tz, holidays);
      const warnings = enquiryWarnings(event as never, s as never);
      const [q] = await sql`
        insert into enquiries (event_id, space_id, status, answers, warnings, response_deadline_at, created_by, created_at, updated_at)
        values (${eventId}, ${s.id as string}, 'submitted', ${sql.json(clean)}, ${warnings}, ${deadline}, ${actor.userId}, ${at}, ${at})
        returning id`;
      await sql`insert into threads (enquiry_id, created_at) values (${q!.id as string}, ${at})`;
      out.push({ id: String(q!.id), operatorId: String(s.operator_id), spaceName: String(s.name), deadline, tz });
    }
    return out;
  });

  for (const q of created) {
    await schedule("enquiry.reminder", hoursBefore(q.deadline, 24), { enquiryId: q.id, hours: 24 }, { uniqueKey: `enquiry:${q.id}:r24` });
    await schedule("enquiry.reminder", hoursBefore(q.deadline, 4), { enquiryId: q.id, hours: 4 }, { uniqueKey: `enquiry:${q.id}:r4` });
    await schedule("enquiry.expire", q.deadline, { enquiryId: q.id }, { uniqueKey: `enquiry:${q.id}:expire` });
    await notify({
      userIds: await orgMemberIds(q.operatorId, ["owner", "staff"]),
      event: "enquiry_new",
      values: { event: String(event.name), space: q.spaceName, deadline: formatDateTime(q.deadline, q.tz) },
      link: `/venue/enquiry/${q.id}`,
    });
  }
  return created.map((c) => c.id);
}

// ---------------------------------------------------------------------------
// Access helpers for one enquiry from either side
// ---------------------------------------------------------------------------
export type EnquirySide = "venue" | "organizer";

export async function enquiryForActor(actor: Actor, enquiryId: string, sql: Tx = db()) {
  if (!isUuid(enquiryId)) throw new PermissionError();
  const [q] = await sql`
    select q.*, e.name as event_name, e.organizer_org_id, e.days, e.expected_attendance, e.description as event_description,
           e.type as event_type, e.category, e.brand, e.budget_min, e.budget_max, e.required_facilities,
           s.name as space_name, s.enquiry_questions, p.operator_id, p.timezone, p.name as property_name,
           ov.display_name as venue_name, oo.display_name as organizer_name
    from enquiries q join events e on e.id = q.event_id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    join organizations ov on ov.id = p.operator_id join organizations oo on oo.id = e.organizer_org_id
    where q.id = ${enquiryId}`;
  if (!q) throw new PermissionError();
  const venue = await membershipOf(actor.userId, "venue_operator", sql);
  const organizer = await membershipOf(actor.userId, "organizer", sql);
  let side: EnquirySide;
  if (venue && venue.orgId === String(q.operator_id)) side = "venue";
  else if (organizer && organizer.orgId === String(q.organizer_org_id)) side = "organizer";
  else throw new PermissionError();
  const membership = side === "venue" ? venue! : organizer!;
  return { enquiry: q, side, membership };
}

function assertOpen(status: string) {
  if (!(OPEN_STATUSES as readonly string[]).includes(status)) throw new AppError("enquiries.closed");
}

/** Venue opens the enquiry: Submitted → Viewed. */
export async function markViewed(actor: Actor, enquiryId: string): Promise<void> {
  const { enquiry, side } = await enquiryForActor(actor, enquiryId);
  if (side !== "venue" || enquiry.status !== "submitted") return;
  const at = await now();
  await db()`update enquiries set status = 'viewed', viewed_at = ${at}, updated_at = ${at} where id = ${enquiryId} and status = 'submitted'`;
}

/** Any reply by the venue (message, info request, quote or decline) meets the response deadline (FR-M9-07). */
export async function recordVenueResponse(enquiryId: string, at: Date, sql: Tx = db()): Promise<void> {
  const rows = await sql`update enquiries set first_response_at = ${at} where id = ${enquiryId} and first_response_at is null returning id`;
  if (rows.length) await cancelJobs(`enquiry:${enquiryId}:`, sql);
}

export async function requestInfo(actor: Actor, enquiryId: string, text: string): Promise<void> {
  const { enquiry, side } = await enquiryForActor(actor, enquiryId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "enquiry.respond");
  assertOpen(String(enquiry.status));
  if (!text.trim()) throw new AppError("messages.empty");
  const { postMessage } = await import("./messaging");
  await postMessage(actor, enquiryId, { body: text });
  const at = await now();
  await db()`update enquiries set status = 'info_requested', updated_at = ${at} where id = ${enquiryId}`;
  await notify({ userIds: await orgMemberIds(String(enquiry.organizer_org_id)), event: "info_requested", values: { space: String(enquiry.space_name) }, link: `/enquiry/${enquiryId}` });
}

/** FR-M9-08: declining requires a reason shown to the organizer. */
export async function declineEnquiry(actor: Actor, enquiryId: string, reason: string, note?: string): Promise<void> {
  const { enquiry, side } = await enquiryForActor(actor, enquiryId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "enquiry.respond");
  assertOpen(String(enquiry.status));
  if (!DECLINE_REASONS.includes(reason as never)) throw new AppError("enquiries.declineReasonRequired");
  if (reason === "other" && !note?.trim()) throw new AppError("enquiries.declineNoteRequired");
  const at = await now();
  await db().begin(async (sql) => {
    await sql`
      update enquiries set status = 'declined', decline_reason = ${reason}, decline_note = ${note?.trim() || null}, closed_at = ${at}, updated_at = ${at}
      where id = ${enquiryId}`;
    await recordVenueResponse(enquiryId, at, sql);
    await releaseEnquiryHolds(enquiryId, at, sql);
  });
  await notify({
    userIds: await orgMemberIds(String(enquiry.organizer_org_id)),
    event: "enquiry_declined",
    values: { space: String(enquiry.space_name), reason },
    link: `/enquiry/${enquiryId}`,
  });
}

async function releaseEnquiryHolds(enquiryId: string, at: Date, sql: Tx) {
  await sql`update calendar_entries set released_at = ${at}, release_reason = 'enquiry_closed' where enquiry_id = ${enquiryId} and kind = 'tentative_hold' and released_at is null`;
  await cancelJobs(`hold:${enquiryId}:`, sql);
}

/** FR-M9-10: the organizer can withdraw an enquiry; the venue is notified. */
export async function withdrawEnquiry(actor: Actor, enquiryId: string): Promise<void> {
  const { enquiry, side } = await enquiryForActor(actor, enquiryId);
  if (side !== "organizer") throw new PermissionError();
  await requirePermission(actor.userId, "organizer", "enquiry.send");
  assertOpen(String(enquiry.status));
  const at = await now();
  await db().begin(async (sql) => {
    await sql`update enquiries set status = 'withdrawn', closed_at = ${at}, updated_at = ${at} where id = ${enquiryId}`;
    await releaseEnquiryHolds(enquiryId, at, sql);
    await cancelJobs(`enquiry:${enquiryId}:`, sql);
  });
  await notify({ userIds: await orgMemberIds(String(enquiry.operator_id), ["owner", "staff"]), event: "enquiry_withdrawn", values: { event: String(enquiry.event_name) }, link: `/venue/enquiry/${enquiryId}` });
}

export async function markLost(actor: Actor, enquiryId: string, feedback?: string): Promise<void> {
  const { enquiry, side } = await enquiryForActor(actor, enquiryId);
  if (side !== "organizer") throw new PermissionError();
  assertOpen(String(enquiry.status));
  const at = await now();
  await db().begin(async (sql) => {
    await sql`update enquiries set status = 'lost', lost_reason = ${feedback?.trim() || null}, closed_at = ${at}, updated_at = ${at} where id = ${enquiryId}`;
    await releaseEnquiryHolds(enquiryId, at, sql);
    await cancelJobs(`enquiry:${enquiryId}:`, sql);
  });
}

/** FR-M9-11: venue internal notes, never visible to the organizer. */
export async function saveInternalNotes(actor: Actor, enquiryId: string, notes: string, assignedMemberId?: string | null): Promise<void> {
  const { side, membership } = await enquiryForActor(actor, enquiryId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "enquiry.respond");
  if (assignedMemberId) {
    const [mm] = await db()`select 1 from memberships where org_id = ${membership.orgId} and user_id = ${assignedMemberId}`;
    if (!mm) throw new PermissionError();
  }
  await db()`
    update enquiries set internal_notes = ${notes.slice(0, 5000)}, assigned_member_id = ${assignedMemberId ?? null}, updated_at = ${await now()}
    where id = ${enquiryId}`;
}

// ---------------------------------------------------------------------------
// Jobs: reminders and expiry (FR-M9-07)
// ---------------------------------------------------------------------------
export async function enquiryReminderJob(enquiryId: string, hours: number): Promise<void> {
  const [q] = await db()`
    select q.status, q.first_response_at, q.response_deadline_at, e.name, p.operator_id, p.timezone
    from enquiries q join events e on e.id = q.event_id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    where q.id = ${enquiryId}`;
  if (!q || q.first_response_at || !["submitted", "viewed"].includes(String(q.status))) return;
  await notify({
    userIds: await orgMemberIds(String(q.operator_id), ["owner", "staff"]),
    event: "enquiry_deadline_approaching",
    values: { event: String(q.name), hours, deadline: formatDateTime(q.response_deadline_at as Date, String(q.timezone)) },
    link: `/venue/enquiry/${enquiryId}`,
  });
}

export async function enquiryExpireJob(enquiryId: string, at: Date): Promise<void> {
  const rows = await db()`
    update enquiries q set status = 'expired', closed_at = ${at}, updated_at = ${at}
    from events e
    where q.id = ${enquiryId} and e.id = q.event_id and q.first_response_at is null and q.status in ('submitted', 'viewed')
      and q.response_deadline_at <= ${at}
    returning e.organizer_org_id, e.name, q.space_id`;
  const r = rows[0];
  if (!r) return;
  await db()`update calendar_entries set released_at = ${at}, release_reason = 'enquiry_closed' where enquiry_id = ${enquiryId} and released_at is null and kind = 'tentative_hold'`;
  const [s] = await db()`select s.name, p.operator_id from spaces s join properties p on p.id = s.property_id where s.id = ${r.space_id as string}`;
  await notify({ userIds: await orgMemberIds(String(r.organizer_org_id)), event: "enquiry_expired", values: { space: String(s?.name ?? "") }, link: `/enquiry/${enquiryId}` });
  if (s) await notify({ userIds: await orgMemberIds(String(s.operator_id), ["owner", "staff"]), event: "enquiry_expired_venue", values: { event: String(r.name) }, link: `/venue/enquiry/${enquiryId}` });
}

/** §12.1: open enquiries on an unpublished space or suspended operator are declined automatically. */
export async function declineOpenEnquiriesForSpaces(spaceIds: string[], reasonKey: string): Promise<void> {
  if (!spaceIds.length) return;
  const at = await now();
  const rows = await db()`
    update enquiries q set status = 'declined', decline_reason = 'other', decline_note = ${reasonKey}, closed_at = ${at}, updated_at = ${at}
    from events e
    where q.space_id in ${db()(spaceIds)} and e.id = q.event_id and q.status in ${db()(["submitted", "viewed", "info_requested", "responded"])}
    returning q.id, e.organizer_org_id`;
  for (const r of rows) {
    await db()`update calendar_entries set released_at = ${at}, release_reason = 'enquiry_closed' where enquiry_id = ${r.id as string} and released_at is null and kind = 'tentative_hold'`;
    await cancelJobs(`enquiry:${String(r.id)}:`);
    await notify({ userIds: await orgMemberIds(String(r.organizer_org_id)), event: "enquiry_auto_declined", link: `/enquiry/${r.id}` });
  }
  if (rows.length) await notify({ userIds: await adminIds(), event: "admin_alert_auto_declined", values: { n: rows.length }, emailOnly: true });
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------
export async function organizerEvents(actor: Actor) {
  const m = await requirePermission(actor.userId, "organizer", "enquiry.view");
  const events = await db()`
    select e.id, e.name, e.days, e.expected_attendance, e.created_at,
      (select count(*)::int from enquiries q where q.event_id = e.id) as enquiries,
      (select count(*)::int from enquiries q where q.event_id = e.id and q.status in ('submitted', 'viewed', 'info_requested', 'responded', 'quoted')) as open_enquiries,
      (select count(*)::int from enquiries q where q.event_id = e.id and q.status = 'info_requested') as info_requested
    from events e where e.organizer_org_id = ${m.orgId} order by e.created_at desc`;
  return { membership: m, events };
}

export async function eventDetail(actor: Actor, eventId: string) {
  const { m, event } = await eventOfOrganizer(actor, eventId, "enquiry.view");
  const enquiries = await db()`
    select q.id, q.status, q.response_deadline_at, q.decline_reason, q.decline_note, q.warnings, s.name as space_name, s.id as space_id,
           p.name as property_name, p.timezone
    from enquiries q join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    where q.event_id = ${eventId} order by q.created_at`;
  const files = await db()`select f.id, f.filename, f.size_bytes from event_files ef join files f on f.id = ef.file_id where ef.event_id = ${eventId}`;
  return { membership: m, event, enquiries, files };
}

export async function venueInbox(actor: Actor, filter: { view?: "all" | "unreplied" | "mine"; spaceId?: string }) {
  const m = await requirePermission(actor.userId, "venue_operator", "enquiry.view");
  const sql = db();
  const spaceFilter = filter.spaceId && isUuid(filter.spaceId) ? sql`and q.space_id = ${filter.spaceId}` : sql``;
  const view =
    filter.view === "unreplied"
      ? sql`and q.first_response_at is null and q.status in ('submitted', 'viewed')`
      : filter.view === "mine"
        ? sql`and (q.assigned_member_id = ${actor.userId} or (t.last_message_org_kind = 'organizer'))`
        : sql``;
  const rows = await sql`
    select q.id, q.status, q.response_deadline_at, q.first_response_at, q.created_at, e.name as event_name, e.days, e.expected_attendance,
           s.name as space_name, p.timezone, o.display_name as organizer_name, t.last_message_at, t.last_message_org_kind,
           (t.last_message_at is not null and (r.last_read_at is null or r.last_read_at < t.last_message_at) and t.last_message_org_kind = 'organizer') as unread
    from enquiries q join events e on e.id = q.event_id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    join organizations o on o.id = e.organizer_org_id left join threads t on t.enquiry_id = q.id
    left join thread_reads r on r.thread_id = t.id and r.org_id = ${m.orgId}
    where p.operator_id = ${m.orgId} ${spaceFilter} ${view}
    order by coalesce(t.last_message_at, q.created_at) desc limit 200`;
  return { membership: m, rows };
}
