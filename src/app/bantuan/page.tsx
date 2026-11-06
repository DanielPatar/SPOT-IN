import { t } from "@/lib/i18n";

export default function HelpPage() {
  const faqs = ["booking", "pilot", "enquiry", "privacy"] as const;
  return (
    <div className="narrow">
      <h1>{t("help.title")}</h1>
      {faqs.map((f) => (
        <div key={f} className="card">
          <h2 style={{ marginTop: 0 }}>{t(`help.${f}.q`)}</h2>
          <p>{t(`help.${f}.a`)}</p>
        </div>
      ))}
    </div>
  );
}
