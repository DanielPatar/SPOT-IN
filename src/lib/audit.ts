import type { Tx } from "./db";
import { db } from "./db";

type Scope = "admin" | "system" | "user";

/** Append-only audit log (FR-M24-08, NFR auditability). */
export async function audit(
  args: {
    scope: Scope;
    actorId: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    ip?: string | null;
    at: Date;
  },
  sql: Tx = db(),
): Promise<void> {
  await sql`
    insert into audit_log (scope, actor_id, action, entity, entity_id, before, after, ip, at)
    values (${args.scope}, ${args.actorId}, ${args.action}, ${args.entity}, ${args.entityId ?? null},
            ${args.before === undefined ? null : sql.json(args.before as never)},
            ${args.after === undefined ? null : sql.json(args.after as never)},
            ${args.ip ?? null}, ${args.at})`;
}

/** Organization audit log of membership, role, threshold changes and exports (FR-M2-10). */
export async function orgAudit(
  args: { orgId: string; actorId: string | null; action: string; details?: Record<string, unknown>; at: Date },
  sql: Tx = db(),
): Promise<void> {
  await sql`
    insert into org_audit_log (org_id, actor_id, action, details, at)
    values (${args.orgId}, ${args.actorId}, ${args.action}, ${sql.json((args.details ?? {}) as never)}, ${args.at})`;
}
