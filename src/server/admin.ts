import { db } from "@/lib/db";
import { now, setClockOffsetMs, clockOffsetMs } from "@/lib/clock";
import { AppError, PermissionError } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { getSettings, setSetting, DEFAULT_SETTINGS, type SettingKey } from "@/lib/settings";
import { loadHolidays, invalidateHolidayCache } from "@/lib/holidays";
import { businessDayDeadline } from "@/lib/business-days";
import { schedule, tick } from "@/lib/jobs";
import { requireAdmin } from "./access";
import { adminIds, emailAddress, notify, orgMemberIds } from "./notify";
import { normalizeEmail, type Actor } from "./accounts";
import { declineOpenEnquiriesForSpaces } from "./enquiries";

/** Spot-In Admin (M24, M3 verification, M38 invite list). One role, 2FA required (FR-M24-12). */
const PILOT_INVITE_TTL_DAYS = 14;

async function adminAudit(actor: Actor, action: string, entity: string, entityId: string | null, before?: unknown, after?: unknown) {
  await audit({ scope: "admin", actorId: actor.userId, action, entity, entityId, before, after, ip: actor.ip, at: await now() });
}

// ---------------------------------------------------------------------------
// Pilot invite list (FR-M38-02)
// ---------------------------------------------------------------------------
export async function invitePilotUser(actor: Actor, emailInput: string, roleHint: "venue" | "organizer" | "both"): Promise<void> {
  await requireAdmin(actor.userId);
  const email = normalizeEmail(emailInput);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("errors.emailInvalid");
  const [u] = await db()`select 1 from users where email = ${email}`;
  if (u) throw new AppError("admin.inviteUserExists");
  const at = await now();
  await db()`update pilot_invites set status = 'revoked' where email = ${email} and status = 'pending'`;
  await db()`
    insert into pilot_invites (email, invited_by, role_hint, expires_at, created_at)
    values (${email}, ${actor.userId}, ${roleHint}, ${new Date(at.getTime() + PILOT_INVITE_TTL_DAYS * 86_400_000)}, ${at})`;
  await emailAddress({ to: email, event: "pilot_invite", link: `/daftar?email=${encodeURIComponent(email)}` });
  await adminAudit(actor, "pilot_invite.created", "pilot_invite", email, undefined, { roleHint });
}

export async function revokePilotInvite(actor: Actor, inviteId: string): Promise<void> {
  await requireAdmin(actor.userId);
  await db()`update pilot_invites set status = 'revoked' where id = ${inviteId} and status = 'pending'`;
  await adminAudit(actor, "pilot_invite.revoked", "pilot_invite", inviteId);
}

export async function listPilotInvites() {
  const at = await now();
  return db()`
    select id, email, role_hint, created_at, expires_at, accepted_at,
      case when status = 'pending' and expires_at <= ${at} then 'expired' else status end as status
    from pilot_invites order by created_at desc limit 200`;
}

// ---------------------------------------------------------------------------
// Verification (FR-M3-02, FR-M3-08, FR-M3-09) and space review (FR-M4-10)
// ---------------------------------------------------------------------------
export async function verificationQueue() {
  return db()`
    select o.id, o.kind, o.display_name, o.legal_name, o.city, o.contact_email, o.contact_phone, o.verification_submitted_at,
           (select string_agg(u.email, ', ') from memberships m join users u on u.id = m.user_id where m.org_id = o.id and m.role = 'owner') as owners
    from organizations o where o.verification_status = 'pending' order by o.verification_submitted_at`;
}

export async function verifyOrganization(actor: Actor, orgId: string, input: { method: string; note?: string }): Promise<void> {
  await requireAdmin(actor.userId);
  if (!["call", "chat", "meeting"].includes(input.method)) throw new AppError("admin.methodRequired");
  const at = await now();
  const [before] = await db()`select verification_status from organizations where id = ${orgId}`;
  if (!before) throw new PermissionError();
  await db()`
    update organizations set verification_status = 'verified', verified_by_spotin_at = ${at},
      verification_method = ${input.method}, verification_note = ${input.note?.trim() || null}, verification_reason = null
    where id = ${orgId}`;
  await adminAudit(actor, "org.verified", "organization", orgId, before, { method: input.method, at });
  await notify({ userIds: await orgMemberIds(orgId, ["owner"]), event: "verification_approved", link: "/venue" });
}

export async function rejectOrganization(actor: Actor, orgId: string, reason: string): Promise<void> {
  await requireAdmin(actor.userId);
  if (!reason.trim()) throw new AppError("errors.reasonRequired");
  await db()`update organizations set verification_status = 'rejected', verification_reason = ${reason.trim()} where id = ${orgId}`;
  await adminAudit(actor, "org.verification_rejected", "organization", orgId, undefined, { reason });
  await notify({ userIds: await orgMemberIds(orgId, ["owner"]), event: "verification_rejected", values: { reason }, link: "/venue" });
}

export async function spaceReviewQueue() {
  return db()`
    select s.id, s.name, s.type, s.submitted_at, p.name as property_name, p.city, o.display_name as operator, o.verification_status
    from spaces s join properties p on p.id = s.property_id join organizations o on o.id = p.operator_id
    where s.status = 'in_review' order by s.submitted_at`;
}

export async function approveSpace(actor: Actor, spaceId: string): Promise<void> {
  await requireAdmin(actor.userId);
  const [s] = await db()`
    select s.status, p.operator_id, o.verification_status, p.geo is not null as has_pin
    from spaces s join properties p on p.id = s.property_id join organizations o on o.id = p.operator_id where s.id = ${spaceId}`;
  if (!s) throw new PermissionError();
  if (s.verification_status !== "verified") throw new AppError("listings.operatorNotVerified");
  if (!s.has_pin) throw new AppError("listings.pinRequired");
  const at = await now();
  await db()`update spaces set status = 'published', published_at = coalesce(published_at, ${at}), review_reason = null, updated_at = ${at} where id = ${spaceId}`;
  await adminAudit(actor, "space.approved", "space", spaceId, { status: s.status }, { status: "published" });
  await notify({ userIds: await orgMemberIds(String(s.operator_id), ["owner", "staff"]), event: "space_approved", link: `/venue/ruang/${spaceId}` });
}

export async function rejectSpace(actor: Actor, spaceId: string, reason: string): Promise<void> {
  await requireAdmin(actor.userId);
  if (!reason.trim()) throw new AppError("errors.reasonRequired");
  const [s] = await db()`
    update spaces set status = 'draft', review_reason = ${reason.trim()} where id = ${spaceId}
    returning (select operator_id from properties where id = property_id) as operator_id`;
  if (!s) throw new PermissionError();
  await adminAudit(actor, "space.rejected", "space", spaceId, undefined, { reason });
  await notify({ userIds: await orgMemberIds(String(s.operator_id), ["owner", "staff"]), event: "space_rejected", values: { reason }, link: `/venue/ruang/${spaceId}` });
}

// ---------------------------------------------------------------------------
// Suspend / unsuspend (FR-M24-04); suspension declines open enquiries (§12.1)
// ---------------------------------------------------------------------------
export async function setSuspended(
  actor: Actor,
  target: { type: "user" | "organization" | "space"; id: string },
  suspend: boolean,
  reason: string,
): Promise<void> {
  await requireAdmin(actor.userId);
  if (suspend && !reason.trim()) throw new AppError("errors.reasonRequired");
  const at = await now();
  if (target.type === "user") {
    if (target.id === actor.userId) throw new AppError("admin.cannotSuspendSelf");
    await db()`update users set status = ${suspend ? "suspended" : "active"}, suspended_reason = ${suspend ? reason : null} where id = ${target.id} and status <> 'deleted'`;
    if (suspend) await db()`update sessions set revoked_at = ${at} where user_id = ${target.id} and revoked_at is null`;
  } else if (target.type === "organization") {
    await db()`update organizations set status = ${suspend ? "suspended" : "active"}, suspended_reason = ${suspend ? reason : null} where id = ${target.id}`;
    if (suspend) {
      const spaces = await db()`select s.id from spaces s join properties p on p.id = s.property_id where p.operator_id = ${target.id}`;
      await declineOpenEnquiriesForSpaces(spaces.map((s) => String(s.id)), "operator_suspended");
    }
  } else {
    const [s] = await db()`select status from spaces where id = ${target.id}`;
    if (!s) throw new PermissionError();
    await db()`update spaces set status = ${suspend ? "suspended" : "unpublished"}, review_reason = ${suspend ? reason : null}, updated_at = ${at} where id = ${target.id}`;
    if (suspend) await declineOpenEnquiriesForSpaces([target.id], "space_suspended");
  }
  await adminAudit(actor, suspend ? `${target.type}.suspended` : `${target.type}.unsuspended`, target.type, target.id, undefined, { reason });
  if (suspend) await notify({ userIds: await adminIds(), event: "admin_alert_suspension", values: { type: target.type }, emailOnly: true });
}

// ---------------------------------------------------------------------------
// Reports queue (FR-M24-01, FR-M10-08, FR-M36-04)
// ---------------------------------------------------------------------------
export async function reportsQueue() {
  return db()`
    select r.id, r.subject_type, r.subject_id, r.reason, r.text, r.created_at, u.email as reporter
    from reports r left join users u on u.id = r.reporter_id where r.status = 'open' order by r.created_at`;
}

export async function decideReport(actor: Actor, reportId: string, decision: "dismiss" | "suspend_subject", note: string): Promise<void> {
  await requireAdmin(actor.userId);
  const [r] = await db()`select subject_type, subject_id from reports where id = ${reportId} and status = 'open'`;
  if (!r) throw new PermissionError();
  if (decision === "suspend_subject" && r.subject_type === "space") {
    await setSuspended(actor, { type: "space", id: String(r.subject_id) }, true, note || "report");
  }
  if (decision === "suspend_subject" && r.subject_type === "message") {
    await db()`update messages set deleted_at = coalesce(deleted_at, ${await now()}) where id = ${r.subject_id as string}`;
  }
  const at = await now();
  await db()`
    update reports set status = ${decision === "dismiss" ? "dismissed" : "actioned"}, decision = ${note || decision},
      decided_by = ${actor.userId}, decided_at = ${at} where id = ${reportId}`;
  await adminAudit(actor, `report.${decision}`, "report", reportId, undefined, { note });
}

// ---------------------------------------------------------------------------
// Search (FR-M24-02)
// ---------------------------------------------------------------------------
export async function adminSearch(q: string) {
  const term = q.trim();
  if (!term) return { users: [], orgs: [], spaces: [], enquiries: [] };
  const like = `%${term.toLowerCase()}%`;
  const isId = /^[0-9a-f-]{36}$/i.test(term);
  const sql = db();
  return {
    users: await sql`
      select id, name, email, status, is_admin, email_bounced_at, created_at from users
      where ${isId ? sql`id = ${term}::uuid or` : sql``} lower(name) like ${like} or lower(email::text) like ${like} limit 20`,
    orgs: await sql`
      select id, kind, display_name, verification_status, status from organizations
      where ${isId ? sql`id = ${term}::uuid or` : sql``} lower(display_name) like ${like} or lower(coalesce(contact_email::text, '')) like ${like} limit 20`,
    spaces: await sql`
      select s.id, s.name, s.status, p.name as property_name from spaces s join properties p on p.id = s.property_id
      where ${isId ? sql`s.id = ${term}::uuid or` : sql``} lower(s.name) like ${like} or lower(p.name) like ${like} limit 20`,
    enquiries: await sql`
      select q.id, q.status, e.name as event_name, s.name as space_name from enquiries q
      join events e on e.id = q.event_id join spaces s on s.id = q.space_id
      where ${isId ? sql`q.id = ${term}::uuid or` : sql``} lower(e.name) like ${like} limit 20`,
  };
}

// ---------------------------------------------------------------------------
// Settings (FR-M24-03), holidays (FR-M24-11), audit log (FR-M24-08)
// ---------------------------------------------------------------------------
export async function updateSetting(actor: Actor, key: SettingKey, value: unknown): Promise<void> {
  await requireAdmin(actor.userId);
  if (!(key in DEFAULT_SETTINGS)) throw new AppError("admin.unknownSetting");
  const def = DEFAULT_SETTINGS[key];
  if (typeof def === "number" && (!Number.isSafeInteger(value) || (value as number) < 0)) throw new AppError("errors.amountInvalid");
  if (typeof def === "string" && typeof value !== "string") throw new AppError("errors.invalidValue");
  const before = (await getSettings())[key];
  await setSetting(key, value, actor.userId);
  await adminAudit(actor, "setting.changed", "setting", key, before, value);
}

export async function addHoliday(actor: Actor, date: string, name: string, kind: "national" | "cuti_bersama"): Promise<void> {
  await requireAdmin(actor.userId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name.trim()) throw new AppError("errors.invalidValue");
  await db()`insert into holiday_calendar (date, name, kind) values (${date}, ${name.trim()}, ${kind}) on conflict (date) do update set name = excluded.name, kind = excluded.kind`;
  invalidateHolidayCache();
  await adminAudit(actor, "holiday.saved", "holiday", date, undefined, { name, kind });
}

export async function removeHoliday(actor: Actor, date: string): Promise<void> {
  await requireAdmin(actor.userId);
  await db()`delete from holiday_calendar where date = ${date}`;
  invalidateHolidayCache();
  await adminAudit(actor, "holiday.removed", "holiday", date);
}

export async function adminAuditLog(limit = 100) {
  return db()`
    select a.at, a.action, a.entity, a.entity_id, a.before, a.after, u.email as actor
    from audit_log a left join users u on u.id = a.actor_id where a.scope = 'admin' order by a.id desc limit ${limit}`;
}

// ---------------------------------------------------------------------------
// Demo clock (FR-M38-10)
// ---------------------------------------------------------------------------
export async function advanceDemoClock(actor: Actor, ms: number): Promise<number> {
  await requireAdmin(actor.userId);
  if (!Number.isFinite(ms) || ms <= 0) throw new AppError("errors.invalidValue");
  const before = await clockOffsetMs();
  await setClockOffsetMs(before + ms, actor.userId);
  await adminAudit(actor, "demo_clock.advanced", "demo_clock", null, { offsetMs: before }, { offsetMs: before + ms });
  return tick(1000);
}

// ---------------------------------------------------------------------------
// Daily admin reminder (FR-M24-10, FR-M3-02)
// ---------------------------------------------------------------------------
export async function overdueReviewItems(at: Date) {
  const holidays = await loadHolidays();
  const s = await getSettings();
  const days = Number(s.admin_review_target_business_days);
  const late = (since: Date | null) => !!since && businessDayDeadline(new Date(since), days, "Asia/Jakarta", holidays) < at;
  const orgs = (await verificationQueue()).filter((o) => late(o.verification_submitted_at as Date));
  const spaces = (await spaceReviewQueue()).filter((s) => late(s.submitted_at as Date));
  const reports = (await reportsQueue()).filter((r) => late(r.created_at as Date));
  return { orgs, spaces, reports };
}

export async function runDailyAdminReminder(at: Date): Promise<void> {
  const items = await overdueReviewItems(at);
  const total = items.orgs.length + items.spaces.length + items.reports.length;
  if (total > 0) {
    await notify({
      userIds: await adminIds(),
      event: "admin_daily_reminder",
      values: { orgs: items.orgs.length, spaces: items.spaces.length, reports: items.reports.length },
      link: "/admin",
      emailOnly: true,
    });
  }
  await scheduleDailyAdminReminder(at);
}

export async function scheduleDailyAdminReminder(after: Date): Promise<void> {
  // Every day at 08:00 WIB (weekends included: items keep waiting either way).
  const next = nextDayAt(after, "08:00");
  await schedule("admin.daily_reminder", next, {}, { uniqueKey: "admin.daily_reminder" });
}

function nextDayAt(after: Date, time: string): Date {
  const wib = 7 * 3600_000;
  const local = new Date(after.getTime() + wib);
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  let candidate = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hh, mm) - wib;
  if (candidate <= after.getTime()) candidate += 86_400_000;
  return new Date(candidate);
}
