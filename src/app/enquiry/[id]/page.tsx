import { notFound } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { requireOrganizerPage } from "@/web/view";
import { enquiryForActor, OPEN_STATUSES } from "@/server/enquiries";
import { holdForEnquiry } from "@/server/calendar";
import { quotesForEnquiry } from "@/server/quotes";
import { db } from "@/lib/db";
import { QuotePanel } from "@/components/QuotePanel";
import { PermissionError, can } from "@/lib/permissions";
import { EnquirySummary } from "@/components/EnquirySummary";
import { Thread } from "@/components/Thread";
import { Form, Submit } from "@/components/Form";
import { organizerEnquiryAction } from "@/web/actions/organizer";
import { postMessageAction, editMessageAction, deleteMessageAction, reportMessageAction } from "@/web/actions/messages";

export default async function OrganizerEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, organizer } = await requireOrganizerPage(`/enquiry/${id}`);
  let data;
  try {
    data = await enquiryForActor({ userId: session.userId }, id);
    if (data.side !== "organizer") notFound();
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const e = data.enquiry;
  const open = (OPEN_STATUSES as readonly string[]).includes(String(e.status));
  const hold = await holdForEnquiry(id);
  const { quotes } = await quotesForEnquiry({ userId: session.userId }, id);
  const [bk] = await db()`select id from bookings where enquiry_id = ${id} and status <> 'lapsed' order by created_at desc limit 1`;
  return (
    <div className="cols">
      <div>
        <p>
          <Link href={`/acara/${e.event_id}`}>{t("organizerEnquiry.backToEvent")}</Link>
        </p>
        <EnquirySummary e={{ ...e, internal_notes: undefined }} />
        <Thread
          enquiryId={id}
          canSend={open && can("organizer", organizer.role, "message.send")}
          postAction={postMessageAction}
          editAction={editMessageAction}
          deleteAction={deleteMessageAction}
          reportAction={reportMessageAction}
          confirmed={false}
        />
      </div>
      <div>
        {hold ? <p className="alert alert-ok">{t("organizerEnquiry.held", { at: formatDateTime(hold.expiresAt, String(e.timezone)) })}</p> : null}
        <QuotePanel quotes={quotes} tz={String(e.timezone)} canAccept={can("organizer", organizer.role, "quote.accept")} bookingId={bk ? String(bk.id) : null} />
        {quotes.length ? (
          <p className="small">
            <Link href={`/acara/${e.event_id}/bandingkan`}>{t("compare.link")}</Link>
          </p>
        ) : null}
        {open ? (
          <div className="card">
            <Form action={organizerEnquiryAction}>
              <input type="hidden" name="enquiryId" value={id} />
              <Submit name="op" value="withdraw" variant="danger">{t("organizerEnquiry.withdraw")}</Submit>
            </Form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
