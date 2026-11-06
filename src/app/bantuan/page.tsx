import Link from "next/link";
import { t } from "@/lib/i18n";
import { getSession } from "@/web/session";
import { PageTitle } from "@/components/kit";

/** FR-M26-01: FAQs on booking, pilot mode, cancelling and passes. */
export default async function HelpPage() {
  const s = await getSession();
  const faqs = ["booking", "pilot", "enquiry", "cancel", "passes", "privacy"] as const;
  return (
    <div className="narrow">
      <PageTitle title={t("help.title")} description={t("help.intro")} />
      {faqs.map((f) => (
        <section key={f} className="card" aria-labelledby={`faq-${f}`}>
          <h2 id={`faq-${f}`} style={{ marginTop: 0 }}>{t(`help.${f}.q`)}</h2>
          <p>{t(`help.${f}.a`)}</p>
        </section>
      ))}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>{t("contactForm.title")}</h2>
        <p>{t("contactForm.helpBody")}</p>
        {s ? <Link className="btn btn-secondary" href="/bantuan/hubungi">{t("contactForm.link")}</Link> : <Link href="/masuk?next=/bantuan/hubungi">{t("contactForm.loginFirst")}</Link>}
      </section>
    </div>
  );
}
