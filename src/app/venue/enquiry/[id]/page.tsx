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
import { Form, Submit } from "@/components/Form";
import { venueEnquiryAction } from "@/web/actions/venue";
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
  return (
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
              <p className="small muted">{t("venueEnquiry.quoteBuild2")}</p>
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
  );
}
