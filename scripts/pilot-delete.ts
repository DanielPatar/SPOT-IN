/**
 * Pilot deletion job (FR-M38-05). On or after the pilot deletion date (Admin setting),
 * deletes or anonymizes every pilot user's personal data and uploaded files. Run with
 * --confirm; without it the script only reports what it would do. See docs/pilot-deletion.md.
 */
import { db, closeDb } from "../src/lib/db";
import { now } from "../src/lib/clock";
import { getSettings } from "../src/lib/settings";
import { storage } from "../src/adapters/storage";
import { localDate } from "../src/lib/time";

export async function pilotDelete(opts: { confirm: boolean; force?: boolean }) {
  const sql = db();
  const at = await now();
  const { pilot_deletion_date } = await getSettings();
  if (!opts.force && localDate(at, "Asia/Jakarta") < pilot_deletion_date) {
    return { ran: false, reason: `deletion date ${pilot_deletion_date} not reached` };
  }
  const [counts] = await sql`
    select (select count(*) from users where status <> 'deleted' and not is_admin)::int as users,
           (select count(*) from files)::int as files, (select count(*) from messages)::int as messages`;
  if (!opts.confirm) return { ran: false, reason: "dry run (pass --confirm)", ...counts };
  const files = await sql`select storage_key from files`;
  for (const f of files) await storage().remove(String(f.storage_key)).catch(() => {});
  await sql.begin(async (tx) => {
    await tx`delete from files`;
    await tx`update messages set body = '', display_body = '', attachments = '[]'`;
    await tx`update properties set photos = '[]', address_text = '', parking_notes = null, loading_notes = null, house_rules = null`;
    await tx`update spaces set media = '[]'`;
    await tx`update organizations set display_name = 'Organisasi pilot', legal_name = null, contact_email = null, contact_phone = null, logo_file_id = null`;
    await tx`update events set name = 'Acara pilot', brand = null, description = null`;
    await tx`update enquiries set answers = '{}', internal_notes = null, decline_note = null, lost_reason = null`;
    await tx`delete from saved_replies`;
    await tx`delete from notifications`;
    await tx`delete from email_outbox`;
    await tx`delete from auth_tokens`;
    await tx`delete from sessions`;
    await tx`delete from consent_records where user_id in (select id from users where not is_admin)`;
    await tx`delete from reports`;
    await tx`
      update users set name = '', email = 'deleted+' || id || '@invalid.spot-in', password_hash = null, google_sub = null, phone = null,
        photo_file_id = null, totp_secret = null, notification_prefs = '{}', status = 'deleted', deleted_at = ${at}
      where not is_admin`;
  });
  return { ran: true, ...counts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  pilotDelete({ confirm: process.argv.includes("--confirm"), force: process.argv.includes("--force") })
    .then((r) => console.log(JSON.stringify(r)))
    .finally(() => closeDb());
}
