import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError, PermissionError } from "@/lib/permissions";
import { maskContacts } from "@/lib/masking";
import { enforce } from "@/lib/rate-limit";
import { requirePermission, isUuid } from "./access";
import { adminIds, notify, orgMemberIds } from "./notify";
import { storeUpload } from "./files";
import { enquiryForActor, recordVenueResponse } from "./enquiries";
import type { Actor } from "./accounts";

/** Messaging (M10): one thread per enquiry, masking until a booking is confirmed. */
const EDIT_WINDOW_MS = 10 * 60_000;
const MASK_ALERT_THRESHOLD = 3;

/** Contacts are unmasked only once a booking on the thread is confirmed (Build 2 sets booking_id). */
async function threadIsConfirmed(threadId: string): Promise<boolean> {
  const hasBookings = (await db()`select to_regclass('public.bookings') as t`)[0]?.t;
  if (!hasBookings) return false;
  const rows = await db().unsafe(
    `select 1 from threads t join bookings b on b.id = t.booking_id where t.id = $1
       and b.status in ('confirmed', 'balance_due', 'fully_paid', 'in_progress', 'post_event_window', 'on_hold', 'settled')`,
    [threadId],
  );
  return rows.length > 0;
}

export async function postMessage(
  actor: Actor,
  enquiryId: string,
  input: { body: string; files?: { name: string; bytes: Buffer }[] },
): Promise<{ id: string; masked: boolean }> {
  const { enquiry, side, membership } = await enquiryForActor(actor, enquiryId);
  await requirePermission(actor.userId, side === "venue" ? "venue_operator" : "organizer", side === "venue" ? "enquiry.respond" : "message.send");
  const body = input.body.trim();
  if (!body && !input.files?.length) throw new AppError("messages.empty");
  if (body.length > 5000) throw new AppError("messages.tooLong");
  await enforce(`message:${actor.userId}`, 60, 300);
  const [thread] = await db()`select id, masked_count from threads where enquiry_id = ${enquiryId}`;
  if (!thread) throw new PermissionError();
  const attachments: { fileId: string; filename: string; mime: string; size: number }[] = [];
  for (const f of input.files ?? []) {
    const s = await storeUpload(actor.userId, "message_attachment", f);
    attachments.push({ fileId: s.id, filename: s.filename, mime: s.mime, size: s.size });
  }
  const confirmed = await threadIsConfirmed(String(thread.id));
  const { text: display, masked } = confirmed ? { text: body, masked: false } : maskContacts(body);
  const at = await now();
  const kind = side === "venue" ? "venue_operator" : "organizer";
  const [msg] = await db().begin(async (sql) => {
    const r = await sql`
      insert into messages (thread_id, sender_id, sender_org_kind, body, display_body, was_masked, attachments, created_at)
      values (${thread.id as string}, ${actor.userId}, ${kind}, ${body}, ${display}, ${masked}, ${sql.json(attachments)}, ${at})
      returning id`;
    await sql`
      update threads set last_message_at = ${at}, last_message_org_kind = ${kind}, masked_count = masked_count + ${masked ? 1 : 0}
      where id = ${thread.id as string}`;
    await sql`
      insert into thread_reads (thread_id, org_id, last_read_at) values (${thread.id as string}, ${membership.orgId}, ${at})
      on conflict (thread_id, org_id) do update set last_read_at = excluded.last_read_at`;
    if (side === "venue") await recordVenueResponse(enquiryId, at, sql);
    if (side === "organizer" && enquiry.status === "info_requested") {
      await sql`update enquiries set status = 'responded', updated_at = ${at} where id = ${enquiryId}`;
    }
    return r;
  });
  if (masked && Number(thread.masked_count) + 1 === MASK_ALERT_THRESHOLD) {
    await notify({ userIds: await adminIds(), event: "admin_alert_masking", values: { enquiry: enquiryId }, link: `/admin/cari?q=${enquiryId}`, emailOnly: true });
  }
  const otherOrg = side === "venue" ? String(enquiry.organizer_org_id) : String(enquiry.operator_id);
  await notify({
    userIds: await orgMemberIds(otherOrg, side === "venue" ? undefined : ["owner", "staff", "viewer"]),
    event: "message_received",
    values: { from: membership.displayName, event: String(enquiry.event_name) },
    link: side === "venue" ? `/enquiry/${enquiryId}` : `/venue/enquiry/${enquiryId}`,
  });
  return { id: String(msg!.id), masked };
}

export async function listMessages(actor: Actor, enquiryId: string, opts: { since?: Date } = {}) {
  const { side, membership } = await enquiryForActor(actor, enquiryId);
  const [thread] = await db()`select id from threads where enquiry_id = ${enquiryId}`;
  if (!thread) throw new PermissionError();
  const rows = await db()`
    select m.id, m.sender_id, m.sender_org_kind, m.kind, m.display_body, m.was_masked, m.attachments, m.created_at, m.edited_at, m.deleted_at,
           case when u.status = 'deleted' then null else u.name end as sender_name
    from messages m left join users u on u.id = m.sender_id
    where m.thread_id = ${thread.id as string} ${opts.since ? db()`and (m.created_at > ${opts.since} or m.edited_at > ${opts.since} or m.deleted_at > ${opts.since})` : db()``}
    order by m.created_at`;
  const at = await now();
  await db()`
    insert into thread_reads (thread_id, org_id, last_read_at) values (${thread.id as string}, ${membership.orgId}, ${at})
    on conflict (thread_id, org_id) do update set last_read_at = excluded.last_read_at`;
  const [other] = await db()`
    select r.last_read_at from thread_reads r where r.thread_id = ${thread.id as string} and r.org_id <> ${membership.orgId}`;
  return {
    side,
    serverTime: at,
    otherLastReadAt: (other?.last_read_at as Date | undefined) ?? null,
    messages: rows.map((r) => ({
      id: String(r.id),
      mine: r.sender_id === actor.userId,
      side: r.sender_org_kind === "venue_operator" ? "venue" : r.sender_org_kind === "organizer" ? "organizer" : "system",
      senderName: (r.sender_name as string | null) ?? null,
      body: r.deleted_at ? null : String(r.display_body),
      wasMasked: !!r.was_masked && r.sender_id === actor.userId,
      attachments: r.deleted_at ? [] : (r.attachments as { fileId: string; filename: string; mime: string; size: number }[]),
      createdAt: r.created_at as Date,
      edited: !!r.edited_at,
      deleted: !!r.deleted_at,
      editable: r.sender_id === actor.userId && !r.deleted_at && at.getTime() - new Date(r.created_at as Date).getTime() < EDIT_WINDOW_MS,
    })),
  };
}

/** FR-M10-09: messages can be edited for 10 minutes; deletion is soft. */
export async function editMessage(actor: Actor, messageId: string, body: string): Promise<void> {
  if (!isUuid(messageId)) throw new PermissionError();
  const [m] = await db()`select sender_id, created_at, thread_id, deleted_at from messages where id = ${messageId}`;
  if (!m || m.sender_id !== actor.userId || m.deleted_at) throw new PermissionError();
  const at = await now();
  if (at.getTime() - new Date(m.created_at as Date).getTime() >= EDIT_WINDOW_MS) throw new AppError("messages.editWindowPassed");
  if (!body.trim()) throw new AppError("messages.empty");
  const confirmed = await threadIsConfirmed(String(m.thread_id));
  const { text, masked } = confirmed ? { text: body.trim(), masked: false } : maskContacts(body.trim());
  await db()`update messages set body = ${body.trim()}, display_body = ${text}, was_masked = ${masked}, edited_at = ${at} where id = ${messageId}`;
}

export async function deleteMessage(actor: Actor, messageId: string): Promise<void> {
  if (!isUuid(messageId)) throw new PermissionError();
  const rows = await db()`update messages set deleted_at = ${await now()} where id = ${messageId} and sender_id = ${actor.userId} and deleted_at is null returning id`;
  if (!rows.length) throw new PermissionError();
}

/** FR-M10-08: report a message to the Admin. */
export async function reportMessage(actor: Actor, messageId: string, reason: string, text?: string): Promise<void> {
  if (!isUuid(messageId)) throw new PermissionError();
  const [m] = await db()`select t.enquiry_id from messages m join threads t on t.id = m.thread_id where m.id = ${messageId}`;
  if (!m) throw new PermissionError();
  await enquiryForActor(actor, String(m.enquiry_id)); // must be a party to the thread
  if (!reason.trim()) throw new AppError("errors.reasonRequired");
  await db()`
    insert into reports (subject_type, subject_id, reporter_id, reason, text, created_at)
    values ('message', ${messageId}, ${actor.userId}, ${reason.trim()}, ${text?.trim() || null}, ${await now()})`;
  await notify({ userIds: await adminIds(), event: "admin_report_new", values: { type: "message" }, link: "/admin/laporan", emailOnly: true });
}

/** Anyone logged in can report a space (FR-M36-04 for spaces). */
export async function reportSpace(actor: Actor, spaceId: string, reason: string, text?: string): Promise<void> {
  if (!isUuid(spaceId)) throw new PermissionError();
  if (!reason.trim()) throw new AppError("errors.reasonRequired");
  await enforce(`report:${actor.userId}`, 10, 3600);
  await db()`
    insert into reports (subject_type, subject_id, reporter_id, reason, text, created_at)
    values ('space', ${spaceId}, ${actor.userId}, ${reason.trim()}, ${text?.trim() || null}, ${await now()})`;
  await notify({ userIds: await adminIds(), event: "admin_report_new", values: { type: "space" }, link: "/admin/laporan", emailOnly: true });
}

// ---------------------------------------------------------------------------
// Saved replies (FR-M10-04): plain text, no variables
// ---------------------------------------------------------------------------
export async function savedReplies(actor: Actor) {
  const m = await requirePermission(actor.userId, "venue_operator", "enquiry.view");
  return db()`select id, title, body from saved_replies where org_id = ${m.orgId} order by title`;
}

export async function saveSavedReply(actor: Actor, input: { id?: string; title: string; body: string }): Promise<void> {
  const m = await requirePermission(actor.userId, "venue_operator", "saved_replies.edit");
  if (!input.title.trim() || !input.body.trim()) throw new AppError("errors.invalidValue");
  if (input.id) {
    await db()`update saved_replies set title = ${input.title.trim()}, body = ${input.body.trim()} where id = ${input.id} and org_id = ${m.orgId}`;
  } else {
    await db()`insert into saved_replies (org_id, title, body, created_at) values (${m.orgId}, ${input.title.trim()}, ${input.body.trim()}, ${await now()})`;
  }
}

export async function removeSavedReply(actor: Actor, id: string): Promise<void> {
  const m = await requirePermission(actor.userId, "venue_operator", "saved_replies.edit");
  await db()`delete from saved_replies where id = ${id} and org_id = ${m.orgId}`;
}
