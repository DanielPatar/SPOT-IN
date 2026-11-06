import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/time";
import { requireAdminPage } from "@/web/session";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { Form, Submit } from "@/components/Form";
import { settingAction, holidayAction } from "@/web/actions/admin";
import { AdminNav } from "../AdminNav";

/** FR-M24-03 settings and FR-M24-11 holiday calendar. Changes apply only to records created afterwards. */
export default async function AdminSettingsPage() {
  await requireAdminPage();
  const s = await getSettings();
  const holidays = await db()`select to_char(date, 'YYYY-MM-DD') as date, name, kind from holiday_calendar order by date`;
  const keys = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
  return (
    <div>
      <h1>{t("admin.settingsTitle")}</h1>
      <AdminNav />
      <p className="small muted">{t("admin.settingsHelp")}</p>
      <div className="cols">
        <div className="card table-wrap">
          <table>
            <tbody>
              {keys.map((k) => {
                const v = s[k];
                const isObj = typeof v === "object";
                return (
                  <tr key={k}>
                    <td className="small">
                      <strong>{t(`settingsKeys.${k}`)}</strong>
                      <div className="muted">{k}</div>
                    </td>
                    <td>
                      <Form action={settingAction} className="form-inline">
                        <input type="hidden" name="key" value={k} />
                        {isObj ? (
                          <textarea name="value" defaultValue={JSON.stringify(v)} style={{ minWidth: 260, fontFamily: "monospace", fontSize: 12 }} aria-label={k} />
                        ) : (
                          <input name="value" defaultValue={String(v)} aria-label={k} />
                        )}
                        <Submit variant="secondary">{t("common.save")}</Submit>
                      </Form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("admin.holidays")}</h2>
          <Form action={holidayAction} resetOnOk>
            <div className="form-inline">
              <label>
                {t("events.date")}
                <input type="date" name="date" required />
              </label>
              <label>
                {t("admin.holidayKind")}
                <select name="kind">
                  <option value="national">{t("admin.holidayKinds.national")}</option>
                  <option value="cuti_bersama">{t("admin.holidayKinds.cuti_bersama")}</option>
                </select>
              </label>
            </div>
            <label>
              {t("admin.holidayName")}
              <input name="name" required />
            </label>
            <Submit variant="secondary">{t("admin.addHoliday")}</Submit>
          </Form>
          <ul className="small" style={{ maxHeight: 520, overflowY: "auto" }}>
            {holidays.map((h) => (
              <li key={String(h.date)} className="spread">
                <span>
                  {formatDate(String(h.date))} · {String(h.name)} · {t(`admin.holidayKinds.${String(h.kind)}`)}
                </span>
                <Form action={holidayAction}>
                  <input type="hidden" name="date" value={String(h.date)} />
                  <Submit name="op" value="remove" variant="secondary">{t("common.remove")}</Submit>
                </Form>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
