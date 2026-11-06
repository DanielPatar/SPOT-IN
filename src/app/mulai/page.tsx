import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { Form, Submit } from "@/components/Form";
import { startAction } from "@/web/actions/auth";
import { requireSession, memberships } from "@/web/session";

/** FR-M1-06: first login — Find spaces, List spaces or both. */
export default async function StartPage() {
  const s = await requireSession("/mulai");
  const m = await memberships(s.userId);
  if (s.isQuickAttendee) redirect("/");
  if (m.venue && m.organizer) redirect("/");
  return (
    <div className="narrow">
      <h1>{t("start.title")}</h1>
      <p className="muted">{t("start.intro")}</p>
      <Form action={startAction}>
        {!m.organizer ? (
          <fieldset>
            <legend>
              <label className="check">
                <input type="checkbox" name="intent" value="find" defaultChecked={!m.venue} /> {t("start.find")}
              </label>
            </legend>
            <p className="small muted">{t("start.findHelp")}</p>
            <label>
              {t("start.organizerKind")}
              <select name="organizerKind" defaultValue="individual">
                <option value="individual">{t("start.individual")}</option>
                <option value="company">{t("start.company")}</option>
              </select>
            </label>
            <label>
              {t("start.organizerName")}
              <input name="organizerName" placeholder={s.name} />
            </label>
            <label>
              {t("fields.legalNameOptional")}
              <input name="organizerLegalName" />
            </label>
          </fieldset>
        ) : null}
        {!m.venue ? (
          <fieldset>
            <legend>
              <label className="check">
                <input type="checkbox" name="intent" value="list" /> {t("start.list")}
              </label>
            </legend>
            <p className="small muted">{t("start.listHelp")}</p>
            <label>
              {t("start.venueName")}
              <input name="venueName" />
            </label>
            <label>
              {t("fields.legalNameOptional")}
              <input name="venueLegalName" />
            </label>
            <label>
              {t("fields.city")}
              <input name="venueCity" />
            </label>
            <label>
              {t("fields.contactPhoneOptional")}
              <input name="venuePhone" inputMode="tel" />
            </label>
          </fieldset>
        ) : null}
        {m.organizer ? <input type="hidden" name="intent" value="find" /> : null}
        {m.venue ? <input type="hidden" name="intent" value="list" /> : null}
        <Submit>{t("start.continue")}</Submit>
      </Form>
    </div>
  );
}
