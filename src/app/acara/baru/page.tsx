import { t } from "@/lib/i18n";
import { requireOrganizerPage } from "@/web/view";
import { Form, Submit } from "@/components/Form";
import { EventFields } from "@/components/EventFields";
import { createEventAction } from "@/web/actions/organizer";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ spaces?: string }> }) {
  const { spaces } = await searchParams;
  await requireOrganizerPage("/acara/baru");
  return (
    <div>
      <h1>{t("events.new")}</h1>
      <Form action={createEventAction} encType="multipart/form-data">
        <input type="hidden" name="spaces" value={spaces ?? ""} />
        <EventFields />
        <Submit>{spaces ? t("events.createAndContinue") : t("events.create")}</Submit>
      </Form>
    </div>
  );
}
