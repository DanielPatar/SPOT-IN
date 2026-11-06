import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { formatRupiah } from "@/lib/money";
import type { CancellationFigures } from "@/server/lifecycle";
import { fileUrl } from "@/web/view";
import { Form, Submit } from "./Form";
import { MoneyRow, Notice, Panel, Status, type Tone } from "./kit";
import { atRiskAction, cancelBookingAction, noShowAction, reportProblemAction, reviewDocumentAction, uploadDocumentAction } from "@/web/actions/after";

const DOC_TONE: Record<string, Tone> = { not_started: "neutral", submitted: "waiting", changes_requested: "danger", approved: "positive", waived: "neutral" };

/** FR-M17-02/03: document checklist; the organizer uploads, the venue reviews. */
export function ChecklistPanel({ bookingId, items, side, canUpload, canReview, tz }: { bookingId: string; items: (Record<string, unknown> & { versions: Record<string, unknown>[] })[]; side: "organizer" | "venue"; canUpload: boolean; canReview: boolean; tz: string }) {
  return (
    <Panel>
      <h2 className="mt-0">{t("checklistPanel.title")}</h2>
      {items.length === 0 ? <p className="small muted">{t("checklistPanel.empty")}</p> : null}
      <ul className="m-0 grid list-none gap-3 p-0">
        {items.map((d) => {
          const id = String(d.id);
          const st = String(d.status);
          const open = st !== "approved" && st !== "waived";
          return (
            <li key={id} className="rounded-md border border-line p-3" data-testid="doc-item">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="m-0 font-medium">
                  {String(d.name)} {d.mandatory ? <span className="small muted">· {t("checklistPanel.mandatory")}</span> : <span className="small muted">· {t("checklistPanel.optional")}</span>}
                </p>
                <Status tone={DOC_TONE[st] ?? "neutral"}>{t(`docStatus.${st}`)}</Status>
              </div>
              <p className="small muted m-0">{t("checklistPanel.due", { at: formatDateTime(d.due_at as Date, tz) })}</p>
              {d.reviewer_comment ? <p className="small m-0 mt-1">{t("checklistPanel.comment", { comment: String(d.reviewer_comment) })}</p> : null}
              {d.versions.length ? (
                <ul className="small mt-1 mb-0 pl-4">
                  {d.versions.map((v) => (
                    <li key={String(v.version)}>
                      <a href={fileUrl(String(v.file_id))}>{t("checklistPanel.version", { n: Number(v.version), name: String(v.filename) })}</a>
                      <span className="muted"> · {formatDateTime(v.created_at as Date, tz)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {side === "organizer" && canUpload && open ? (
                <Form action={uploadDocumentAction} encType="multipart/form-data" className="form mt-2">
                  <input type="hidden" name="bookingId" value={bookingId} />
                  <input type="hidden" name="documentId" value={id} />
                  <label>
                    {t("checklistPanel.file")}
                    <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required aria-describedby={`hint-${id}`} />
                  </label>
                  <p id={`hint-${id}`} className="small muted m-0">{t("checklistPanel.fileHint")}</p>
                  <Submit variant="secondary">{d.versions.length ? t("checklistPanel.uploadNew") : t("checklistPanel.upload")}</Submit>
                </Form>
              ) : null}
              {side === "venue" && canReview && open ? (
                <Form action={reviewDocumentAction} className="form mt-2">
                  <input type="hidden" name="bookingId" value={bookingId} />
                  <input type="hidden" name="documentId" value={id} />
                  <label>
                    {t("checklistPanel.reviewComment")}
                    <textarea name="comment" rows={2} />
                  </label>
                  <div className="row">
                    {st === "submitted" ? <Submit name="op" value="approve">{t("checklistPanel.approve")}</Submit> : null}
                    {st === "submitted" ? <Submit name="op" value="changes" variant="secondary">{t("checklistPanel.requestChanges")}</Submit> : null}
                    <Submit name="op" value="waive" variant="secondary">{t("checklistPanel.waive")}</Submit>
                  </div>
                </Form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function AtRiskPanel({ bookingId, atRisk, reason, canEdit }: { bookingId: string; atRisk: boolean; reason: string | null; canEdit: boolean }) {
  if (!canEdit && !atRisk) return null;
  return (
    <Panel>
      <h2 className="mt-0">{t("atRisk.title")}</h2>
      {atRisk ? <Notice tone="danger" title={t("atRisk.isAtRisk")}>{reason}</Notice> : <p className="small muted">{t("atRisk.help")}</p>}
      {canEdit ? (
        <Form action={atRiskAction}>
          <input type="hidden" name="bookingId" value={bookingId} />
          {atRisk ? (
            <Submit name="op" value="clear" variant="secondary">{t("atRisk.clear")}</Submit>
          ) : (
            <>
              <label>
                {t("atRisk.reason")}
                <input name="reason" required />
              </label>
              <Submit name="op" value="set" variant="secondary">{t("atRisk.mark")}</Submit>
            </>
          )}
        </Form>
      ) : null}
    </Panel>
  );
}

/** FR-M18-04/05/06: what happens if you cancel today, then a confirmed cancellation. */
export function CancelPanel({ bookingId, side, figures, eventDay }: { bookingId: string; side: "organizer" | "venue"; figures: CancellationFigures | null; eventDay: boolean }) {
  return (
    <Panel>
      <details>
        <summary className="font-semibold">{side === "organizer" ? t("cancelPanel.organizerTitle") : t("cancelPanel.venueTitle")}</summary>
        {side === "organizer" && figures ? (
          <div className="mt-3">
            <p className="small">{t("cancelPanel.tier", { days: figures.daysBefore, pct: figures.tierBps / 100 })}</p>
            <MoneyRow label={t("cancelPanel.venuePaid")} value={formatRupiah(figures.venuePaid)} />
            <MoneyRow label={t("cancel.venueKeeps")} value={formatRupiah(figures.venueKeeps)} />
            <MoneyRow label={t("cancelPanel.feePaid")} sub={figures.feeRefunded ? t("cancelPanel.feeRefunded") : t("cancelPanel.feeKept")} value={formatRupiah(figures.feePaid)} muted />
            <MoneyRow label={t("cancelPanel.youGetBack")} value={formatRupiah(figures.refundTotal)} strong />
            <p className="small muted">{t("cancelPanel.simulated")}</p>
          </div>
        ) : (
          <p className="small mt-3">{t("cancelPanel.venueBody")}</p>
        )}
        <Form action={cancelBookingAction}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="side" value={side} />
          {figures ? <input type="hidden" name="expectedRefund" value={String(figures.refundTotal)} /> : null}
          <label>
            {t("cancelPanel.reason")}
            <textarea name="reason" required rows={2} />
          </label>
          <label className="check">
            <input type="checkbox" name="confirm" required /> {t("cancelPanel.confirm")}
          </label>
          <Submit variant="danger">{t("cancelPanel.submit")}</Submit>
        </Form>
      </details>
      {side === "venue" && eventDay ? (
        <details className="mt-3">
          <summary className="font-semibold">{t("cancelPanel.noShowTitle")}</summary>
          <p className="small mt-2">{t("cancelPanel.noShowBody")}</p>
          <Form action={noShowAction}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <label className="check">
              <input type="checkbox" name="confirm" required /> {t("cancelPanel.noShowConfirm")}
            </label>
            <Submit variant="danger">{t("cancelPanel.noShowSubmit")}</Submit>
          </Form>
        </details>
      ) : null}
    </Panel>
  );
}

/** FR-M16-08/09: post-event window, problem reports and settlement. */
export function AfterEventPanel({ bookingId, booking, problems, tz, canReport }: { bookingId: string; booking: Record<string, unknown>; problems: Record<string, unknown>[]; tz: string; canReport: boolean }) {
  const status = String(booking.status);
  const s = booking.settlement as { venuePayable: number; commission: number; spotinRevenue: number; adjustment: number; releasedAt: string } | null;
  if (!["post_event_window", "on_hold", "settled"].includes(status) && !problems.length) return null;
  return (
    <Panel>
      <h2 className="mt-0">{t("afterEvent.title")}</h2>
      {status === "post_event_window" && booking.post_event_window_ends_at ? (
        <Notice tone="waiting" title={t("afterEvent.windowTitle", { until: formatDateTime(booking.post_event_window_ends_at as Date, tz) })}>
          {t("afterEvent.windowBody", { release: formatDateTime(booking.release_scheduled_at as Date, tz) })}
        </Notice>
      ) : null}
      {status === "on_hold" ? <Notice tone="danger" title={t("afterEvent.onHoldTitle")}>{t("afterEvent.onHoldBody")}</Notice> : null}
      {problems.map((p) => (
        <div key={String(p.id)} className="mt-2 rounded-md border border-line p-3 small">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{t("afterEvent.problemBy", { name: String(p.reporter ?? ""), side: t(`docs.sides.${String(p.side)}`) })}</strong>
            <Status tone={p.status === "open" ? "danger" : "positive"}>{t(`afterEvent.problemStatus.${String(p.status)}`)}</Status>
          </div>
          <p className="m-0 mt-1">{String(p.description)}</p>
          {p.resolution_note ? <p className="m-0 mt-1 muted">{t("afterEvent.resolution", { note: String(p.resolution_note) })}</p> : null}
        </div>
      ))}
      {status === "post_event_window" && canReport ? (
        <details className="mt-3">
          <summary className="font-semibold">{t("afterEvent.report")}</summary>
          <Form action={reportProblemAction} encType="multipart/form-data">
            <input type="hidden" name="bookingId" value={bookingId} />
            <label>
              {t("afterEvent.describe")}
              <textarea name="description" required rows={3} />
            </label>
            <label>
              {t("afterEvent.photos")}
              <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple />
            </label>
            <Submit variant="danger">{t("afterEvent.reportSubmit")}</Submit>
          </Form>
        </details>
      ) : null}
      {s ? (
        <div className="mt-3">
          <Notice tone="positive" title={t("afterEvent.releasedTitle")}>{t("afterEvent.releasedBody", { at: formatDateTime(new Date(s.releasedAt), tz) })}</Notice>
          <MoneyRow label={t("statement.venuePayable")} value={formatRupiah(s.venuePayable)} strong />
          <MoneyRow label={t("statement.commission")} value={formatRupiah(s.commission)} muted />
          {s.adjustment ? <MoneyRow label={t("statement.adjustment")} value={formatRupiah(s.adjustment)} muted /> : null}
        </div>
      ) : null}
    </Panel>
  );
}

export function StatementLinks({ bookingId }: { bookingId: string }) {
  return (
    <p className="small">
      <Link href={`/api/documents/statement/${bookingId}`}>{t("statementLinks.pdf")}</Link> · <Link href={`/api/statement/${bookingId}`}>{t("statementLinks.csv")}</Link>
    </p>
  );
}
