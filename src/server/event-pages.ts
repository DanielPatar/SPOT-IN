import { db, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { t } from "@/lib/i18n";
import { AppError, PermissionError } from "@/lib/permissions";
import { schedule, cancelJobs } from "@/lib/jobs";
import { audit, orgAudit } from "@/lib/audit";
import { enforce } from "@/lib/rate-limit";
import { randomToken } from "@/lib/tokens";
import { formatDateTime, formatTime, formatWeekdayDate, zonedInstant } from "@/lib/time";
import { requirePermission, requireAdmin, membershipOf, isUuid } from "./access";
import { notify } from "./notify";
import { storeUpload } from "./files";
import { quickAttendee, normalizeEmail, type Actor } from "./accounts";

/**
 * Event pages, registration, passes and check-in (M28, M30, M31, M32, M36).
 * Pages are unlisted only (FR-M28-05): reachable by an unguessable slug, never listed or indexed.
 */

export type Question = { id: string; kind: "text" | "choice" | "yesno"; label: string; options?: string[] };
const EVENT_LIVE_BOOKING = ["confirmed", "balance_due", "fully_paid", "in_progress"];
const PENDING_HOLD_MS = 2 * 3600_000; // a pending registration keeps its spot for 2 hours

// FR-M30-02: organizers can't ask for ID numbers, health, religion or similar sensitive data.
const SENSITIVE = /\b(ktp|nik|npwp|paspor|passport|sim\b|nomor identitas|no\.? identitas|identitas|kartu keluarga|rekening|kartu kredit|credit card|agama|religi|religion|kesehatan|penyakit|health|medical|alergi|disabilitas|suku|ras\b|golongan darah)\b/i;

export function validateQuestions(input: unknown): Question[] {
  const list = Array.isArray(input) ? input : [];
  if (list.length > 3) throw new AppError("eventPages.tooManyQuestions");
  return list.map((q, i) => {
    const label = String((q as Question).label ?? "").trim().slice(0, 200);
    const kind = (["text", "choice", "yesno"] as const).includes((q as Question).kind) ? (q as Question).kind : "text";
    if (!label) throw new AppError("eventPages.questionLabelRequired", { n: i + 1 });
    if (SENSITIVE.test(label)) throw new AppError("eventPages.sensitiveQuestion", { n: i + 1 });
    const options = kind === "choice" ? ((q as Question).options ?? []).map((o) => String(o).trim()).filter(Boolean).slice(0, 10) : undefined;
    if (kind === "choice" && (!options || options.length < 2)) throw new AppError("eventPages.choiceOptions", { n: i + 1 });
    if (options?.some((o) => SENSITIVE.test(o))) throw new AppError("eventPages.sensitiveQuestion", { n: i + 1 });
    return { id: String((q as Question).id || `q${i + 1}`), kind, label, ...(options ? { options } : {}) };
  });
}

async function bookingForEvent(eventId: string, orgId: string, sql: Tx = db()) {
  const [b] = await sql`
    select b.*, s.max_capacity, s.name as space_name, p.name as property_name, p.address_text, p.timezone, p.house_rules,
           ST_Y(p.geo::geometry) as lat, ST_X(p.geo::geometry) as lon
    from bookings b join spaces s on s.id = b.space_id join properties p on p.id = s.property_id
    where b.event_id = ${eventId} and b.organizer_org_id = ${orgId} and b.status in ${sql(EVENT_LIVE_BOOKING)}
    order by b.confirmed_at desc limit 1`;
  return b ?? null;
}

// ---------------------------------------------------------------------------
// Organizer: create, edit, publish
// ---------------------------------------------------------------------------
export type PageInput = {
  title: string;
  summary: string;
  description: string;
  category: string;
  ageNote?: string;
  questions: Question[];
  closeMode: "session_start" | "manual";
  sessions: { day: string; start: string; end: string; capacity: number }[];
};

export async function eventPageSetup(actor: Actor, eventId: string) {
  const m = await requirePermission(actor.userId, "organizer", "event_page.edit");
  if (!isUuid(eventId)) throw new PermissionError();
  const [e] = await db()`select * from events where id = ${eventId} and organizer_org_id = ${m.orgId}`;
  if (!e) throw new PermissionError();
  const booking = await bookingForEvent(eventId, m.orgId);
  const [page] = await db()`select * from event_pages where event_id = ${eventId}`;
  const sessions = page ? await db()`select * from event_sessions where page_id = ${page.id as string} order by day` : [];
  return { m, event: e, booking, page: page ?? null, sessions };
}

function checkSessions(input: PageInput, booking: Record<string, unknown>) {
  const days = booking.days as { date: string; start: string; end: string }[];
  const max = Number(booking.max_capacity) || 0;
  if (input.sessions.length !== days.length) throw new AppError("errors.invalidValue");
  return days.map((d) => {
    const s = input.sessions.find((x) => x.day === d.date);
    if (!s) throw new AppError("errors.invalidValue");
    const capacity = Math.round(Number(s.capacity));
    if (!Number.isInteger(capacity) || capacity < 1) throw new AppError("eventPages.capacityRequired");
    if (capacity > max) throw new AppError("eventPages.capacityTooHigh", { max }); // FR-M28-04
    const start = s.start || d.start;
    const end = s.end || d.end;
    // Session times must stay within the booked hours for that day (FR-M28-03).
    if (start < d.start || end > d.end || start >= end) throw new AppError("eventPages.sessionOutsideBooking", { start: d.start, end: d.end });
    return { day: d.date, start, end, capacity };
  });
}

/** FR-M28-01/02: a page for an event with a Confirmed booking of the same organization; one session per booked day. */
export async function saveEventPage(actor: Actor, eventId: string, input: PageInput, opts: { confirmNotify?: boolean; coverFile?: { name: string; bytes: Buffer } } = {}): Promise<{ pageId: string; needsConfirm?: number }> {
  const { m, booking, page, sessions: old } = await eventPageSetup(actor, eventId);
  if (!booking) throw new AppError("eventPages.needsConfirmedBooking");
  if (page && ["cancelled", "removed", "ended"].includes(String(page.status))) throw new AppError("eventPages.closed");
  const title = input.title.trim();
  const summary = input.summary.trim();
  if (!title) throw new AppError("eventPages.titleRequired");
  if (!summary) throw new AppError("eventPages.summaryRequired");
  if (summary.length > 160) throw new AppError("eventPages.summaryTooLong");
  const questions = validateQuestions(input.questions);
  const tz = String(booking.timezone);
  const sessions = checkSessions(input, booking);
  const at = await now();
  let cover = page?.cover_file_id ? String(page.cover_file_id) : null;
  if (opts.coverFile) cover = (await storeUpload(actor.userId, "event_cover", opts.coverFile)).id;

  // FR-M28-09: changing a session time or the description after registrations exist needs confirmation.
  let changes: string[] = [];
  if (page) {
    const timeChanged = sessions.filter((s) => {
      const o = old.find((x) => String(x.day) === s.day || (x.day instanceof Date && x.day.toISOString().slice(0, 10) === s.day));
      return o && (new Date(o.starts_at as Date).getTime() !== zonedInstant(s.day, s.start, tz).getTime() || new Date(o.ends_at as Date).getTime() !== zonedInstant(s.day, s.end, tz).getTime());
    });
    changes = [
      ...timeChanged.map((s) => t("eventPages.change.time", { day: formatWeekdayDate(s.day), start: s.start, end: s.end })),
      ...(String(page.description) !== input.description.trim() ? [t("eventPages.change.description")] : []),
    ];
    if (changes.length) {
      const [c] = await db()`select count(*)::int as n from registrations where page_id = ${page.id as string} and status <> 'cancelled'`;
      const n = Number(c!.n);
      if (n > 0 && !opts.confirmNotify) return { pageId: String(page.id), needsConfirm: n };
    }
  }

  const pageId = await db().begin(async (sql) => {
    let id: string;
    if (page) {
      id = String(page.id);
      await sql`
        update event_pages set title = ${title}, summary = ${summary}, description = ${input.description.trim()}, category = ${input.category},
          age_note = ${input.ageNote?.trim() || null}, questions = ${sql.json(questions as never)}, close_mode = ${input.closeMode === "manual" ? "manual" : "session_start"},
          cover_file_id = ${cover}, updated_at = ${at} where id = ${id}`;
    } else {
      const [p] = await sql`
        insert into event_pages (event_id, booking_id, organizer_org_id, slug, title, summary, description, cover_file_id, category, age_note, questions, close_mode, created_by, created_at, updated_at)
        values (${eventId}, ${booking.id as string}, ${m.orgId}, ${randomToken(12)}, ${title}, ${summary}, ${input.description.trim()}, ${cover}, ${input.category},
          ${input.ageNote?.trim() || null}, ${sql.json(questions as never)}, ${input.closeMode === "manual" ? "manual" : "session_start"}, ${actor.userId}, ${at}, ${at})
        returning id`;
      id = String(p!.id);
    }
    for (const s of sessions) {
      const startsAt = zonedInstant(s.day, s.start, tz);
      const endsAt = zonedInstant(s.day, s.end, tz);
      const [ex] = await sql`select id, taken from event_sessions where page_id = ${id} and day = ${s.day}`;
      if (ex) {
        if (s.capacity < Number(ex.taken)) throw new AppError("eventPages.capacityBelowTaken", { n: Number(ex.taken) });
        await sql`update event_sessions set starts_at = ${startsAt}, ends_at = ${endsAt}, capacity = ${s.capacity} where id = ${ex.id as string}`;
      } else {
        await sql`insert into event_sessions (page_id, day, starts_at, ends_at, capacity) values (${id}, ${s.day}, ${startsAt}, ${endsAt}, ${s.capacity})`;
      }
    }
    await audit({ scope: "user", actorId: actor.userId, action: page ? "event_page.updated" : "event_page.created", entity: "event_page", entityId: id, after: { title, changes }, at }, sql);
    return id;
  });
  if (page && changes.length) {
    const regs = await db()`select distinct user_id from registrations where page_id = ${pageId} and status <> 'cancelled'`;
    await notify({ userIds: regs.map((r) => String(r.user_id)), event: "event_changed", values: { title, changes: changes.join(" ") }, link: `/e/${page.slug}` });
  }
  if (page?.status === "live") await scheduleSessionJobs(pageId);
  return { pageId };
}

export async function publishEventPage(actor: Actor, pageId: string): Promise<void> {
  const page = await pageForOrganizer(actor, pageId, "event_page.edit");
  if (page.status !== "draft") throw new AppError("eventPages.notDraft");
  if (!page.cover_file_id) throw new AppError("eventPages.coverRequired");
  const at = await now();
  await db()`update event_pages set status = 'live', published_at = ${at}, updated_at = ${at} where id = ${pageId}`;
  await audit({ scope: "user", actorId: actor.userId, action: "event_page.published", entity: "event_page", entityId: pageId, at });
  await scheduleSessionJobs(pageId);
}

async function scheduleSessionJobs(pageId: string) {
  const sessions = await db()`select starts_at, ends_at from event_sessions where page_id = ${pageId} order by starts_at`;
  if (!sessions.length) return;
  const lastStart = new Date(sessions[sessions.length - 1]!.starts_at as Date);
  const lastEnd = new Date(Math.max(...sessions.map((s) => new Date(s.ends_at as Date).getTime())));
  await schedule("event_page.close", lastStart, { pageId }, { uniqueKey: `page:${pageId}:close` });
  await schedule("event_page.end", lastEnd, { pageId }, { uniqueKey: `page:${pageId}:end` });
}

/** Jobs: Live → Registration closed at the last session's start; → Ended after the last session (FR-M28-07). */
export async function closePageJob(pageId: string): Promise<void> {
  await db()`update event_pages set status = 'registration_closed', updated_at = ${await now()} where id = ${pageId} and status = 'live'`;
}
export async function endPageJob(pageId: string): Promise<void> {
  await db()`update event_pages set status = 'ended', updated_at = ${await now()} where id = ${pageId} and status in ('live', 'registration_closed')`;
}

/** FR-M30-08: manual close; reopen only if a session still has room and hasn't started. */
export async function setRegistrationOpen(actor: Actor, pageId: string, open: boolean): Promise<void> {
  const page = await pageForOrganizer(actor, pageId, "event_page.edit");
  const at = await now();
  if (open) {
    if (page.status !== "registration_closed") throw new AppError("eventPages.notClosed");
    const [room] = await db()`select 1 from event_sessions where page_id = ${pageId} and taken < capacity and starts_at > ${at}`;
    if (!room) throw new AppError("eventPages.noRoomToReopen");
    await db()`update event_pages set status = 'live', manually_closed = false, updated_at = ${at} where id = ${pageId}`;
  } else {
    if (page.status !== "live") throw new AppError("eventPages.notLive");
    await db()`update event_pages set status = 'registration_closed', manually_closed = true, updated_at = ${at} where id = ${pageId}`;
  }
  await audit({ scope: "user", actorId: actor.userId, action: open ? "event_page.reopened" : "event_page.closed", entity: "event_page", entityId: pageId, at });
}

async function pageForOrganizer(actor: Actor, pageId: string, permission: string) {
  if (!isUuid(pageId)) throw new PermissionError();
  const m = await requirePermission(actor.userId, "organizer", permission);
  const [p] = await db()`select * from event_pages where id = ${pageId} and organizer_org_id = ${m.orgId}`;
  if (!p) throw new PermissionError();
  return p;
}

// ---------------------------------------------------------------------------
// Public page
// ---------------------------------------------------------------------------
export async function publicPage(slug: string) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(slug)) return null;
  const [p] = await db()`
    select ep.*, o.display_name as organizer_name, s.name as space_name, pr.name as property_name, pr.address_text, pr.city, pr.area,
           pr.timezone, pr.house_rules, ST_Y(pr.geo::geometry) as lat, ST_X(pr.geo::geometry) as lon
    from event_pages ep join organizations o on o.id = ep.organizer_org_id join bookings b on b.id = ep.booking_id
    join spaces s on s.id = b.space_id join properties pr on pr.id = s.property_id
    where ep.slug = ${slug} and ep.status <> 'draft'`;
  if (!p) return null;
  const sessions = await db()`select * from event_sessions where page_id = ${p.id as string} order by day`;
  return { page: p, sessions };
}

export async function sessionOpen(session: Record<string, unknown>, page: Record<string, unknown>, at?: Date): Promise<"open" | "full" | "closed"> {
  const when = at ?? (await now());
  if (page.status !== "live") return "closed";
  if (new Date(session.starts_at as Date) <= when) return "closed";
  if (Number(session.taken) >= Number(session.capacity)) return "full";
  return "open";
}

// ---------------------------------------------------------------------------
// Registration (FR-M30-01..10, FR-M1-10)
// ---------------------------------------------------------------------------
export type RegisterInput = {
  slug: string;
  sessionId: string;
  name: string;
  email: string;
  answers: Record<string, string>;
  ageConfirmed: boolean;
  acceptedPilotNotice: boolean;
  ip?: string | null;
  sessionUserId?: string | null;
};

export async function register(input: RegisterInput): Promise<{ registrationId: string; status: "pending" | "confirmed"; passToken?: string }> {
  const pub = await publicPage(input.slug);
  if (!pub) throw new AppError("eventPages.notFound");
  const { page, sessions } = pub;
  const session = sessions.find((s) => s.id === input.sessionId);
  if (!session) throw new AppError("errors.invalidValue");
  if (!input.ageConfirmed) throw new AppError("errors.ageRequired"); // FR-M30-09
  if (!input.acceptedPilotNotice) throw new AppError("errors.consentRequired");
  const status = await sessionOpen(session, page);
  if (status === "full") throw new AppError("registration.full");
  if (status === "closed") throw new AppError("registration.closed");
  if (input.ip) await enforce(`register:${page.id}:${input.ip}`, 10, 3600); // FR-M30-10
  const questions = (page.questions ?? []) as Question[];
  const answers: Record<string, string> = {};
  for (const q of questions) {
    const v = String(input.answers[q.id] ?? "").trim().slice(0, 500);
    if (!v) throw new AppError("registration.answerRequired", { label: q.label });
    if (q.kind === "choice" && !q.options?.includes(v)) throw new AppError("errors.invalidValue");
    if (q.kind === "yesno" && !["yes", "no"].includes(v)) throw new AppError("errors.invalidValue");
    answers[q.id] = v;
  }
  const email = normalizeEmail(input.email);
  // A logged-in, verified user registering with their own email is confirmed straight away.
  let userId: string | null = null;
  let verifiedSelf = false;
  if (input.sessionUserId) {
    const [u] = await db()`select id, email, email_verified_at from users where id = ${input.sessionUserId}`;
    if (u && String(u.email).toLowerCase() === email && u.email_verified_at) {
      userId = String(u.id);
      verifiedSelf = true;
    }
  }
  const at = await now();
  const reg = await db()
    .begin(async (sql) => {
      // FR-M30-04: atomic capacity. Expired pending registrations free their spot first.
      await releaseExpiredPending(sql, String(session.id), at);
      const [ok] = await sql`update event_sessions set taken = taken + 1 where id = ${session.id as string} and taken < capacity returning id`;
      if (!ok) throw new AppError("registration.full");
      const uid = userId ?? (await placeholderUser(sql, email, input.name, at));
      const [r] = await sql`
        insert into registrations (session_id, page_id, user_id, email, name, answers, status, pending_expires_at, ip, created_at)
        values (${session.id as string}, ${page.id as string}, ${uid}, ${email}, ${input.name.trim().slice(0, 120)}, ${sql.json(answers)},
          'pending', ${new Date(at.getTime() + PENDING_HOLD_MS)}, ${input.ip ?? null}, ${at})
        returning id`;
      return { id: String(r!.id), userId: uid };
    })
    .catch((e: unknown) => {
      if ((e as { code?: string }).code === "23505") throw new AppError("registration.duplicate");
      throw e;
    });
  if (verifiedSelf) {
    const passToken = await confirmRegistration(reg.id, reg.userId);
    return { registrationId: reg.id, status: "confirmed", passToken };
  }
  // FR-M1-10: quick attendee account; the emailed link verifies the email and confirms the registration.
  await quickAttendee({ name: input.name, email, ageConfirmed: true, acceptedPilotNotice: true, ip: input.ip, data: { registrationId: reg.id, redirect: "/kartu-saya" } });
  await schedule("registration.expire", new Date(at.getTime() + PENDING_HOLD_MS), { registrationId: reg.id }, { uniqueKey: `registration:${reg.id}:expire` });
  return { registrationId: reg.id, status: "pending" };
}

/** Registration needs a user row for the FK; quickAttendee() reuses it (same email). */
async function placeholderUser(sql: Tx, email: string, name: string, at: Date): Promise<string> {
  const [u] = await sql`select id, status from users where email = ${email}`;
  if (u) {
    if (u.status !== "active") throw new AppError("auth.suspended");
    return String(u.id);
  }
  const [n] = await sql`
    insert into users (name, email, is_quick_attendee, is_18_plus_confirmed, intent_chosen_at, created_at)
    values (${name.trim()}, ${email}, true, true, ${at}, ${at}) returning id`;
  const { recordConsents } = await import("./accounts");
  await recordConsents(String(n!.id), null, sql);
  return String(n!.id);
}

async function releaseExpiredPending(sql: Tx, sessionId: string, at: Date) {
  const rows = await sql`
    update registrations set status = 'cancelled', cancelled_at = ${at}, cancelled_by = 'system'
    where session_id = ${sessionId} and status = 'pending' and pending_expires_at <= ${at} returning id`;
  if (rows.length) await sql`update event_sessions set taken = greatest(0, taken - ${rows.length}) where id = ${sessionId}`;
}

export async function expireRegistrationJob(registrationId: string, at: Date): Promise<void> {
  await db().begin(async (sql) => {
    const [r] = await sql`
      update registrations set status = 'cancelled', cancelled_at = ${at}, cancelled_by = 'system'
      where id = ${registrationId} and status = 'pending' and pending_expires_at <= ${at} returning session_id`;
    if (r) await sql`update event_sessions set taken = greatest(0, taken - 1) where id = ${r.session_id as string}`;
  });
}

/** Confirms a pending registration for its own user and issues the pass (FR-M31-01). Returns the pass token. */
export async function confirmRegistration(registrationId: string, userId: string): Promise<string> {
  const at = await now();
  const out = await db().begin(async (sql) => {
    const [r] = await sql`select * from registrations where id = ${registrationId} and user_id = ${userId} for update`;
    if (!r) throw new PermissionError();
    const [existing] = await sql`select token from passes where registration_id = ${registrationId}`;
    if (existing) return { token: String(existing.token), fresh: false, r };
    if (r.status !== "pending") throw new AppError("registration.expired");
    await sql`update registrations set status = 'confirmed', confirmed_at = ${at}, pending_expires_at = null where id = ${registrationId}`;
    const [c] = await sql`
      insert into pass_counters (page_id, last_number) values (${r.page_id as string}, 1)
      on conflict (page_id) do update set last_number = pass_counters.last_number + 1 returning last_number`;
    const [b] = await sql`select b.reference from event_pages ep join bookings b on b.id = ep.booking_id where ep.id = ${r.page_id as string}`;
    const number = `P-${String(b!.reference).replace(/\D/g, "").padStart(4, "0")}-${String(c!.last_number).padStart(4, "0")}`;
    const token = randomToken(24); // 192 bits (FR-M31-02)
    await sql`insert into passes (registration_id, token, number, issued_at) values (${registrationId}, ${token}, ${number}, ${at})`;
    return { token, fresh: true, r };
  });
  if (out.fresh) {
    await cancelJobs(`registration:${registrationId}:`);
    const [info] = await db()`
      select ep.title, s.starts_at, s.ends_at, pr.timezone from event_sessions s join event_pages ep on ep.id = s.page_id
      join bookings b on b.id = ep.booking_id join spaces sp on sp.id = b.space_id join properties pr on pr.id = sp.property_id
      where s.id = ${out.r.session_id as string}`;
    await notify({ userIds: [userId], event: "pass_issued", values: { title: String(info!.title), when: `${formatDateTime(info!.starts_at as Date, String(info!.timezone))}` }, link: `/kartu/${out.token}` });
  }
  return out.token;
}

/** FR-M30-07: the attendee cancels until the session starts; the spot is freed. */
export async function cancelOwnRegistration(actor: Actor, registrationId: string): Promise<void> {
  if (!isUuid(registrationId)) throw new PermissionError();
  const at = await now();
  await db().begin(async (sql) => {
    const [r] = await sql`
      select r.*, s.starts_at from registrations r join event_sessions s on s.id = r.session_id
      where r.id = ${registrationId} and r.user_id = ${actor.userId} for update of r`;
    if (!r) throw new PermissionError();
    if (r.status === "cancelled") return;
    if (new Date(r.starts_at as Date) <= at) throw new AppError("registration.tooLateToCancel");
    await cancelRegistrationTx(sql, r, "attendee", null, at);
  });
}

async function cancelRegistrationTx(sql: Tx, r: Record<string, unknown>, by: "attendee" | "organizer" | "system", message: string | null, at: Date, passStatus: "cancelled" | "voided" = "cancelled") {
  await sql`update registrations set status = 'cancelled', cancelled_at = ${at}, cancelled_by = ${by}, cancel_message = ${message} where id = ${r.id as string}`;
  await sql`update event_sessions set taken = greatest(0, taken - 1) where id = ${r.session_id as string}`;
  await sql`update passes set status = ${passStatus} where registration_id = ${r.id as string} and status in ('issued', 'checked_in')`;
}

// ---------------------------------------------------------------------------
// Organizer: attendee list, cancel, CSV, check-in (FR-M30-11, FR-M32)
// ---------------------------------------------------------------------------
export async function attendees(actor: Actor, pageId: string, opts: { q?: string; status?: string; sessionId?: string } = {}) {
  const page = await pageForOrganizer(actor, pageId, "event_page.edit");
  const q = (opts.q ?? "").trim();
  const rows = await db()`
    select r.id, r.name, r.email, r.status, r.answers, r.created_at, r.session_id, s.day, s.starts_at,
           p.id as pass_id, p.token, p.number, p.status as pass_status, p.checked_in_at, u.name as checked_in_by_name
    from registrations r join event_sessions s on s.id = r.session_id left join passes p on p.registration_id = r.id left join users u on u.id = p.checked_in_by
    where r.page_id = ${pageId}
      ${q ? db()`and (r.name ilike ${"%" + q + "%"} or r.email ilike ${"%" + q + "%"})` : db()``}
      ${opts.status === "checked_in" ? db()`and p.status = 'checked_in'` : opts.status === "not_checked_in" ? db()`and r.status = 'confirmed' and p.status = 'issued'` : opts.status === "cancelled" ? db()`and r.status = 'cancelled'` : db()``}
      ${opts.sessionId && isUuid(opts.sessionId) ? db()`and r.session_id = ${opts.sessionId}` : db()``}
    order by s.day, r.name`;
  return { page, rows };
}

export async function organizerCancelRegistration(actor: Actor, registrationId: string, message: string): Promise<void> {
  if (!isUuid(registrationId)) throw new PermissionError();
  const [r] = await db()`select * from registrations where id = ${registrationId}`;
  if (!r) throw new PermissionError();
  const page = await pageForOrganizer(actor, String(r.page_id), "event_page.edit");
  if (!message.trim()) throw new AppError("registration.messageRequired");
  if (r.status === "cancelled") return;
  const at = await now();
  await db().begin((sql) => cancelRegistrationTx(sql, r, "organizer", message.trim(), at));
  await audit({ scope: "user", actorId: actor.userId, action: "registration.cancelled_by_organizer", entity: "event_page", entityId: String(page.id), after: { registrationId }, at });
  await notify({ userIds: [String(r.user_id)], event: "registration_cancelled", values: { title: String(page.title), message: message.trim() }, link: `/kartu-saya` });
}

export async function attendeesCsv(actor: Actor, pageId: string): Promise<string> {
  const m = await requirePermission(actor.userId, "organizer", "attendees.export"); // Owner only
  const { page, rows } = await attendees(actor, pageId);
  await orgAudit({ orgId: m.orgId, actorId: actor.userId, action: "attendees_exported", details: { pageId, count: rows.length }, at: await now() });
  const qs = (page.questions ?? []) as Question[];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = [t("attendees.csv.name"), t("attendees.csv.email"), t("attendees.csv.session"), t("attendees.csv.status"), t("attendees.csv.pass"), ...qs.map((q) => q.label)];
  const lines = rows.map((r) =>
    [String(r.name), String(r.email), String(r.day instanceof Date ? r.day.toISOString().slice(0, 10) : r.day), t(`attendees.status.${r.pass_status === "checked_in" ? "checked_in" : String(r.status)}`), String(r.number ?? ""), ...qs.map((q) => String((r.answers as Record<string, string>)?.[q.id] ?? ""))]
      .map(esc)
      .join(","),
  );
  return [head.map(esc).join(","), ...lines].join("\n") + "\n";
}

/** A pass as seen by the viewer (FR-M31-02): holder and organizer members see everything; others see first name and event. */
export async function passView(token: string, viewerId: string | null) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [p] = await db()`
    select p.*, r.name, r.user_id, r.status as registration_status, r.session_id, s.day, s.starts_at, s.ends_at,
           ep.id as page_id, ep.title, ep.slug, ep.status as page_status, ep.organizer_org_id,
           sp.name as space_name, pr.name as property_name, pr.address_text, pr.timezone, ST_Y(pr.geo::geometry) as lat, ST_X(pr.geo::geometry) as lon,
           cu.name as checked_in_by_name
    from passes p join registrations r on r.id = p.registration_id join event_sessions s on s.id = r.session_id
    join event_pages ep on ep.id = r.page_id join bookings b on b.id = ep.booking_id join spaces sp on sp.id = b.space_id
    join properties pr on pr.id = sp.property_id left join users cu on cu.id = p.checked_in_by
    where p.token = ${token}`;
  if (!p) return null;
  let role: "holder" | "organizer" | "public" = "public";
  if (viewerId && viewerId === p.user_id) role = "holder";
  if (viewerId) {
    const m = await membershipOf(viewerId, "organizer");
    if (m && m.orgId === p.organizer_org_id) role = "organizer";
  }
  if (role === "public") return { role, firstName: String(p.name).split(/\s+/)[0], title: String(p.title) };
  return { role, pass: p };
}

export async function checkIn(actor: Actor, passId: string): Promise<void> {
  if (!isUuid(passId)) throw new PermissionError();
  const at = await now();
  const [p] = await db()`select p.*, r.page_id, r.status as reg_status from passes p join registrations r on r.id = p.registration_id where p.id = ${passId}`;
  if (!p) throw new PermissionError();
  await pageForOrganizer(actor, String(p.page_id), "event_page.edit");
  if (p.status === "checked_in") {
    const [u] = await db()`select name from users where id = ${p.checked_in_by as string}`;
    const [tz] = await db()`select pr.timezone from event_pages ep join bookings b on b.id = ep.booking_id join spaces s on s.id = b.space_id join properties pr on pr.id = s.property_id where ep.id = ${p.page_id as string}`;
    throw new AppError("checkin.already", { time: formatTime(p.checked_in_at as Date, String(tz!.timezone)), member: String(u?.name ?? "") });
  }
  if (p.status !== "issued" || p.reg_status !== "confirmed") throw new AppError("checkin.notValid", { status: t(`passStatus.${String(p.status)}`) });
  await db().begin(async (sql) => {
    const [ok] = await sql`update passes set status = 'checked_in', checked_in_at = ${at}, checked_in_by = ${actor.userId} where id = ${passId} and status = 'issued' returning id`;
    if (!ok) throw new AppError("checkin.notValid", { status: t("passStatus.checked_in") });
    await sql`insert into check_in_log (pass_id, action, actor_id, at) values (${passId}, 'check_in', ${actor.userId}, ${at})`;
  });
}

/** FR-M32-08: undo within 5 minutes; logged. */
export async function undoCheckIn(actor: Actor, passId: string): Promise<void> {
  if (!isUuid(passId)) throw new PermissionError();
  const at = await now();
  const [p] = await db()`select p.*, r.page_id from passes p join registrations r on r.id = p.registration_id where p.id = ${passId}`;
  if (!p) throw new PermissionError();
  await pageForOrganizer(actor, String(p.page_id), "event_page.edit");
  if (p.status !== "checked_in") throw new AppError("checkin.notCheckedIn");
  if (at.getTime() - new Date(p.checked_in_at as Date).getTime() > 5 * 60_000) throw new AppError("checkin.undoExpired");
  await db().begin(async (sql) => {
    await sql`update passes set status = 'issued', checked_in_at = null, checked_in_by = null where id = ${passId}`;
    await sql`insert into check_in_log (pass_id, action, actor_id, at) values (${passId}, 'undo', ${actor.userId}, ${at})`;
  });
}

export async function myPasses(userId: string) {
  return db()`
    select p.token, p.number, p.status, ep.title, ep.slug, s.starts_at, s.ends_at, pr.timezone, sp.name as space_name, pr.name as property_name, r.id as registration_id, r.status as registration_status
    from registrations r join passes p on p.registration_id = r.id join event_sessions s on s.id = r.session_id
    join event_pages ep on ep.id = r.page_id join bookings b on b.id = ep.booking_id join spaces sp on sp.id = b.space_id join properties pr on pr.id = sp.property_id
    where r.user_id = ${userId} order by s.starts_at desc`;
}

export async function pendingRegistrations(userId: string) {
  return db()`
    select r.id, ep.title, ep.slug, r.pending_expires_at from registrations r join event_pages ep on ep.id = r.page_id
    where r.user_id = ${userId} and r.status = 'pending'`;
}

// ---------------------------------------------------------------------------
// Cancellation and removal (FR-M18-10, FR-M36-04)
// ---------------------------------------------------------------------------
async function closePage(pageId: string, status: "cancelled" | "removed", reason: string | null, event: "event_cancelled" | "event_removed") {
  const at = await now();
  const regs = await db().begin(async (sql) => {
    const [p] = await sql`update event_pages set status = ${status}, removed_reason = ${reason}, updated_at = ${at} where id = ${pageId} and status not in ('cancelled', 'removed') returning title`;
    if (!p) return null;
    const rs = await sql`select * from registrations where page_id = ${pageId} and status <> 'cancelled'`;
    for (const r of rs) {
      await sql`update passes set status = 'voided' where registration_id = ${r.id as string} and status in ('issued', 'checked_in')`;
    }
    await sql`update registrations set status = 'cancelled', cancelled_at = ${at}, cancelled_by = 'system' where page_id = ${pageId} and status = 'pending'`;
    return { title: String(p.title), users: [...new Set(rs.map((r) => String(r.user_id)))] };
  });
  if (!regs) return;
  await cancelJobs(`page:${pageId}:`);
  await notify({ userIds: regs.users, event, values: { title: regs.title } });
}

export async function cancelPagesForBooking(bookingId: string, _actorId: string): Promise<void> {
  const pages = await db()`select id from event_pages where booking_id = ${bookingId}`;
  for (const p of pages) await closePage(String(p.id), "cancelled", null, "event_cancelled");
}

export async function removePage(actor: Actor, pageId: string, reason: string): Promise<void> {
  await requireAdmin(actor.userId);
  if (!isUuid(pageId)) throw new PermissionError();
  await closePage(pageId, "removed", reason, "event_removed");
  await audit({ scope: "admin", actorId: actor.userId, action: "event_page.removed", entity: "event_page", entityId: pageId, after: { reason }, at: await now() });
}

/** FR-M36-04: anyone can report an event page or a space. */
export async function report(input: { subjectType: "event_page" | "space"; subjectId: string; reason: string; text: string; reporterId?: string | null; ip?: string | null }): Promise<void> {
  if (!isUuid(input.subjectId)) throw new AppError("errors.invalidValue");
  if (!input.reason.trim()) throw new AppError("errors.reasonRequired");
  if (input.ip) await enforce(`report:${input.ip}`, 10, 3600);
  await db()`
    insert into reports (subject_type, subject_id, reporter_id, reason, text, created_at)
    values (${input.subjectType}, ${input.subjectId}, ${input.reporterId ?? null}, ${input.reason.trim().slice(0, 100)}, ${input.text.trim().slice(0, 2000) || null}, ${await now()})`;
}

export async function organizerPages(actor: Actor) {
  const m = await requirePermission(actor.userId, "organizer", "event.edit");
  return db()`
    select ep.id, ep.title, ep.status, ep.slug, ep.event_id,
      (select coalesce(sum(taken), 0)::int from event_sessions s where s.page_id = ep.id) as taken,
      (select coalesce(sum(capacity), 0)::int from event_sessions s where s.page_id = ep.id) as capacity
    from event_pages ep where ep.organizer_org_id = ${m.orgId}`;
}

