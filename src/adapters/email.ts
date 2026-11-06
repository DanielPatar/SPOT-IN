import nodemailer from "nodemailer";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";

/**
 * Email adapter (PRD §10). Every message is written to email_outbox first; the
 * "outbox" driver stops there (dev/test/demo — the dev mail viewer shows them), the
 * "smtp" driver then sends through the transactional provider.
 */
export type OutgoingEmail = { to: string; subject: string; text: string; html?: string; category: string };

let transport: nodemailer.Transporter | undefined;

export async function sendEmail(mail: OutgoingEmail): Promise<void> {
  const at = await now();
  const [row] = await db()`
    insert into email_outbox (to_email, subject, text_body, html_body, category, status, created_at)
    values (${mail.to}, ${mail.subject}, ${mail.text}, ${mail.html ?? null}, ${mail.category}, 'queued', ${at})
    returning id`;
  const id = row!.id as string;
  const cfg = config();
  if (cfg.EMAIL_DRIVER !== "smtp") {
    await db()`update email_outbox set status = 'sent', sent_at = ${at} where id = ${id}`;
    return;
  }
  try {
    transport ??= nodemailer.createTransport(cfg.SMTP_URL);
    await transport.sendMail({ from: cfg.EMAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    await db()`update email_outbox set status = 'sent', sent_at = ${await now()} where id = ${id}`;
  } catch (e) {
    await db()`update email_outbox set status = 'failed', error = ${String(e)} where id = ${id}`;
  }
}

/** Bounce webhook/manual entry point (FR-M21-07): marks the address on the user profile. */
export async function recordBounce(email: string): Promise<void> {
  const at = await now();
  await db()`update users set email_bounced_at = ${at} where email = ${email}`;
  await db()`
    update email_outbox set status = 'bounced'
    where id = (select id from email_outbox where to_email = ${email} order by created_at desc limit 1)`;
}
