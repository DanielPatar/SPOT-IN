"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Notice } from "./kit";
import { Submit, type ActionState } from "./Form";

type Q = { id: string; kind: "text" | "choice" | "yesno"; label: string; options?: string[] };
type Session = { day: string; label: string; start: string; end: string; bookedStart: string; bookedEnd: string; capacity: number | ""; taken: number };

/**
 * Event page editor (FR-M28-01..09, FR-M30-02). When a change would email registrants the
 * server answers with the count and the form asks before saving ("N orang akan diberi tahu").
 */
export function PageEditorForm({
  action,
  eventId,
  initial,
  sessions,
  categories,
  maxCapacity,
  isDraft,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  eventId: string;
  initial: { title: string; summary: string; description: string; category: string; ageNote: string; closeMode: string; questions: Q[]; hasCover: boolean };
  sessions: Session[];
  categories: { value: string; label: string }[];
  maxCapacity: number;
  isDraft: boolean;
}) {
  const t = useTranslations("pageEditor");
  const tc = useTranslations("common");
  const [state, formAction] = useActionState(action, {});
  const [questions, setQuestions] = useState<Q[]>(initial.questions);
  const [summary, setSummary] = useState(initial.summary);
  const needsConfirm = Number(state.data?.needsConfirm ?? 0);
  const v = (state.data?.values ?? {}) as Record<string, string>;
  const val = (k: string, d: string | number) => (k in v ? v[k]! : d);
  const setQ = (i: number, patch: Partial<Q>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  return (
    <form action={formAction} className="form" encType="multipart/form-data" key={needsConfirm ? "confirm" : "edit"}>
      {state.error ? (
        <Notice tone="danger" live title={tc("errorTitle")} className="alert-error">
          {state.error}
        </Notice>
      ) : null}
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      <label>
        {t("title")}
        <input name="title" defaultValue={val("title", initial.title)} required maxLength={120} />
      </label>
      <label>
        {t("summary")}
        <textarea name="summary" rows={2} maxLength={160} required value={summary} onChange={(e) => setSummary(e.target.value)} aria-describedby="summary-hint" />
      </label>
      <p id="summary-hint" className="small muted m-0">
        {t("summaryHint", { n: 160 - summary.length })}
      </p>
      <label>
        {t("description")}
        <textarea name="description" rows={5} defaultValue={val("description", initial.description)} />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          {t("category")}
          <select name="category" defaultValue={val("category", initial.category)}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("ageNote")}
          <input name="ageNote" defaultValue={val("ageNote", initial.ageNote)} placeholder={t("ageNotePlaceholder")} />
        </label>
      </div>
      <label>
        {t("cover")}
        <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" required={!initial.hasCover} aria-describedby="cover-hint" />
      </label>
      <p id="cover-hint" className="small muted m-0">
        {initial.hasCover ? t("coverReplace") : t("coverRequired")}
      </p>

      <h2>{t("sessions")}</h2>
      <p className="small muted m-0">{t("sessionsHint", { max: maxCapacity })}</p>
      {sessions.map((s) => (
        <fieldset key={s.day}>
          <legend>{s.label}</legend>
          <input type="hidden" name="sessionDay" value={s.day} />
          <div className="grid gap-2 sm:grid-cols-3">
            <label>
              {t("start")}
              <input type="time" name={`start_${s.day}`} defaultValue={val(`start_${s.day}`, s.start)} min={s.bookedStart} max={s.bookedEnd} required />
            </label>
            <label>
              {t("end")}
              <input type="time" name={`end_${s.day}`} defaultValue={val(`end_${s.day}`, s.end)} min={s.bookedStart} max={s.bookedEnd} required />
            </label>
            <label>
              {t("capacity")}
              <input type="number" name={`capacity_${s.day}`} defaultValue={val(`capacity_${s.day}`, s.capacity)} min={Math.max(1, s.taken)} max={maxCapacity} required />
            </label>
          </div>
          <p className="small muted m-0">{t("bookedHours", { start: s.bookedStart, end: s.bookedEnd, taken: s.taken })}</p>
        </fieldset>
      ))}

      <h2>{t("questions")}</h2>
      <Notice tone="info" title={t("sensitiveTitle")}>
        {t("sensitiveBody")}
      </Notice>
      {questions.map((q, i) => (
        <fieldset key={q.id}>
          <legend>{t("questionN", { n: i + 1 })}</legend>
          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <label>
              {t("questionKind")}
              <select value={q.kind} onChange={(e) => setQ(i, { kind: e.target.value as Q["kind"] })}>
                <option value="text">{t("kinds.text")}</option>
                <option value="choice">{t("kinds.choice")}</option>
                <option value="yesno">{t("kinds.yesno")}</option>
              </select>
            </label>
            <label>
              {t("questionLabel")}
              <input value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} required />
            </label>
          </div>
          {q.kind === "choice" ? (
            <label>
              {t("options")}
              <input value={(q.options ?? []).join(", ")} onChange={(e) => setQ(i, { options: e.target.value.split(",").map((x) => x.trim()) })} />
            </label>
          ) : null}
          <button type="button" className="link-btn small inline-flex items-center gap-1" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            {t("removeQuestion")}
          </button>
        </fieldset>
      ))}
      {questions.length < 3 ? (
        <button type="button" className="btn btn-secondary w-fit" onClick={() => setQuestions([...questions, { id: `q${Date.now()}`, kind: "text", label: "" }])}>
          <Plus className="size-4" aria-hidden="true" />
          {t("addQuestion")}
        </button>
      ) : (
        <p className="small muted">{t("maxQuestions")}</p>
      )}

      <h2>{t("closing")}</h2>
      <fieldset>
        <legend className="sr-only">{t("closing")}</legend>
        <label className="check">
          <input type="radio" name="closeMode" value="session_start" defaultChecked={val("closeMode", initial.closeMode) !== "manual"} /> {t("closeAtStart")}
        </label>
        <label className="check">
          <input type="radio" name="closeMode" value="manual" defaultChecked={val("closeMode", initial.closeMode) === "manual"} /> {t("closeManual")}
        </label>
      </fieldset>

      {needsConfirm ? (
        <div role="alertdialog" aria-labelledby="confirm-title" className="rounded-lg border-2 border-warm bg-warm-soft p-4">
          <p id="confirm-title" className="m-0 font-semibold">
            {t("confirmTitle", { n: needsConfirm })}
          </p>
          <p className="small m-0 mt-1">{t("confirmBody")}</p>
          <div className="row mt-3">
            <Submit name="confirmNotify" value="1">{t("confirmSave")}</Submit>
            <a className="btn btn-secondary" href={`/acara/${eventId}/halaman`}>
              {t("confirmCancel")}
            </a>
          </div>
        </div>
      ) : (
        <div className="row">
          {isDraft ? <Submit name="op" value="publish">{t("publish")}</Submit> : null}
          <Submit name="op" value="save" variant={isDraft ? "secondary" : "primary"}>{isDraft ? t("saveDraft") : t("saveChanges")}</Submit>
        </div>
      )}
    </form>
  );
}
