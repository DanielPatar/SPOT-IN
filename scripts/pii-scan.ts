/**
 * Pre-demo data scan (FR-M38-04, AC-M38-4): no column for blocked data types exists, and
 * no text value contains a 16-digit NIK-like or card-like number. Exits 1 on any match.
 */
import { db, closeDb } from "../src/lib/db";

const BLOCKED_COLUMN = /(^|_)(nik|ktp|npwp|nib|passport|selfie|deed|akta|iban|bank_account|account_number|card_number|cvv)(_|$)/i;
const SIXTEEN_DIGITS = "(^|[^0-9])[0-9]{16}([^0-9]|$)";
const SIXTEEN_SPACED = "(^|[^0-9])[0-9]{4}[ .-][0-9]{4}[ .-][0-9]{4}[ .-][0-9]{4}([^0-9]|$)";

export async function piiScan(): Promise<{ columns: string[]; values: { table: string; column: string; id: string }[] }> {
  const sql = db();
  const cols = await sql`
    select c.table_name, c.column_name, c.data_type from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.table_name not in ('spatial_ref_sys', 'schema_migrations')`;
  const columns = cols.filter((c) => BLOCKED_COLUMN.test(String(c.column_name))).map((c) => `${c.table_name}.${c.column_name}`);
  const values: { table: string; column: string; id: string }[] = [];
  const skip = new Set(["auth_tokens.token_hash", "sessions.token_hash", "files.storage_key", "share_links.token", "users.totp_secret", "audit_log.before", "audit_log.after"]);
  for (const c of cols) {
    const key = `${c.table_name}.${c.column_name}`;
    if (skip.has(key) || !["text", "jsonb", "USER-DEFINED", "ARRAY"].includes(String(c.data_type))) continue;
    if (c.data_type === "USER-DEFINED" && c.column_name !== "email") continue;
    const rows = await sql.unsafe(
      `select ctid::text as id from "${c.table_name}" where "${c.column_name}"::text ~ $1 or "${c.column_name}"::text ~ $2 limit 20`,
      [SIXTEEN_DIGITS, SIXTEEN_SPACED],
    );
    for (const r of rows) values.push({ table: String(c.table_name), column: String(c.column_name), id: String(r.id) });
  }
  return { columns, values };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  piiScan()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      console.log(r.columns.length + r.values.length === 0 ? "pii-scan: 0 matches" : `pii-scan: ${r.columns.length + r.values.length} match(es)`);
      if (r.columns.length + r.values.length) process.exitCode = 1;
    })
    .finally(() => closeDb());
}
