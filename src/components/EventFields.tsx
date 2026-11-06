import { t } from "@/lib/i18n";
import { EVENT_TYPES, CATEGORIES, FACILITIES } from "@/server/enquiries";
import { DayRows } from "./DayRows";

/** Event (project) fields (FR-M9-01) and proposal files (FR-M9-02). */
export function EventFields({ e }: { e?: Record<string, unknown> }) {
  const fac = (e?.required_facilities ?? []) as string[];
  return (
    <>
      <div className="cols cols-even">
        <fieldset>
          <legend>{t("events.basics")}</legend>
          <label>
            {t("events.name")}
            <input name="name" required defaultValue={String(e?.name ?? "")} />
          </label>
          <label>
            {t("events.type")}
            <select name="type" defaultValue={String(e?.type ?? "exhibition")}>
              {EVENT_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`eventTypes.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("events.category")}
            <select name="category" defaultValue={String(e?.category ?? "other")}>
              {CATEGORIES.map((x) => (
                <option key={x} value={x}>
                  {t(`categories.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("events.brand")}
            <input name="brand" defaultValue={String(e?.brand ?? "")} />
          </label>
          <label>
            {t("events.attendance")}
            <input name="attendance" inputMode="numeric" required defaultValue={String(e?.expected_attendance ?? "")} />
          </label>
          <div className="form-inline">
            <label>
              {t("events.budgetMin")}
              <input name="budgetMin" inputMode="numeric" defaultValue={e?.budget_min ? String(e.budget_min) : ""} />
            </label>
            <label>
              {t("events.budgetMax")}
              <input name="budgetMax" inputMode="numeric" defaultValue={e?.budget_max ? String(e.budget_max) : ""} />
            </label>
          </div>
        </fieldset>
        <div className="form">
          <DayRows initial={(e?.days as { date: string; start: string; end: string }[]) ?? undefined} />
          <fieldset>
            <legend>{t("events.facilities")}</legend>
            <div className="row">
              {FACILITIES.map((f) => (
                <label className="check" key={f}>
                  <input type="checkbox" name="facilities" value={f} defaultChecked={fac.includes(f)} /> {t(`facilities.${f}`)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
      <label>
        {t("events.description")}
        <textarea name="description" defaultValue={String(e?.description ?? "")} />
      </label>
      <label>
        {t("events.files")}
        <input type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png" />
        <span className="small muted">{t("events.filesHelp")}</span>
      </label>
    </>
  );
}
