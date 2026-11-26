import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { requireVenuePage } from "@/web/view";
import { enquiryForActor, markViewed, OPEN_STATUSES, DECLINE_REASONS } from "@/server/enquiries";
import { holdForEnquiry } from "@/server/calendar";
import { savedReplies } from "@/server/messaging";
import { getSettings } from "@/lib/settings";
import { PermissionError, can } from "@/lib/permissions";
import { EnquirySummary } from "@/components/EnquirySummary";
import { Thread } from "@/components/Thread";
import { DealSteps, dealStep } from "@/components/DealSteps";
import { formatRupiah } from "@/lib/money";
import { Notice } from "@/components/kit";
import { Form, Submit } from "@/components/Form";
import { venueEnquiryAction } from "@/web/actions/venue";
import { startQuoteAction } from "@/web/actions/booking";
import Link from "next/link";
import { postMessageAction, editMessageAction, deleteMessageAction, reportMessageAction } from "@/web/actions/messages";

export default async function VenueEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, venue } = await requireVenuePage(`/venue/enquiry/${id}`);
  const a = { userId: session.userId };
  let data;
  try {
    data = await enquiryForActor(a, id);
    if (data.side !== "venue") notFound();
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  await markViewed(a, id);
  const e = data.enquiry;
  const respond = can("venue_operator", venue.role, "enquiry.respond");
  const open = (OPEN_STATUSES as readonly string[]).includes(String(e.status));
  const hold = await holdForEnquiry(id);
  const s = await getSettings();
  const replies = (await savedReplies(a)).map((r) => ({ id: String(r.id), title: String(r.title), body: String(r.body) }));
  const members = await db()`select u.id, u.name from memberships m join users u on u.id = m.user_id where m.org_id = ${venue.orgId}`;
  // Latest quote the organizer can see, for the deal stepper and a price counter-offer (UI v2).
  const [lq] = await db()`select status, revision_comments, totals from quotes where enquiry_id = ${id} and status in ('sent', 'accepted') order by version desc limit 1`;
  const step = dealStep(String(e.status), lq as never);
  const counter = lq?.status === "sent" ? ((lq.revision_comments as { proposedTotal?: number } | null)?.proposedTotal ?? null) : null;
  return (
    <div>
      <DealSteps step={step} side="venue" action={step === "negotiate" && respond ? <Link className="btn btn-primary h-10" href={`/venue/enquiry/${id}/penawaran`}>{t("deal.counterCta")}</Link> : undefined} />
      {counter ? (
        <Notice tone="waiting" className="mb-6" title={t("deal.counterTitle", { amount: formatRupiah(counter) })}>
          {t("deal.counterBody", { current: formatRupiah(Number((lq!.totals as { organizerTotal?: number }).organizerTotal ?? 0)) })}
        </Notice>
      ) : null}
    <div className="cols">
      <div>
        <EnquirySummary e={e} />
        <Thread
          enquiryId={id}
          canSend={respond && open}
          savedReplies={replies}
          postAction={postMessageAction}
          editAction={editMessageAction}
          deleteAction={deleteMessageAction}
          reportAction={reportMessageAction}
          confirmed={false}
        />
      </div>
      <div>
        {respond && open ? (
          <>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{t("venueEnquiry.hold")}</h2>
              {hold ? (
                <Form action={venueEnquiryAction}>
                  <p className="small">{t("venueEnquiry.holdUntil", { at: formatDateTime(hold.expiresAt, String(e.timezone)) })}</p>
                  <input type="hidden" name="enquiryId" value={id} />
                  <Submit name="op" value="releaseHold" variant="secondary">{t("venueEnquiry.releaseHold")}</Submit>
                </Form>
              ) : (
                <Form action={venueEnquiryAction}>
                  <input type="hidden" name="enquiryId" value={id} />
                  <label>
                    {t("venueEnquiry.holdDays", { max: s.tentative_hold_max_days })}
                    <input name="days" type="number" min={1} max={s.tentative_hold_max_days} defaultValue={s.tentative_hold_default_days} />
                  </label>
                  <Submit name="op" value="hold" variant="secondary">{t("venueEnquiry.placeHold")}</Submit>
                </Form>
              )}
            </div>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{t("venueEnquiry.requestInfo")}</h2>
              <Form action={venueEnquiryAction} resetOnOk>
                <input type="hidden" name="enquiryId" value={id} />
                <label>
                  {t("venueEnquiry.question")}
                  <textarea name="text" required />
                </label>
                <Submit name="op" value="requestInfo" variant="secondary">{t("venueEnquiry.send")}</Submit>
              </Form>
            </div>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{t("venueEnquiry.quote")}</h2>
              <p className="small muted">{t("venueEnquiry.quoteHelp")}</p>
              {can("venue_operator", venue.role, "quote.send") ? (
                <form action={startQuoteAction}>
                  <input type="hidden" name="enquiryId" value={id} />
                  <button type="submit" className="btn btn-primary">{t("venueEnquiry.buildQuote")}</button>
                </form>
              ) : (
                <Link href={`/venue/enquiry/${id}/penawaran`}>{t("venueEnquiry.viewQuotes")}</Link>
              )}
            </div>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{t("venueEnquiry.decline")}</h2>
              <Form action={venueEnquiryAction}>
                <input type="hidden" name="enquiryId" value={id} />
                <label>
                  {t("venueEnquiry.reason")}
                  <select name="reason" required defaultValue="">
                    <option value="" disabled>
                      {t("venueEnquiry.chooseReason")}
                    </option>
                    {DECLINE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {t(`declineReasons.${r}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("venueEnquiry.note")}
                  <textarea name="note" />
                </label>
                <Submit name="op" value="decline" variant="danger">{t("venueEnquiry.declineButton")}</Submit>
              </Form>
            </div>
          </>
        ) : null}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("venueEnquiry.internal")}</h2>
          <p className="small muted">{t("venueEnquiry.internalHelp")}</p>
          <Form action={venueEnquiryAction}>
            <input type="hidden" name="enquiryId" value={id} />
            <label>
              {t("venueEnquiry.assignee")}
              <select name="assignee" defaultValue={String(e.assigned_member_id ?? "")}>
                <option value="">{t("venueEnquiry.unassigned")}</option>
                {members.map((m) => (
                  <option key={String(m.id)} value={String(m.id)}>
                    {String(m.name)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("venueEnquiry.notes")}
              <textarea name="notes" defaultValue={String(e.internal_notes ?? "")} />
            </label>
            {respond ? <Submit name="op" value="notes" variant="secondary">{t("common.save")}</Submit> : null}
          </Form>
        </div>
      </div>
    </div>
    </div>
  );
}
