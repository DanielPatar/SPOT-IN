import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { PermissionError } from "@/lib/permissions";
import { requireOrganizerPage } from "@/web/view";
import { eventDetail } from "@/server/enquiries";
import { Form, Submit } from "@/components/Form";
import { EventFields } from "@/components/EventFields";
import { updateEventAction } from "@/web/actions/organizer";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireOrganizerPage(`/acara/${id}/ubah`);
  let d;
  try {
    d = await eventDetail({ userId: session.userId }, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  return (
    <div>
      <h1>{t("events.edit")}</h1>
      {d.enquiries.length ? <p className="alert alert-warn">{t("events.editNotice")}</p> : null}
      <Form action={updateEventAction} encType="multipart/form-data">
        <input type="hidden" name="eventId" value={id} />
        <EventFields e={d.event} />
        <Submit>{t("common.save")}</Submit>
      </Form>
    </div>
  );
}
