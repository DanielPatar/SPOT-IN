import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { generateSecret, generateURI, verify as totpVerify } from "otplib";
import { db, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { adminEmails } from "@/lib/config";
import { randomToken, sha256 } from "@/lib/tokens";
import { AppError } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { enforce } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { emailAddress } from "./notify";

/**
 * Accounts and authentication (M1) with pilot invite-only access (FR-M38-02) and
 * consent capture (FR-M1-09, FR-M38-03). No phone OTP; email only.
 */
export type Actor = { userId: string; ip?: string | null };

const MIN_PASSWORD = 10;
const VERIFY_TTL_H = 48;
const MAGIC_TTL_MIN = 20;
const RESET_TTL_MIN = 60;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function issueToken(
  sql: Tx,
  purpose: "verify_email" | "magic_link" | "password_reset",
  userId: string,
  email: string,
  ttlMs: number,
  data: Record<string, unknown> = {},
): Promise<string> {
  const token = randomToken();
  const at = await now();
  await sql`
    insert into auth_tokens (purpose, token_hash, user_id, email, data, expires_at, created_at)
    values (${purpose}, ${sha256(token)}, ${userId}, ${email}, ${sql.json(data as never)}, ${new Date(at.getTime() + ttlMs)}, ${at})`;
  return token;
}

async function consumeToken(purpose: string, token: string) {
  const at = await now();
  const rows = await db()`
    update auth_tokens set used_at = ${at}
    where token_hash = ${sha256(token)} and purpose = ${purpose} and used_at is null and expires_at > ${at}
    returning user_id, email, data`;
  return rows[0] ?? null;
}

export async function isInvited(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  if (adminEmails().includes(e)) return true;
  const at = await now();
  const rows = await db()`select 1 from pilot_invites where email = ${e} and status = 'pending' and expires_at > ${at}`;
  return rows.length > 0;
}

export async function recordConsents(userId: string, ip: string | null, sql: Tx = db()): Promise<void> {
  const s = await getSettings(sql);
  const at = await now();
  for (const [document, version] of [
    ["terms", s.terms_version],
    ["privacy", s.privacy_version],
    ["pilot_notice", s.pilot_notice_version],
  ] as const) {
    await sql`insert into consent_records (user_id, document, version, accepted_at, ip) values (${userId}, ${document}, ${version}, ${at}, ${ip})`;
  }
}

/** FR-M1-01, FR-M1-09, FR-M1-11, FR-M38-02, FR-M38-03, FR-M38-09 */
export async function signUp(input: {
  name: string;
  email: string;
  password?: string;
  ageConfirmed: boolean;
  acceptedPilotNotice: boolean;
  ip?: string | null;
}): Promise<{ userId: string }> {
  const email = normalizeEmail(input.email);
  if (input.ip) await enforce(`signup:${input.ip}`, 10, 3600);
  if (!input.name.trim()) throw new AppError("errors.nameRequired");
  if (!isEmail(email)) throw new AppError("errors.emailInvalid");
  if (input.password && input.password.length < MIN_PASSWORD) throw new AppError("errors.passwordTooShort", { min: MIN_PASSWORD });
  if (!input.ageConfirmed) throw new AppError("errors.ageRequired");
  if (!input.acceptedPilotNotice) throw new AppError("errors.consentRequired");
  if (!(await isInvited(email))) throw new AppError("auth.notInvited");
  const existing = await db()`select id from users where email = ${email}`;
  if (existing.length) throw new AppError("errors.emailTaken");

  const at = await now();
  const passwordHash = input.password ? await argonHash(input.password) : null;
  const isAdmin = adminEmails().includes(email);
  const userId = await db().begin(async (sql) => {
    const [u] = await sql`
      insert into users (name, email, password_hash, is_admin, is_18_plus_confirmed, created_at, last_active_at)
      values (${input.name.trim()}, ${email}, ${passwordHash}, ${isAdmin}, true, ${at}, ${at})
      returning id`;
    const id = u!.id as string;
    await recordConsents(id, input.ip ?? null, sql);
    await sql`update pilot_invites set status = 'accepted', accepted_at = ${at} where email = ${email} and status = 'pending'`;
    await audit({ scope: "user", actorId: id, action: "user.sign_up", entity: "user", entityId: id, ip: input.ip, at }, sql);
    return id;
  });
  await sendVerification(userId);
  return { userId };
}

export async function sendVerification(userId: string): Promise<void> {
  const [u] = await db()`select email, email_verified_at from users where id = ${userId}`;
  if (!u || u.email_verified_at) return;
  const token = await issueToken(db(), "verify_email", userId, String(u.email), VERIFY_TTL_H * 3600_000);
  await emailAddress({ to: String(u.email), event: "verify_email", link: `/verifikasi?token=${token}` });
}

/** FR-M1-02: email verification. Returns the user id. */
export async function verifyEmail(token: string): Promise<string> {
  const row = await consumeToken("verify_email", token);
  if (!row) throw new AppError("auth.tokenInvalid");
  const at = await now();
  await db()`update users set email_verified_at = coalesce(email_verified_at, ${at}) where id = ${row.user_id as string}`;
  return String(row.user_id);
}

export async function login(input: { email: string; password: string; ip?: string | null }): Promise<string> {
  const email = normalizeEmail(input.email);
  await enforce(`login:${email}`, 10, 900);
  if (input.ip) await enforce(`login-ip:${input.ip}`, 30, 900);
  const [u] = await db()`select id, password_hash, status from users where email = ${email}`;
  const ok = u?.password_hash ? await argonVerify(String(u.password_hash), input.password) : false;
  if (!u || !ok) throw new AppError("auth.invalidCredentials");
  if (u.status !== "active") throw new AppError("auth.suspended");
  return String(u.id);
}

/** FR-M1-01: magic-link login. Always answers the same way so it can't be used to probe emails. */
export async function requestMagicLink(emailInput: string, ip?: string | null): Promise<void> {
  const email = normalizeEmail(emailInput);
  await enforce(`magic:${email}`, 5, 900);
  if (ip) await enforce(`magic-ip:${ip}`, 20, 900);
  const [u] = await db()`select id, status from users where email = ${email}`;
  if (!u || u.status !== "active") return;
  const token = await issueToken(db(), "magic_link", String(u.id), email, MAGIC_TTL_MIN * 60_000);
  await emailAddress({ to: email, event: "magic_link", link: `/masuk/tautan?token=${token}` });
}

/** Magic links also prove email ownership, so they verify the email. */
export async function consumeMagicLink(token: string): Promise<{ userId: string; data: Record<string, unknown> }> {
  const row = await consumeToken("magic_link", token);
  if (!row) throw new AppError("auth.tokenInvalid");
  const at = await now();
  const [u] = await db()`
    update users set email_verified_at = coalesce(email_verified_at, ${at}) where id = ${row.user_id as string} and status = 'active' returning id`;
  if (!u) throw new AppError("auth.suspended");
  return { userId: String(row.user_id), data: (row.data ?? {}) as Record<string, unknown> };
}

export async function requestPasswordReset(emailInput: string): Promise<void> {
  const email = normalizeEmail(emailInput);
  await enforce(`reset:${email}`, 5, 3600);
  const [u] = await db()`select id from users where email = ${email} and status = 'active'`;
  if (!u) return;
  const token = await issueToken(db(), "password_reset", String(u.id), email, RESET_TTL_MIN * 60_000);
  await emailAddress({ to: email, event: "password_reset", link: `/reset-sandi?token=${token}` });
}

/** FR-M1-04: resetting a password revokes every session. */
export async function resetPassword(token: string, password: string): Promise<string> {
  if (password.length < MIN_PASSWORD) throw new AppError("errors.passwordTooShort", { min: MIN_PASSWORD });
  const row = await consumeToken("password_reset", token);
  if (!row) throw new AppError("auth.tokenInvalid");
  const at = await now();
  const userId = String(row.user_id);
  await db()`update users set password_hash = ${await argonHash(password)}, email_verified_at = coalesce(email_verified_at, ${at}) where id = ${userId}`;
  await db()`update sessions set revoked_at = ${at} where user_id = ${userId} and revoked_at is null`;
  return userId;
}

// ---------------------------------------------------------------------------
// Sessions (FR-M1-04)
// ---------------------------------------------------------------------------
export async function createSession(userId: string, meta: { userAgent?: string | null; ip?: string | null }): Promise<string> {
  const token = randomToken();
  const at = await now();
  const ctx = await db()`
    select org_kind from memberships where user_id = ${userId} order by case org_kind when 'organizer' then 0 else 1 end limit 1`;
  await db()`
    insert into sessions (token_hash, user_id, created_at, last_seen_at, user_agent, ip, context)
    values (${sha256(token)}, ${userId}, ${at}, ${at}, ${meta.userAgent ?? null}, ${meta.ip ?? null},
            ${ctx[0] ? (ctx[0].org_kind === "venue_operator" ? "venue" : "organizer") : null})`;
  await db()`update users set last_active_at = ${at} where id = ${userId}`;
  return token;
}

export type SessionUser = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  twoFactorEnabled: boolean;
  twoFactorPassed: boolean;
  intentChosen: boolean;
  isQuickAttendee: boolean;
  context: "venue" | "organizer" | null;
  emailBounced: boolean;
};

/** Resolves a session token; idle sessions beyond the configured period are revoked. */
export async function resolveSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const at = await now();
  const [s] = await db()`
    select s.id, s.user_id, s.last_seen_at, s.two_factor_passed, s.context, u.name, u.email, u.email_verified_at,
           u.is_admin, u.totp_enabled_at, u.intent_chosen_at, u.is_quick_attendee, u.status, u.email_bounced_at
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256(token)} and s.revoked_at is null`;
  if (!s || s.status !== "active") return null;
  const { session_idle_days } = await getSettings();
  const idleMs = Number(session_idle_days) * 86_400_000;
  if (at.getTime() - new Date(s.last_seen_at as Date).getTime() > idleMs) {
    await db()`update sessions set revoked_at = ${at} where id = ${s.id as string}`;
    return null;
  }
  if (at.getTime() - new Date(s.last_seen_at as Date).getTime() > 60_000) {
    await db()`update sessions set last_seen_at = ${at} where id = ${s.id as string}`;
    await db()`update users set last_active_at = ${at} where id = ${s.user_id as string}`;
  }
  return {
    sessionId: String(s.id),
    userId: String(s.user_id),
    name: String(s.name),
    email: String(s.email),
    emailVerified: !!s.email_verified_at,
    isAdmin: !!s.is_admin,
    twoFactorEnabled: !!s.totp_enabled_at,
    twoFactorPassed: !!s.two_factor_passed,
    intentChosen: !!s.intent_chosen_at,
    isQuickAttendee: !!s.is_quick_attendee,
    context: (s.context as "venue" | "organizer" | null) ?? null,
    emailBounced: !!s.email_bounced_at,
  };
}

export async function listSessions(userId: string) {
  return db()`
    select id, created_at, last_seen_at, user_agent, ip from sessions
    where user_id = ${userId} and revoked_at is null order by last_seen_at desc`;
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const at = await now();
  await db()`update sessions set revoked_at = ${at} where id = ${sessionId} and user_id = ${userId}`;
}

export async function setSessionContext(userId: string, sessionId: string, context: "venue" | "organizer"): Promise<void> {
  const kind = context === "venue" ? "venue_operator" : "organizer";
  const m = await db()`select 1 from memberships where user_id = ${userId} and org_kind = ${kind}`;
  if (!m.length) throw new AppError("errors.noSuchContext");
  await db()`update sessions set context = ${context} where id = ${sessionId} and user_id = ${userId}`;
}

// ---------------------------------------------------------------------------
// Profile, intent (FR-M1-05, FR-M1-06)
// ---------------------------------------------------------------------------
export async function chooseIntent(userId: string, intents: string[]): Promise<void> {
  const clean = intents.filter((i) => i === "find" || i === "list");
  if (!clean.length) throw new AppError("errors.intentRequired");
  const at = await now();
  await db()`update users set intents = ${clean}, intent_chosen_at = ${at} where id = ${userId}`;
}

export async function updateProfile(
  userId: string,
  input: { name: string; phone?: string | null; emailOptional?: boolean },
): Promise<void> {
  if (!input.name.trim()) throw new AppError("errors.nameRequired");
  const phone = input.phone?.trim() || null;
  if (phone && !/^[+\d][\d\s.-]{6,18}$/.test(phone)) throw new AppError("errors.phoneInvalid");
  await db()`
    update users set name = ${input.name.trim()}, phone = ${phone},
      notification_prefs = notification_prefs || ${db().json({ emailOptional: input.emailOptional ?? true })}
    where id = ${userId}`;
}

// ---------------------------------------------------------------------------
// Two-factor authentication (FR-M1-03, FR-M24-12)
// ---------------------------------------------------------------------------
export async function beginTotpEnrolment(userId: string): Promise<{ secret: string; uri: string }> {
  const [u] = await db()`select email, totp_enabled_at from users where id = ${userId}`;
  if (!u) throw new AppError("errors.notFound");
  if (u.totp_enabled_at) throw new AppError("auth.totpAlreadyEnabled");
  const secret = generateSecret();
  await db()`update users set totp_secret = ${secret} where id = ${userId}`;
  return { secret, uri: generateURI({ issuer: "Spot-In", label: String(u.email), secret }) };
}

export async function confirmTotpEnrolment(userId: string, sessionId: string, code: string): Promise<void> {
  const [u] = await db()`select totp_secret from users where id = ${userId}`;
  if (!u?.totp_secret || !(await totpVerify({ secret: String(u.totp_secret), token: code.trim() })).valid) {
    throw new AppError("auth.totpInvalid");
  }
  const at = await now();
  await db()`update users set totp_enabled_at = ${at} where id = ${userId}`;
  await db()`update sessions set two_factor_passed = true where id = ${sessionId}`;
}

export async function passTotp(userId: string, sessionId: string, code: string): Promise<void> {
  await enforce(`totp:${userId}`, 8, 900);
  const [u] = await db()`select totp_secret, totp_enabled_at from users where id = ${userId}`;
  if (!u?.totp_enabled_at || !(await totpVerify({ secret: String(u.totp_secret), token: code.trim() })).valid) {
    throw new AppError("auth.totpInvalid");
  }
  await db()`update sessions set two_factor_passed = true where id = ${sessionId} and user_id = ${userId}`;
}

// ---------------------------------------------------------------------------
// Quick attendee account (FR-M1-10) — used by event-page registration (Build 3)
// ---------------------------------------------------------------------------
export async function quickAttendee(input: {
  name: string;
  email: string;
  ageConfirmed: boolean;
  acceptedPilotNotice: boolean;
  ip?: string | null;
  data?: Record<string, unknown>;
}): Promise<{ userId: string; created: boolean }> {
  const email = normalizeEmail(input.email);
  if (!input.name.trim()) throw new AppError("errors.nameRequired");
  if (!isEmail(email)) throw new AppError("errors.emailInvalid");
  if (!input.ageConfirmed) throw new AppError("errors.ageRequired");
  if (!input.acceptedPilotNotice) throw new AppError("errors.consentRequired");
  const at = await now();
  const [existing] = await db()`select id, status from users where email = ${email}`;
  let userId: string;
  let created = false;
  if (existing) {
    if (existing.status !== "active") throw new AppError("auth.suspended");
    userId = String(existing.id);
  } else {
    userId = await db().begin(async (sql) => {
      const [u] = await sql`
        insert into users (name, email, is_quick_attendee, is_18_plus_confirmed, intent_chosen_at, created_at)
        values (${input.name.trim()}, ${email}, true, true, ${at}, ${at}) returning id`;
      await recordConsents(String(u!.id), input.ip ?? null, sql);
      return String(u!.id);
    });
    created = true;
  }
  const token = await issueToken(db(), "magic_link", userId, email, VERIFY_TTL_H * 3600_000, input.data ?? {});
  await emailAddress({ to: email, event: "attendee_verify", link: `/masuk/tautan?token=${token}` });
  return { userId, created };
}

// ---------------------------------------------------------------------------
// Account deletion and data export (FR-M1-08, FR-M38-05)
// ---------------------------------------------------------------------------

/** Organizations where this user is the only Owner and an active booking exists. */
export async function deletionBlockers(userId: string): Promise<string[]> {
  const hasBookings = (await db()`select to_regclass('public.bookings') as t`)[0]?.t;
  if (!hasBookings) return [];
  const rows = await db().unsafe(
    `select o.display_name from memberships m join organizations o on o.id = m.org_id
     where m.user_id = $1 and m.role = 'owner'
       and (select count(*) from memberships m2 where m2.org_id = m.org_id and m2.role = 'owner') = 1
       and exists (select 1 from bookings b join spaces s on s.id = b.space_id join properties p on p.id = s.property_id
                   join events e on e.id = b.event_id
                   where (p.operator_id = o.id or e.organizer_org_id = o.id)
                     and b.status not in ('settled', 'lapsed', 'cancelled_by_organizer', 'cancelled_by_venue'))`,
    [userId],
  );
  return rows.map((r) => String(r.display_name));
}

export async function deleteAccount(userId: string, ip?: string | null): Promise<void> {
  const blockers = await deletionBlockers(userId);
  if (blockers.length) throw new AppError("account.deletionBlocked", { orgs: blockers.join(", ") });
  const at = await now();
  await db().begin(async (sql) => {
    await sql`
      update users set name = '', email = ${`deleted+${userId}@invalid.spot-in`}, password_hash = null, google_sub = null,
        phone = null, photo_file_id = null, totp_secret = null, totp_enabled_at = null, notification_prefs = '{}',
        status = 'deleted', deleted_at = ${at}, deletion_requested_at = coalesce(deletion_requested_at, ${at})
      where id = ${userId}`;
    await sql`update sessions set revoked_at = ${at} where user_id = ${userId} and revoked_at is null`;
    await sql`delete from memberships where user_id = ${userId}`;
    await sql`delete from notifications where user_id = ${userId}`;
    await sql`delete from auth_tokens where user_id = ${userId}`;
    await audit({ scope: "user", actorId: userId, action: "user.deleted", entity: "user", entityId: userId, ip, at }, sql);
  });
}

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const sql = db();
  const [user] = await sql`
    select id, name, email, email_verified_at, phone, intents, notification_prefs, is_18_plus_confirmed, created_at, last_active_at
    from users where id = ${userId}`;
  return {
    exported_at: (await now()).toISOString(),
    user,
    consents: await sql`select document, version, accepted_at, ip from consent_records where user_id = ${userId}`,
    memberships: await sql`
      select o.display_name, o.kind, m.role, m.created_at from memberships m join organizations o on o.id = m.org_id where m.user_id = ${userId}`,
    sessions: await sql`select created_at, last_seen_at, user_agent, ip, revoked_at from sessions where user_id = ${userId}`,
    events_created: await sql`select id, name, days, created_at from events where created_by = ${userId}`,
    enquiries_created: await sql`select id, status, created_at from enquiries where created_by = ${userId}`,
    messages: await sql`select thread_id, body, created_at, edited_at, deleted_at from messages where sender_id = ${userId}`,
    notifications: await sql`select event, title, created_at, read_at from notifications where user_id = ${userId}`,
  };
}
