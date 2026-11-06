import { t } from "@/lib/i18n";
import { requireSession } from "@/web/session";
import { Form, Submit } from "@/components/Form";
import { PageTitle } from "@/components/kit";
import { contactAction } from "@/web/actions/after";

/** FR-M26-02: "Hubungi kami" — linked to the booking, enquiry or event page it was opened from. */
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const sp = await searchParams;
  await requireSession("/bantuan/hubungi");
  const type = ["booking", "enquiry", "event_page"].includes(sp.type ?? "") ? sp.type! : "";
  return (
    <div className="narrow">
      <PageTitle back={{ href: "/bantuan", label: t("help.title") }} title={t("contactForm.title")} description={t("contactForm.intro")} />
      <Form action={contactAction} resetOnOk>
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="id" value={type ? (sp.id ?? "") : ""} />
        {type ? <p className="small muted">{t(`contactForm.about.${type}`)}</p> : null}
        <label>
          {t("contactForm.message")}
          <textarea name="text" rows={6} required maxLength={4000} />
        </label>
        <Submit>{t("contactForm.submit")}</Submit>
      </Form>
    </div>
  );
}
