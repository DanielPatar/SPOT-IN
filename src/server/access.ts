import { db, type Tx } from "@/lib/db";
import { AppError, can, NotVerifiedError, PermissionError, type OrgKind, type Role } from "@/lib/permissions";

/**
 * Server-side permission checks (FR-M2-14). Any record outside the user's organizations
 * raises PermissionError, which the UI shows without revealing whether it exists.
 */
export type Membership = { orgId: string; role: Role; kind: OrgKind; displayName: string; status: string; verified: boolean };

export async function membershipOf(userId: string, kind: OrgKind, sql: Tx = db()): Promise<Membership | null> {
  const [m] = await sql`
    select m.org_id, m.role, o.kind, o.display_name, o.status, o.verification_status
    from memberships m join organizations o on o.id = m.org_id
    where m.user_id = ${userId} and m.org_kind = ${kind}`;
  if (!m) return null;
  return {
    orgId: String(m.org_id),
    role: m.role as Role,
    kind: m.kind as OrgKind,
    displayName: String(m.display_name),
    status: String(m.status),
    verified: m.verification_status === "verified",
  };
}

export async function requirePermission(userId: string, kind: OrgKind, permission: string, sql: Tx = db()): Promise<Membership> {
  const m = await membershipOf(userId, kind, sql);
  if (!m || !can(kind, m.role, permission)) throw new PermissionError();
  if (m.status !== "active") throw new AppError("errors.orgSuspended");
  return m;
}

export async function requireOrgPermission(userId: string, orgId: string, permission: string, sql: Tx = db()): Promise<Membership> {
  const [o] = await sql`select kind from organizations where id = ${orgId}`;
  if (!o) throw new PermissionError();
  const m = await requirePermission(userId, o.kind as OrgKind, permission, sql);
  if (m.orgId !== orgId) throw new PermissionError();
  return m;
}

/** FR-M1-02: a verified email is required before enquiry, quote, accept, pay and register. */
export async function requireVerified(userId: string, sql: Tx = db()): Promise<void> {
  const [u] = await sql`select email_verified_at, status from users where id = ${userId}`;
  if (!u || u.status !== "active") throw new PermissionError();
  if (!u.email_verified_at) throw new NotVerifiedError();
}

export async function requireAdmin(userId: string, sql: Tx = db()): Promise<void> {
  const [u] = await sql`select is_admin, totp_enabled_at, status from users where id = ${userId}`;
  if (!u?.is_admin || u.status !== "active") throw new PermissionError();
}

export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
