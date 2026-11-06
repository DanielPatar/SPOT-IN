import { db, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { t, type TValues } from "@/lib/i18n";
import { config } from "@/lib/config";
import { sendEmail } from "@/adapters/email";

/**
 * Notifications (FR-M21-01/02/05): in-app + email. Transactional notifications can't be
 * turned off; others respect the user's email preference. Text comes from the catalog:
 * notify.<event>.title / notify.<event>.body.
 */
export const TRANSACTIONAL_EVENTS = new Set([
  "verify_email",
  "magic_link",
  "password_reset",
  "pilot_invite",
  "org_invite",
  "payment_due",
  "agreement_ready",
  "booking_confirmed",
  "booking_lapsed",
  "booking_cancelled",
  "pass_issued",
  "event_changed",
  "event_cancelled",
]);

export function absoluteUrl(path: string): string {
  return new URL(path, config().APP_URL).toString();
}

export async function notify(
  args: { userIds: string[]; event: string; values?: TValues; link?: string; emailOnly?: boolean },
  sql: Tx = db(),
): Promise<void> {
  if (args.userIds.length === 0) return;
  const at = await now();
  const transactional = TRANSACTIONAL_EVENTS.has(args.event);
  const title = t(`notify.${args.event}.title`, args.values);
  const body = t(`notify.${args.event}.body`, args.values);
  const users = await sql`
    select id, email, notification_prefs, status from users where id in ${sql(args.userIds)} and status <> 'deleted'`;
  for (const u of users) {
    if (!args.emailOnly) {
      await sql`
        insert into notifications (user_id, event, title, body, link, transactional, created_at)
        values (${u.id as string}, ${args.event}, ${title}, ${body}, ${args.link ?? null}, ${transactional}, ${at})`;
    }
    const prefs = (u.notification_prefs ?? {}) as { emailOptional?: boolean };
    if (transactional || prefs.emailOptional !== false) {
      await sendEmail({ to: String(u.email), subject: title, text: emailText(body, args.link), category: args.event });
    }
  }
}

/** Email to an address that may not have an account yet (invites). */
export async function emailAddress(args: { to: string; event: string; values?: TValues; link?: string }): Promise<void> {
  const title = t(`notify.${args.event}.title`, args.values);
  const body = t(`notify.${args.event}.body`, args.values);
  await sendEmail({ to: args.to, subject: title, text: emailText(body, args.link), category: args.event });
}

function emailText(body: string, link?: string): string {
  return [body, link ? absoluteUrl(link) : null, "", t("email.footer")].filter((x) => x !== null).join("\n");
}

export async function orgMemberIds(orgId: string, roles?: string[], sql: Tx = db()): Promise<string[]> {
  const rows = roles
    ? await sql`select m.user_id from memberships m join users u on u.id = m.user_id where m.org_id = ${orgId} and m.role in ${sql(roles)} and u.status = 'active'`
    : await sql`select m.user_id from memberships m join users u on u.id = m.user_id where m.org_id = ${orgId} and u.status = 'active'`;
  return rows.map((r) => String(r.user_id));
}

export async function adminIds(sql: Tx = db()): Promise<string[]> {
  const rows = await sql`select id from users where is_admin and status = 'active'`;
  return rows.map((r) => String(r.id));
}
