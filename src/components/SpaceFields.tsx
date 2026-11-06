import { t } from "@/lib/i18n";
import { SPACE_TYPES, ACTIVITIES, LAYOUTS, MAX_QUESTIONS } from "@/server/listings";

type S = Record<string, unknown> | null;

/** Space specification fields (FR-M4-02, FR-M4-03, FR-M4-09). One level of spaces (FR-M4-16). */
export function SpaceFields({ s }: { s: S }) {
  const caps = (s?.capacities ?? {}) as Record<string, number>;
  const acts = (s?.permitted_activities ?? []) as string[];
  const qs = ((s?.enquiry_questions ?? []) as { label: string }[]).map((q) => q.label);
  const questions = [...qs, ...Array(MAX_QUESTIONS - qs.length).fill("")] as string[];
  return (
    <>
      <div className="cols cols-even">
        <fieldset>
          <legend>{t("spaces.basics")}</legend>
          <label>
            {t("spaces.name")}
            <input name="name" required defaultValue={String(s?.name ?? "")} />
          </label>
          <label>
            {t("spaces.type")}
            <select name="type" defaultValue={String(s?.type ?? "atrium")}>
              {SPACE_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`spaceTypes.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("spaces.level")}
            <input name="levelText" defaultValue={String(s?.level_text ?? "")} />
          </label>
          <div className="form-inline">
            <label>
              {t("spaces.area")}
              <input name="areaM2" inputMode="decimal" defaultValue={String(s?.area_m2 ?? "")} />
            </label>
            <label>
              {t("spaces.ceiling")}
              <input name="ceilingHeightM" inputMode="decimal" defaultValue={String(s?.ceiling_height_m ?? "")} />
            </label>
            <label>
              {t("spaces.power")}
              <input name="powerKva" inputMode="numeric" defaultValue={String(s?.power_kva ?? "")} />
            </label>
          </div>
          <label>
            {t("spaces.environment")}
            <select name="environment" defaultValue={String(s?.environment ?? "indoor")}>
              {["indoor", "outdoor", "covered"].map((x) => (
                <option key={x} value={x}>
                  {t(`environment.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" name="wifi" defaultChecked={!!s?.wifi} /> {t("spaces.wifi")}
          </label>
          <label>
            {t("spaces.accessibility")}
            <textarea name="accessibilityNotes" defaultValue={String(s?.accessibility_notes ?? "")} />
          </label>
        </fieldset>
        <fieldset>
          <legend>{t("spaces.capacity")}</legend>
          <div className="form-inline">
            {LAYOUTS.map((l) => (
              <label key={l} style={{ width: 120 }}>
                {t(`layouts.${l}`)}
                <input name={`cap_${l}`} inputMode="numeric" defaultValue={caps[l] ? String(caps[l]) : ""} />
              </label>
            ))}
          </div>
          <p className="small muted">{t("spaces.activities")}</p>
          {ACTIVITIES.map((a) => (
            <label className="check" key={a}>
              <input type="checkbox" name="activities" value={a} defaultChecked={acts.includes(a)} /> {t(`activities.${a}`)}
            </label>
          ))}
          <label>
            {t("spaces.prohibited")}
            <input name="prohibitedCategories" defaultValue={String(s?.prohibited_categories ?? "")} />
          </label>
          <div className="form-inline">
            <label>
              {t("spaces.minDays")}
              <input name="minDays" type="number" min={1} defaultValue={String(s?.min_days ?? 1)} />
            </label>
            <label>
              {t("spaces.maxDays")}
              <input name="maxDays" type="number" min={1} defaultValue={String(s?.max_days ?? "")} />
            </label>
            <label>
              {t("spaces.buffer")}
              <input name="bufferHours" type="number" min={0} defaultValue={String(s?.buffer_hours ?? 0)} />
            </label>
          </div>
          <label>
            {t("spaces.cancellationPolicy")}
            <select name="cancellationPolicy" defaultValue={String(s?.cancellation_policy ?? "moderate")}>
              {["flexible", "moderate", "strict"].map((x) => (
                <option key={x} value={x}>
                  {t(`policies.${x}.name`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("spaces.video")}
            <input name="videoUrl" type="url" placeholder="https://" defaultValue={String(s?.video_url ?? "")} />
          </label>
        </fieldset>
      </div>
      <fieldset>
        <legend>{t("spaces.questions")}</legend>
        <p className="small muted">{t("spaces.questionsHelp", { max: MAX_QUESTIONS })}</p>
        {questions.map((q, i) => (
          <input key={i} name="question" defaultValue={q} aria-label={t("spaces.questionN", { n: i + 1 })} />
        ))}
      </fieldset>
    </>
  );
}
