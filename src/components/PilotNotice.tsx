import { t } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/time";

/** Pilot notice (FR-M38-03): who runs it, purpose, data, hosting provider and country, deletion date, contact. */
export async function PilotNotice() {
  const s = await getSettings();
  return (
    <section className="card small" aria-labelledby="pilot-notice-title">
      <h2 id="pilot-notice-title" style={{ marginTop: 0 }}>
        {t("pilotNotice.title")}
      </h2>
      <ul>
        <li>{t("pilotNotice.who")}</li>
        <li>{t("pilotNotice.purpose")}</li>
        <li>{t("pilotNotice.data")}</li>
        <li>{t("pilotNotice.notCollected")}</li>
        <li>{t("pilotNotice.hosting", { provider: s.pilot_hosting_provider, country: s.pilot_hosting_country })}</li>
        <li>{t("pilotNotice.practice")}</li>
        <li>{t("pilotNotice.deletion", { date: formatDate(s.pilot_deletion_date) })}</li>
        <li>{t("pilotNotice.contact", { email: s.pilot_contact_email })}</li>
      </ul>
      <p className="muted">{t("pilotNotice.version", { version: s.pilot_notice_version })}</p>
    </section>
  );
}
