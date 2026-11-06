import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { PermissionError } from "@/lib/permissions";
import { requireOrganizerPage } from "@/web/view";
import { eventDetail, previewEnquiry } from "@/server/enquiries";
import { Form, Submit } from "@/components/Form";
import { sendEnquiriesAction } from "@/web/actions/organizer";

/** Step 2: review warnings (FR-M9-05), answer each space's questions (FR-M9-04), send to all (FR-M9-03). */
export default async function SendEnquiryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ spaces?: string }> }) {
  const { id } = await params;
  const { spaces = "" } = await searchParams;
  const { session } = await requireOrganizerPage(`/acara/${id}/kirim`);
  const a = { userId: session.userId };
  let d, preview;
  try {
    d = await eventDetail(a, id);
    preview = await previewEnquiry(a, id, spaces.split(",").filter(Boolean));
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  return (
    <div>
      <h1>{t("send.title", { event: String(d.event.name) })}</h1>
      <p className="muted">{t("send.intro")}</p>
      {preview.length === 0 ? <p className="alert alert-warn">{t("send.noSpaces")}</p> : null}
      <Form action={sendEnquiriesAction}>
        <input type="hidden" name="eventId" value={id} />
        {preview.map((p) => (
          <fieldset key={p.spaceId}>
            <legend>
              <label className="check">
                <input type="checkbox" name="spaceId" value={p.spaceId} defaultChecked /> {p.name} · {p.propertyName}
              </label>
            </legend>
            {p.warnings.length ? (
              <div className="alert alert-warn small">
                {p.warnings.map((w) => (
                  <div key={w}>{t(`warnings.${w}`)}</div>
                ))}
              </div>
            ) : null}
            {p.questions.map((q) => (
              <label key={q.id}>
                {q.label}
                <textarea name={`answer_${p.spaceId}_${q.id}`} />
              </label>
            ))}
          </fieldset>
        ))}
        <p className="small muted">{t("send.limits")}</p>
        {preview.length ? <Submit>{t("send.button")}</Submit> : null}
      </Form>
    </div>
  );
}
