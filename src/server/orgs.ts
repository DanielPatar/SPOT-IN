import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError, PermissionError, validRole, type OrgKind } from "@/lib/permissions";
import { orgAudit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/tokens";
import { requireOrgPermission, membershipOf, isUuid } from "./access";
import { adminIds, emailAddress, notify } from "./notify";
import { isInvited, normalizeEmail, type Actor } from "./accounts";

/** Organizations and roles (M2). */
const INVITE_TTL_DAYS = 7;

export async function createOrganization(
  actor: Actor,
  input: { kind: OrgKind; displayName: string; legalName?: string; city?: string; contactEmail?: string; contactPhone?: string; isIndividual?: boolean },
): Promise<string> {
  if (!input.displayName.trim()) throw new AppError("errors.nameRequired");
  if (await membershipOf(actor.userId, input.kind)) throw new AppError("orgs.alreadyMember");
  const at = await now();
  return db().begin(async (sql) => {
    const [o] = await sql`
      insert into organizations (kind, display_name, legal_name, city, contact_email, contact_phone, is_individual, created_at)
      values (${input.kind}, ${input.displayName.trim()}, ${input.legalName?.trim() || null}, ${input.city?.trim() || null},
              ${input.contactEmail?.trim() || null}, ${input.contactPhone?.trim() || null}, ${!!input.isIndividual}, ${at})
      returning id`;
    const orgId = String(o!.id);
    await sql`insert into memberships (user_id, org_id, org_kind, role, created_at) values (${actor.userId}, ${orgId}, ${input.kind}, 'owner', ${at})`;
    if (input.kind === "venue_operator") await sql`insert into tax_settings (operator_id) values (${orgId})`;
    await orgAudit({ orgId, actorId: actor.userId, action: "org.created", details: { kind: input.kind }, at }, sql);
    return orgId;
  });
}

export async function updateOrganization(
  actor: Actor,
  orgId: string,
  input: { displayName: string; legalName?: string; city?: string; contactEmail?: string; contactPhone?: string; logoFileId?: string | null },
): Promise<void> {
  await requireOrgPermission(actor.userId, orgId, "org.manage");
  if (!input.displayName.trim()) throw new AppError("errors.nameRequired");
  await db()`
    update organizations set display_name = ${input.displayName.trim()}, legal_name = ${input.legalName?.trim() || null},
      city = ${input.city?.trim() || null}, contact_email = ${input.contactEmail?.trim() || null},
      contact_phone = ${input.contactPhone?.trim() || null},
      logo_file_id = coalesce(${input.logoFileId ?? null}, logo_file_id)
    where id = ${orgId}`;
}

/** FR-M2-03: invites expire after 7 days; resend and revoke. */
export async function inviteMember(actor: Actor, orgId: string, emailInput: string, role: string): Promise<string> {
  const m = await requireOrgPermission(actor.userId, orgId, "org.manage");
  if (!validRole(m.kind, role)) throw new AppError("errors.invalidRole");
  const email = normalizeEmail(emailInput);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("errors.emailInvalid");
  const [existing] = await db()`select id from users where email = ${email} and status = 'active'`;
  if (existing) {
    const already = await db()`select 1 from memberships where user_id = ${existing.id as string} and org_kind = ${m.kind}`;
    if (already.length) throw new AppError("orgs.inviteeAlreadyInOrg");
  } else if (!(await isInvited(email))) {
    // FR-M38-02: only emails on the Admin's pilot invite list can sign up.
    await notify({ userIds: await adminIds(), event: "admin_invite_needed", values: { email, org: m.displayName }, link: "/admin/undangan" });
    throw new AppError("orgs.inviteeNotOnPilotList");
  }
  const at = await now();
  const token = randomToken();
  await db()`update org_invites set revoked_at = ${at} where org_id = ${orgId} and email = ${email} and accepted_at is null and revoked_at is null`;
  const [inv] = await db()`
    insert into org_invites (org_id, email, role, token_hash, invited_by, expires_at, created_at)
    values (${orgId}, ${email}, ${role}, ${sha256(token)}, ${actor.userId}, ${new Date(at.getTime() + INVITE_TTL_DAYS * 86_400_000)}, ${at})
    returning id`;
  await orgAudit({ orgId, actorId: actor.userId, action: "member.invited", details: { email, role }, at });
  await emailAddress({ to: email, event: "org_invite", values: { org: m.displayName }, link: `/undangan?token=${token}` });
  return String(inv!.id);
}

export async function resendInvite(actor: Actor, orgId: string, inviteId: string): Promise<void> {
  await requireOrgPermission(actor.userId, orgId, "org.manage");
  const [inv] = await db()`select email, role from org_invites where id = ${inviteId} and org_id = ${orgId} and accepted_at is null`;
  if (!inv) throw new PermissionError();
  await inviteMember(actor, orgId, String(inv.email), String(inv.role));
}

export async function revokeInvite(actor: Actor, orgId: string, inviteId: string): Promise<void> {
  await requireOrgPermission(actor.userId, orgId, "org.manage");
  const at = await now();
  await db()`update org_invites set revoked_at = ${at} where id = ${inviteId} and org_id = ${orgId} and accepted_at is null`;
  await orgAudit({ orgId, actorId: actor.userId, action: "member.invite_revoked", details: { inviteId }, at });
}

export async function inviteByToken(token: string) {
  const [inv] = await db()`
    select i.id, i.org_id, i.email, i.role, i.expires_at, i.accepted_at, i.revoked_at, o.display_name, o.kind
    from org_invites i join organizations o on o.id = i.org_id where i.token_hash = ${sha256(token)}`;
  if (!inv) return null;
  const at = await now();
  const state = inv.accepted_at ? "accepted" : inv.revoked_at ? "revoked" : new Date(inv.expires_at as Date) < at ? "expired" : "open";
  return { ...inv, state } as typeof inv & { state: "accepted" | "revoked" | "expired" | "open" };
}

export async function acceptOrgInvite(actor: Actor, token: string): Promise<string> {
  const inv = await inviteByToken(token);
  if (!inv || inv.state !== "open") throw new AppError(inv?.state === "expired" ? "orgs.inviteExpired" : "orgs.inviteInvalid");
  const [u] = await db()`select email from users where id = ${actor.userId}`;
  if (!u || normalizeEmail(String(u.email)) !== normalizeEmail(String(inv.email))) throw new AppError("orgs.inviteWrongEmail");
  const at = await now();
  await db().begin(async (sql) => {
    await sql`insert into memberships (user_id, org_id, org_kind, role, created_at) values (${actor.userId}, ${inv.org_id as string}, ${inv.kind as string}, ${inv.role as string}, ${at})`;
    await sql`update org_invites set accepted_at = ${at} where id = ${inv.id as string}`;
    await orgAudit({ orgId: String(inv.org_id), actorId: actor.userId, action: "member.joined", details: { role: inv.role }, at }, sql);
  });
  return String(inv.org_id);
}

async function ownerCount(orgId: string): Promise<number> {
  const [r] = await db()`select count(*)::int as n from memberships where org_id = ${orgId} and role = 'owner'`;
  return Number(r!.n);
}

/** FR-M2-08: at least one Owner must always exist. */
export async function changeRole(actor: Actor, orgId: string, userId: string, role: string): Promise<void> {
  const m = await requireOrgPermission(actor.userId, orgId, "org.manage");
  if (!validRole(m.kind, role)) throw new AppError("errors.invalidRole");
  const [target] = await db()`select role from memberships where org_id = ${orgId} and user_id = ${userId}`;
  if (!target) throw new PermissionError();
  if (target.role === "owner" && role !== "owner" && (await ownerCount(orgId)) <= 1) throw new AppError("orgs.lastOwner");
  const at = await now();
  await db()`update memberships set role = ${role} where org_id = ${orgId} and user_id = ${userId}`;
  await orgAudit({ orgId, actorId: actor.userId, action: "member.role_changed", details: { userId, from: target.role, to: role }, at });
}

export async function transferOwnership(actor: Actor, orgId: string, toUserId: string): Promise<void> {
  const m = await requireOrgPermission(actor.userId, orgId, "org.manage");
  if (toUserId === actor.userId) return;
  const [target] = await db()`select role from memberships where org_id = ${orgId} and user_id = ${toUserId}`;
  if (!target) throw new PermissionError();
  const at = await now();
  const demoted = m.kind === "venue_operator" ? "staff" : "member";
  await db().begin(async (sql) => {
    await sql`update memberships set role = 'owner' where org_id = ${orgId} and user_id = ${toUserId}`;
    await sql`update memberships set role = ${demoted} where org_id = ${orgId} and user_id = ${actor.userId}`;
    await orgAudit({ orgId, actorId: actor.userId, action: "org.ownership_transferred", details: { to: toUserId }, at }, sql);
  });
}

/** FR-M2-09: removing a member requires choosing who takes over their open work. */
export async function removeMember(actor: Actor, orgId: string, userId: string, reassignTo: string): Promise<void> {
  await requireOrgPermission(actor.userId, orgId, "org.manage");
  if (!isUuid(reassignTo) || reassignTo === userId) throw new AppError("orgs.reassigneeRequired");
  const [target] = await db()`select role from memberships where org_id = ${orgId} and user_id = ${userId}`;
  const [assignee] = await db()`select 1 from memberships where org_id = ${orgId} and user_id = ${reassignTo}`;
  if (!target || !assignee) throw new PermissionError();
  if (target.role === "owner" && (await ownerCount(orgId)) <= 1) throw new AppError("orgs.lastOwner");
  const at = await now();
  await db().begin(async (sql) => {
    const a = await sql`
      update enquiries set assigned_member_id = ${reassignTo}
      where assigned_member_id = ${userId} and space_id in (
        select s.id from spaces s join properties p on p.id = s.property_id where p.operator_id = ${orgId})
      returning id`;
    const b = await sql`update events set created_by = ${reassignTo} where created_by = ${userId} and organizer_org_id = ${orgId} returning id`;
    await sql`delete from memberships where org_id = ${orgId} and user_id = ${userId}`;
    await sql`update sessions set context = null where user_id = ${userId}`;
    await orgAudit(
      { orgId, actorId: actor.userId, action: "member.removed", details: { userId, reassignTo, enquiries: a.length, events: b.length }, at },
      sql,
    );
  });
}

/** FR-M2-06: optional approval threshold, Owner only. */
export async function setApprovalThreshold(actor: Actor, orgId: string, amount: number | null): Promise<void> {
  const m = await requireOrgPermission(actor.userId, orgId, "venue.threshold");
  if (m.kind !== "venue_operator") throw new PermissionError();
  if (amount !== null && (!Number.isSafeInteger(amount) || amount <= 0)) throw new AppError("errors.amountInvalid");
  const at = await now();
  const [prev] = await db()`select approval_threshold from organizations where id = ${orgId}`;
  await db()`update organizations set approval_threshold = ${amount} where id = ${orgId}`;
  await orgAudit({ orgId, actorId: actor.userId, action: "org.threshold_changed", details: { from: prev?.approval_threshold?.toString() ?? null, to: amount }, at });
}

export async function orgMembers(actor: Actor, orgId: string) {
  await requireOrgPermission(actor.userId, orgId, "org.manage");
  const members = await db()`
    select u.id, u.name, u.email, m.role, m.created_at from memberships m join users u on u.id = m.user_id
    where m.org_id = ${orgId} order by m.created_at`;
  const invites = await db()`
    select id, email, role, expires_at, created_at from org_invites
    where org_id = ${orgId} and accepted_at is null and revoked_at is null order by created_at desc`;
  const log = await db()`
    select l.action, l.details, l.at, u.name as actor from org_audit_log l left join users u on u.id = l.actor_id
    where l.org_id = ${orgId} order by l.at desc limit 50`;
  return { members, invites, log };
}

/** FR-M3-02: the operator (or organizer org) submits itself for the Admin's verification. */
export async function submitForVerification(actor: Actor, orgId: string): Promise<void> {
  await requireOrgPermission(actor.userId, orgId, "org.manage");
  const at = await now();
  const rows = await db()`
    update organizations set verification_status = 'pending', verification_submitted_at = ${at}, verification_reason = null
    where id = ${orgId} and verification_status in ('unsubmitted', 'rejected') returning display_name`;
  if (rows[0]) {
    await notify({ userIds: await adminIds(), event: "admin_verification_submitted", values: { org: String(rows[0].display_name) }, link: "/admin/verifikasi" });
  }
}
