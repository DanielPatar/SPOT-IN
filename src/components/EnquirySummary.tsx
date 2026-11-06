import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, tzLabel } from "@/lib/time";
import { fileUrl, rp } from "@/web/view";

/** What both sides see about one enquiry. Internal notes are never rendered here. */
export async function EnquirySummary({ e }: { e: Record<string, unknown> }) {
  const tz = String(e.timezone);
  const days = e.days as { date: string; start: string; end: string }[];
  const questions = (e.enquiry_questions ?? []) as { id: string; label: string }[];
  const answers = (e.answers ?? {}) as Record<string, string>;
  const warnings = (e.warnings ?? []) as string[];
  const files = await db()`select f.id, f.filename from event_files ef join files f on f.id = ef.file_id where ef.event_id = ${e.event_id as string}`;
  const open = ["submitted", "viewed"].includes(String(e.status)) && !e.first_response_at;
  return (
    <div className="card">
      <div className="spread">
        <h2 style={{ marginTop: 0 }}>{String(e.event_name)}</h2>
        <span className="badge badge-brand">{t(`enquiryStatus.${String(e.status)}`)}</span>
      </div>
      <dl className="kv">
        <dt>{t("enquiry.organizer")}</dt>
        <dd>{String(e.organizer_name)}</dd>
        <dt>{t("enquiry.venue")}</dt>
        <dd>
          {String(e.space_name)} · {String(e.property_name)}
        </dd>
        <dt>{t("enquiry.dates")}</dt>
        <dd>
          {days.map((d) => (
            <div key={d.date}>
              {t("enquiry.dayLine", { date: formatDate(d.date), start: d.start, end: d.end, tz: tzLabel(tz) })}
            </div>
          ))}
        </dd>
        <dt>{t("enquiry.attendance")}</dt>
        <dd>{String(e.expected_attendance)}</dd>
        <dt>{t("enquiry.type")}</dt>
        <dd>
          {t(`eventTypes.${String(e.event_type)}`)} · {t(`categories.${String(e.category)}`)}
          {e.brand ? ` · ${String(e.brand)}` : ""}
        </dd>
        {e.budget_min || e.budget_max ? (
          <>
            <dt>{t("enquiry.budget")}</dt>
            <dd>
              {rp(e.budget_min)} – {rp(e.budget_max)}
            </dd>
          </>
        ) : null}
        {open ? (
          <>
            <dt>{t("enquiry.replyBy")}</dt>
            <dd>{formatDateTime(e.response_deadline_at as Date, tz)}</dd>
          </>
        ) : null}
        {e.decline_reason ? (
          <>
            <dt>{t("enquiry.declineReason")}</dt>
            <dd>
              {t(`declineReasons.${String(e.decline_reason)}`)}
              {e.decline_note ? ` — ${/^(space|operator)_/.test(String(e.decline_note)) ? t(`autoDecline.${String(e.decline_note)}`) : String(e.decline_note)}` : ""}
            </dd>
          </>
        ) : null}
      </dl>
      {e.event_description ? <p>{String(e.event_description)}</p> : null}
      {warnings.length ? (
        <div className="alert alert-warn small">
          {warnings.map((w) => (
            <div key={w}>{t(`warnings.${w}`)}</div>
          ))}
        </div>
      ) : null}
      {questions.length ? (
        <>
          <h3>{t("enquiry.answers")}</h3>
          <dl className="kv">
            {questions.map((q) => (
              <div key={q.id} style={{ display: "contents" }}>
                <dt>{q.label}</dt>
                <dd>{answers[q.id] ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
      {files.length ? (
        <>
          <h3>{t("enquiry.files")}</h3>
          <ul>
            {files.map((f) => (
              <li key={String(f.id)}>
                <a href={fileUrl(String(f.id))} target="_blank" rel="noreferrer">
                  {String(f.filename)}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
