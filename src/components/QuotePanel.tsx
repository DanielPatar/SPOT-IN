import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { formatRupiah } from "@/lib/money";
import { lineAmount } from "@/lib/quote-math";
import { acceptBlocker, diffQuotes, type QuoteRow } from "@/server/quotes";
import { Form, Submit } from "./Form";
import { MoneyRow, Notice, Panel, Status } from "./kit";
import { organizerQuoteAction } from "@/web/actions/booking";

/** The organizer's view of the latest quote on an enquiry (FR-M12-06..10, FR-M12-13, FR-M13-01). */
export async function QuotePanel({ quotes, tz, canAccept, bookingId }: { quotes: QuoteRow[]; tz: string; canAccept: boolean; bookingId?: string | null }) {
  const latest = quotes[0];
  if (!latest) {
    return (
      <Panel>
        <h2 className="mt-0">{t("quoteView.title")}</h2>
        <p className="small muted">{t("quoteView.none")}</p>
      </Panel>
    );
  }
  const prev = quotes.find((q) => Number(q.version) < Number(latest.version) && q.status !== "withdrawn");
  const diff = prev ? diffQuotes(prev, latest).filter((d) => d.change !== "same") : [];
  const blocker = await acceptBlocker(latest);
  const s = latest.payment_schedule as unknown as { mode: string; depositBps: number; depositDays: number; balanceDaysBefore: number };
  const tot = latest.totals;
  const deposit = s.mode === "full" ? tot.organizerTotal : null;
  const revision = latest.revision_comments as { general?: string } | null;
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0">{t("quoteView.titleVersion", { n: Number(latest.version) })}</h2>
        <Status tone={latest.status === "sent" ? "positive" : latest.status === "accepted" ? "positive" : "neutral"}>{t(`quoteStatus.${latest.status}`)}</Status>
      </div>
      {latest.valid_until && latest.status === "sent" ? <p className="small muted">{t("quoteView.validUntil", { at: formatDateTime(latest.valid_until as Date, tz) })}</p> : null}

      {latest.status === "accepted" && bookingId ? (
        <Notice tone="positive" title={t("quoteView.acceptedTitle")} action={<Link className="btn btn-primary" href={`/pemesanan/${bookingId}`}>{t("quoteView.openWorkspace")}</Link>}>
          {t("quoteView.acceptedBody")}
        </Notice>
      ) : null}
      {latest.is_backup && blocker === "quotes.datesHeld" ? <Notice tone="waiting" title={t("quoteView.backupTitle")}>{t("quoteView.backupBody")}</Notice> : null}
      {latest.is_backup && latest.status === "sent" && !blocker ? <Notice tone="positive" title={t("quoteView.backupFreeTitle")}>{t("quoteView.backupFreeBody")}</Notice> : null}
      {blocker === "quotes.expired" ? <Notice tone="danger" title={t("quoteView.expiredTitle")}>{latest.expire_reason === "dates_booked" ? t("quoteView.expiredBooked") : t("quoteView.expiredBody")}</Notice> : null}
      {blocker === "quotes.eventChanged" ? <Notice tone="waiting" title={t("quoteView.eventChangedTitle")}>{t("quoteView.eventChangedBody")}</Notice> : null}
      {blocker === "quotes.datesBookedOrganizer" ? <Notice tone="danger" title={t("quoteView.takenTitle")}>{t("quoteView.takenBody")}</Notice> : null}
      {latest.status === "declined" ? <Notice tone="neutral" title={t("quoteView.declinedTitle")}>{String(latest.decline_reason ?? "")}</Notice> : null}
      {revision && latest.status === "sent" ? <Notice tone="waiting" title={t("quoteView.revisionSentTitle")}>{t("quoteView.revisionSentBody")}</Notice> : null}

      <div className="mt-3">
        {latest.lines.map((l) => (
          <MoneyRow key={l.id} label={l.label} sub={l.discount ? t("quoteView.discount", { amount: formatRupiah(l.discount) }) : undefined} value={formatRupiah(lineAmount(l))} />
        ))}
        <hr />
        <MoneyRow label={t("quoteBuilder.rentalAndAddOns")} value={formatRupiah(tot.rentalAndAddOns)} />
        {tot.serviceCharge ? <MoneyRow label={t("quoteBuilder.serviceCharge")} value={formatRupiah(tot.serviceCharge)} /> : null}
        <MoneyRow label={tot.ppn ? t("quoteBuilder.ppn") : t("quoteBuilder.noPpn")} value={formatRupiah(tot.ppn)} muted={!tot.ppn} />
        <MoneyRow label={t("quoteBuilder.venueTotal")} value={formatRupiah(tot.venueTotal)} />
        <MoneyRow label={t("quoteBuilder.spotinFee")} sub={t("quoteBuilder.spotinFeeHint")} value={formatRupiah(tot.organizerFee)} muted />
        <MoneyRow label={t("quoteView.youPay")} value={formatRupiah(tot.organizerTotal)} strong />
        <p className="small muted">
          {s.mode === "full" ? t("quoteView.scheduleFull", { amount: formatRupiah(deposit!) }) : t("quoteView.scheduleSplit", { pct: s.depositBps / 100, days: s.depositDays, before: s.balanceDaysBefore })}
        </p>
        <p className="small muted">{t("quoteView.policy", { policy: t(`policies.${String(latest.cancellation_policy)}.name`) })}</p>
        {latest.inclusions ? <p className="small"><strong>{t("quote.inclusions")}:</strong> {String(latest.inclusions)}</p> : null}
        {latest.exclusions ? <p className="small"><strong>{t("quote.exclusions")}:</strong> {String(latest.exclusions)}</p> : null}
        {latest.special_terms ? <p className="small"><strong>{t("quote.specialTerms")}:</strong> {String(latest.special_terms)}</p> : null}
        <p className="small">
          <Link href={`/api/documents/quote/${latest.id}`}>{t("quoteView.pdf")}</Link>
        </p>
      </div>

      {diff.length ? (
        <details className="mt-2" open>
          <summary>{t("quoteView.changedFrom", { n: Number(prev!.version) })}</summary>
          {diff.map((d) => (
            <MoneyRow
              key={d.label}
              changed={d.change === "same" ? undefined : d.change}
              label={`${d.label} · ${t(`quoteView.change.${d.change}`)}`}
              value={d.change === "removed" ? formatRupiah(d.before ?? 0) : d.change === "changed" ? `${formatRupiah(d.before ?? 0)} → ${formatRupiah(d.after ?? 0)}` : formatRupiah(d.after ?? 0)}
            />
          ))}
        </details>
      ) : null}

      {latest.status === "sent" && canAccept ? (
        <div className="mt-4 grid gap-4">
          {!blocker ? (
            <Form action={organizerQuoteAction}>
              <input type="hidden" name="quoteId" value={latest.id} />
              <input type="hidden" name="enquiryId" value={String(latest.enquiry_id)} />
              <label className="check">
                <input type="checkbox" name="pilotTerms" required /> {t("quoteView.pilotTerms")}
              </label>
              <p className="small muted">{t("quoteView.acceptHint")}</p>
              <Submit name="op" value="accept">{t("quoteView.accept")}</Submit>
            </Form>
          ) : null}
          <details>
            <summary>{t("quoteView.revision")}</summary>
            <Form action={organizerQuoteAction}>
              <input type="hidden" name="quoteId" value={latest.id} />
              <input type="hidden" name="enquiryId" value={String(latest.enquiry_id)} />
              <label>
                {t("quoteView.revisionGeneral")}
                <textarea name="general" />
              </label>
              {latest.lines.map((l) => (
                <label key={l.id}>
                  {t("quoteView.revisionLine", { label: l.label })}
                  <input name={`line_${l.id}`} />
                </label>
              ))}
              <Submit name="op" value="revision" variant="secondary">{t("quoteView.sendRevision")}</Submit>
            </Form>
          </details>
          <details>
            <summary>{t("quoteView.decline")}</summary>
            <Form action={organizerQuoteAction}>
              <input type="hidden" name="quoteId" value={latest.id} />
              <input type="hidden" name="enquiryId" value={String(latest.enquiry_id)} />
              <label>
                {t("quoteView.declineReason")}
                <textarea name="reason" required />
              </label>
              <Submit name="op" value="decline" variant="danger">{t("quoteView.declineSubmit")}</Submit>
            </Form>
          </details>
        </div>
      ) : null}
    </Panel>
  );
}
