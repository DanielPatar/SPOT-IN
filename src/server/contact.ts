import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError, PermissionError } from "@/lib/permissions";
import { enforce } from "@/lib/rate-limit";
import { isUuid } from "./access";
import { adminIds, notify } from "./notify";
import { enquiryForActor } from "./enquiries";
import { bookingFor } from "./bookings";
import type { Actor } from "./accounts";

export type ContactSubject = "booking" | "enquiry" | "event_page";

/** FR-M26-02: "Hubungi kami" from a booking, enquiry or event page; emails the Admins with the record linked. */
export async function contactUs(actor: Actor, input: { subjectType?: ContactSubject | null; subjectId?: string | null; text: string }): Promise<void> {
  const text = input.text.trim();
  if (!text) throw new AppError("contact.textRequired");
  if (text.length > 4000) throw new AppError("errors.invalidValue");
  await enforce(`contact:${actor.userId}`, 10, 3600);
  let type: ContactSubject | null = null;
  let id: string | null = null;
  if (input.subjectType && input.subjectId) {
    if (!isUuid(input.subjectId)) throw new PermissionError();
    // The sender must be able to see the record they refer to.
    if (input.subjectType === "booking") await bookingFor(actor, input.subjectId);
    else if (input.subjectType === "enquiry") await enquiryForActor(actor, input.subjectId);
    else if (input.subjectType === "event_page") {
      const [p] = await db()`select 1 from event_pages where id = ${input.subjectId}`;
      if (!p) throw new PermissionError();
    } else throw new PermissionError();
    type = input.subjectType;
    id = input.subjectId;
  }
  const [u] = await db()`select name, email from users where id = ${actor.userId}`;
  await db()`insert into contact_messages (user_id, subject_type, subject_id, text, created_at) values (${actor.userId}, ${type}, ${id}, ${text}, ${await now()})`;
  await notify({
    userIds: await adminIds(),
    event: "contact_message",
    values: { name: String(u?.name ?? ""), email: String(u?.email ?? ""), text, subject: type ? `${type} ${id}` : "-" },
    link: id ? `/admin/cari?q=${id}` : "/admin",
  });
}
