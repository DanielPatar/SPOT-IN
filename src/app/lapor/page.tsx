import { t } from "@/lib/i18n";
import { Form, Submit } from "@/components/Form";
import { PageTitle } from "@/components/kit";
import { reportAction } from "@/web/actions/after";

const REASONS = ["fake", "inappropriate", "misleading", "spam", "other"] as const;

/** FR-M36-04: anyone can report an event page or a space. */
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const sp = await searchParams;
  const type = sp.type === "space" ? "space" : "event_page";
  return (
    <div className="narrow">
      <PageTitle title={t("reportForm.title")} description={t("reportForm.intro")} />
      <Form action={reportAction}>
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="id" value={sp.id ?? ""} />
        <label>
          {t("reportForm.reason")}
          <select name="reason" required defaultValue="">
            <option value="" disabled>{t("reportForm.choose")}</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>{t(`reportForm.reasons.${r}`)}</option>
            ))}
          </select>
        </label>
        <label>
          {t("reportForm.text")}
          <textarea name="text" rows={4} maxLength={2000} />
        </label>
        <Submit>{t("reportForm.submit")}</Submit>
      </Form>
    </div>
  );
}
