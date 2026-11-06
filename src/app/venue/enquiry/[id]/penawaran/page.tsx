import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { formatRupiah } from "@/lib/money";
import { PermissionError, can } from "@/lib/permissions";
import { requireVenuePage } from "@/web/view";
import { enquiryForActor } from "@/server/enquiries";
import { quotesForEnquiry, conflicts, enquiryRanges } from "@/server/quotes";
import { db, num } from "@/lib/db";
import type { PricingSnapshot, QuoteLine } from "@/lib/quote-math";
import { Form, Submit } from "@/components/Form";
import { QuoteEditor } from "@/components/QuoteEditor";
import { Notice, PageTitle, Panel, Status, MoneyRow } from "@/components/kit";
import { quoteDraftAction, quoteApprovalAction } from "@/web/actions/booking";

const tone = (s: string) => (s === "sent" || s === "accepted" ? "positive" : s === "pending_approval" || s === "draft" ? "waiting" : s === "declined" || s === "expired" ? "danger" : "neutral") as "positive";

/** Quote builder for the venue (FR-M12-01..05, FR-M12-13, FR-M2-06). */
const DONE = ["sent", "sentForApproval", "approvedSent", "returned"];

export default async function QuoteBuilderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const { id } = await params;
  const { done } = await searchParams;
  const { session, venue } = await requireVenuePage(`/venue/enquiry/${id}/penawaran`);
  const a = { userId: session.userId };
  let e;
  try {
    const r = await enquiryForActor(a, id);
    if (r.side !== "venue") notFound();
    e = r.enquiry;
  } catch (err) {
    if (err instanceof PermissionError) notFound();
    throw err;
  }
  const { quotes } = await quotesForEnquiry(a, id);
  const draft = quotes.find((q) => q.status === "draft" || q.status === "pending_approval");
  const latestSent = quotes.find((q) => q.status === "sent");
  const revision = latestSent?.revision_comments as { general?: string; lines?: Record<string, string> } | null | undefined;
  const [ctx] = await db()`select e.days, p.timezone, coalesce(r.unit, 'day') as unit, q.space_id, o.approval_threshold, o.verification_status
    from enquiries q join events e on e.id = q.event_id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    join organizations o on o.id = p.operator_id left join rate_cards r on r.space_id = s.id where q.id = ${id}`;
  const c = await conflicts(String(ctx!.space_id), enquiryRanges(ctx!), id);
  const held = c.some((x) => x.kind === "tentative_hold" || x.kind === "booking_hold");
  const booked = c.some((x) => x.kind === "booked" || x.kind === "block");
  const tz = String(e.timezone);
  // Line ids carry over from the sent version into the new draft, so comments map directly.
  const draftComments = revision?.lines ?? {};
  const canSend = can("venue_operator", venue.role, "quote.send");
  const isOwner = venue.role === "owner";
  const threshold = ctx!.approval_threshold == null ? null : num(ctx!.approval_threshold);
  const schedule = (draft?.payment_schedule ?? {}) as { mode?: string; depositBps?: number; depositDays?: number; balanceDaysBefore?: number };
  return (
    <div>
      <PageTitle back={{ href: `/venue/enquiry/${id}`, label: t("quoteBuilder.back") }} title={t("quoteBuilder.title", { event: String(e.event_name) })} description={t("quoteBuilder.intro", { space: String(e.space_name) })} />
      <div className="mb-4 grid gap-3">
        {done && DONE.includes(done) ? <Notice tone="positive" className="alert-ok" title={t(`quoteBuilder.${done}`)} /> : null}
        {ctx!.verification_status !== "verified" ? <Notice tone="danger" title={t("quoteBuilder.unverifiedTitle")}>{t("listings.operatorNotVerified")}</Notice> : null}
        {booked ? <Notice tone="danger" title={t("quoteBuilder.bookedTitle")}>{t("quoteBuilder.bookedBody")}</Notice> : null}
        {!booked && held ? <Notice tone="waiting" title={t("quoteBuilder.backupTitle")}>{t("quoteBuilder.backupBody")}</Notice> : null}
        {revision ? (
          <Notice tone="waiting" title={t("quoteBuilder.revisionTitle", { version: Number(latestSent!.version) })}>
            {revision.general ? <p className="m-0">{revision.general}</p> : null}
            {Object.keys(revision.lines ?? {}).length ? <p className="m-0">{t("quoteBuilder.revisionLinesHint")}</p> : null}
          </Notice>
        ) : null}
        {threshold !== null && !isOwner ? <Notice tone="info" title={t("quoteBuilder.thresholdTitle", { amount: formatRupiah(threshold) })}>{t("quoteBuilder.thresholdBody")}</Notice> : null}
      </div>

      {draft?.status === "pending_approval" ? (
        <Panel className="mb-4">
          <h2 className="mt-0">{t("quoteBuilder.pendingTitle")}</h2>
          <MoneyRow label={t("quoteBuilder.venueTotal")} value={formatRupiah(draft.totals.venueTotal)} strong />
          {isOwner ? (
            <div className="cols-even grid gap-4 md:grid-cols-2">
              <Form action={quoteApprovalAction}>
                <input type="hidden" name="quoteId" value={draft.id} />
                <input type="hidden" name="enquiryId" value={id} />
                <p className="small muted">{t("quoteBuilder.approveHint")}</p>
                <Submit name="op" value="approve">{t("quoteBuilder.approveAndSend")}</Submit>
              </Form>
              <Form action={quoteApprovalAction}>
                <input type="hidden" name="quoteId" value={draft.id} />
                <input type="hidden" name="enquiryId" value={id} />
                <label>
                  {t("quoteBuilder.returnComment")}
                  <textarea name="comment" required />
                </label>
                <Submit name="op" value="return" variant="secondary">{t("quoteBuilder.returnToDraft")}</Submit>
              </Form>
            </div>
          ) : (
            <Notice tone="waiting" title={t("quoteBuilder.waitingOwner")}>{t("quoteBuilder.waitingOwnerBody")}</Notice>
          )}
        </Panel>
      ) : null}

      {draft?.status === "draft" && canSend ? (
        <Form action={quoteDraftAction}>
          <input type="hidden" name="quoteId" value={draft.id} />
          <input type="hidden" name="enquiryId" value={id} />
          {draft.approval_comment ? <Notice tone="waiting" title={t("quoteBuilder.returnedTitle")}>{String(draft.approval_comment)}</Notice> : null}
          <h2>{t("quoteBuilder.lines", { version: Number(draft.version) })}</h2>
          <QuoteEditor initial={draft.lines as QuoteLine[]} pricing={draft.pricing_snapshot as unknown as PricingSnapshot} revisionComments={draftComments} />
          <h2>{t("quoteBuilder.payment")}</h2>
          <fieldset>
            <label className="check">
              <input type="radio" name="mode" value="split" defaultChecked={schedule.mode !== "full"} /> {t("quoteBuilder.modeSplit")}
            </label>
            <div className="form-inline">
              <label style={{ width: 140 }}>
                {t("quoteBuilder.depositPct")}
                <input name="depositPct" inputMode="decimal" defaultValue={String((schedule.depositBps ?? 5000) / 100)} />
              </label>
              <label style={{ width: 200 }}>
                {t("quoteBuilder.depositDays")}
                <input name="depositDays" type="number" min={1} max={7} defaultValue={schedule.depositDays ?? 3} />
              </label>
              <label style={{ width: 220 }}>
                {t("quoteBuilder.balanceDaysBefore")}
                <input name="balanceDaysBefore" type="number" min={3} defaultValue={schedule.balanceDaysBefore ?? 14} />
              </label>
            </div>
            <label className="check">
              <input type="radio" name="mode" value="full" defaultChecked={schedule.mode === "full"} /> {t("quoteBuilder.modeFull")}
            </label>
          </fieldset>
          <h2>{t("quoteBuilder.terms")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              {t("quoteBuilder.validityDays")}
              <input name="validityDays" type="number" min={1} max={60} defaultValue={Number(draft.validity_days)} />
            </label>
            <label>
              {t("spaces.cancellationPolicy")}
              <select name="cancellationPolicy" defaultValue={String(draft.cancellation_policy)}>
                {["flexible", "moderate", "strict"].map((p) => (
                  <option key={p} value={p}>
                    {t(`policies.${p}.name`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("quote.inclusions")}
              <textarea name="inclusions" defaultValue={String(draft.inclusions ?? "")} />
            </label>
            <label>
              {t("quote.exclusions")}
              <textarea name="exclusions" defaultValue={String(draft.exclusions ?? "")} />
            </label>
          </div>
          <label>
            {t("quote.specialTerms")}
            <textarea name="specialTerms" defaultValue={String(draft.special_terms ?? "")} />
          </label>
          <div className="row">
            <Submit name="op" value="send">{held ? t("quoteBuilder.sendBackup") : t("quoteBuilder.send")}</Submit>
            <Submit name="op" value="save" variant="secondary">{t("quoteBuilder.saveDraft")}</Submit>
          </div>
        </Form>
      ) : null}

      <h2>{t("quoteBuilder.versions")}</h2>
      {quotes.length === 0 ? <p className="muted">{t("quoteBuilder.noVersions")}</p> : null}
      <div className="table-wrap">
        <table>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td>{t("quoteBuilder.version", { n: Number(q.version) })}</td>
                <td>
                  <Status tone={tone(q.status)}>{t(`quoteStatus.${q.status}`)}</Status>
                  {q.is_backup && q.status === "sent" ? <span className="ml-1"><Status tone="waiting">{t("quoteStatus.backup")}</Status></span> : null}
                </td>
                <td className="num">{formatRupiah(q.totals.organizerTotal)}</td>
                <td className="small muted">{q.valid_until ? t("quoteBuilder.validUntil", { at: formatDateTime(q.valid_until as Date, tz) }) : ""}</td>
                <td>{q.status !== "draft" && q.status !== "pending_approval" ? <Link href={`/api/documents/quote/${q.id}`}>{t("quoteBuilder.pdf")}</Link> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
