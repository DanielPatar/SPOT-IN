import Link from "next/link";
import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { requireVenuePage } from "@/web/view";
import { venueSpaces, propertyOfVenue } from "@/server/listings";
import { venueInbox } from "@/server/enquiries";
import { Form, Submit } from "@/components/Form";
import { teamAction } from "@/web/actions/venue";
import { venueThisWeek } from "@/server/dashboards";
import { formatRupiah } from "@/lib/money";

export default async function VenueHome() {
  const { session, venue } = await requireVenuePage("/venue");
  const a = { userId: session.userId };
  const { property } = await propertyOfVenue(a);
  const { spaces } = await venueSpaces(a);
  const [org] = await db()`select verification_status, verification_reason, verified_by_spotin_at from organizations where id = ${venue.orgId}`;
  const inbox = await venueInbox(a, { view: "unreplied" });
  const week = await venueThisWeek(a);
  const steps = [
    { key: "profile", done: true },
    { key: "property", done: !!property },
    { key: "pin", done: !!property?.lat },
    { key: "space", done: spaces.length > 0 },
    { key: "submitted", done: spaces.some((s) => s.status !== "draft") },
    { key: "verified", done: org?.verification_status === "verified" },
  ];
  const status = String(org?.verification_status);
  return (
    <div>
      <div className="spread">
        <h1>{venue.displayName}</h1>
        <span className={`badge ${status === "verified" ? "badge-ok" : status === "rejected" ? "badge-danger" : "badge-warn"}`}>{t(`verification.${status}`)}</span>
      </div>
      <ol className="stepper" aria-label={t("venueHome.checklist")}>
        {steps.map((s) => (
          <li key={s.key} className={s.done ? "done" : ""}>
            {s.done ? "✓ " : ""}
            {t(`venueHome.step.${s.key}`)}
          </li>
        ))}
      </ol>
      {status === "rejected" ? <p className="alert alert-error">{t("venueHome.rejected", { reason: String(org?.verification_reason ?? "") })}</p> : null}
      {status === "unsubmitted" && spaces.length > 0 && venue.role === "owner" ? (
        <Form action={teamAction} className="form-inline">
          <input type="hidden" name="orgId" value={venue.orgId} />
          <input type="hidden" name="op" value="submitVerification" />
          <input type="hidden" name="path" value="/venue" />
          <Submit variant="secondary">{t("venueHome.submitVerification")}</Submit>
        </Form>
      ) : null}
      <div className="cols" style={{ marginTop: 16 }}>
        <div>
          <div className="card">
            <div className="spread">
              <h2 style={{ marginTop: 0 }}>{t("venueHome.spaces")}</h2>
              {property ? (
                <Link className="btn btn-primary" href="/venue/ruang/baru">
                  {t("spaces.new")}
                </Link>
              ) : null}
            </div>
            {!property ? (
              <p>
                {t("venueHome.noProperty")} <Link href="/venue/properti">{t("venueHome.addProperty")}</Link>
              </p>
            ) : spaces.length === 0 ? (
              <p className="muted">{t("venueHome.noSpaces")}</p>
            ) : (
              <table>
                <tbody>
                  {spaces.map((s) => (
                    <tr key={String(s.id)}>
                      <td>
                        <Link href={`/venue/ruang/${s.id}`}>{String(s.name)}</Link>
                      </td>
                      <td>{t(`spaceTypes.${String(s.type)}`)}</td>
                      <td>
                        <span className="badge">{t(`spaceStatus.${String(s.status)}`)}</span>
                      </td>
                      <td>
                        <Link href={`/venue/ruang/${s.id}/kalender`}>{t("venueHome.calendar")}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div>
          <div className="card" data-testid="this-week">
            <h2 style={{ marginTop: 0 }}>{t("thisWeek.title")}</h2>
            {!week.events.length && !week.docs.length && !week.balances.length ? <p className="muted">{t("thisWeek.empty")}</p> : null}
            {week.events.length ? <h3>{t("thisWeek.events")}</h3> : null}
            {week.events.map((e) => (
              <p key={String(e.id)} className="small">
                <Link href={`/pemesanan/${e.id}`}>{String(e.event_name)}</Link> · {String(e.space_name)}
                <br />
                <span className="muted">{formatDateTime(e.event_start_at as Date, String(e.timezone))}</span>
              </p>
            ))}
            {week.docs.length ? <h3>{t("thisWeek.docs")}</h3> : null}
            {week.docs.map((d) => (
              <p key={String(d.id)} className="small">
                <Link href={`/pemesanan/${d.booking_id}`}>{String(d.name)}</Link> · {String(d.event_name)}
              </p>
            ))}
            {week.balances.length ? <h3>{t("thisWeek.balances")}</h3> : null}
            {week.balances.map((b) => (
              <p key={String(b.booking_id)} className="small">
                <Link href={`/pemesanan/${b.booking_id}`}>{String(b.event_name)}</Link> · {formatRupiah(Number(b.amount))}
                <br />
                <span className="muted">{t("thisWeek.due", { at: formatDateTime(b.due_at as Date, String(b.timezone)) })}</span>
              </p>
            ))}
            <p className="small">
              <Link href="/venue/pipeline">{t("thisWeek.pipeline")}</Link> · <Link href="/venue/laporan">{t("thisWeek.counts")}</Link>
            </p>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("venueHome.unreplied")}</h2>
            {inbox.rows.length === 0 ? <p className="muted">{t("venueHome.nothingWaiting")}</p> : null}
            {inbox.rows.slice(0, 6).map((r) => (
              <p key={String(r.id)} className="small">
                <Link href={`/venue/enquiry/${r.id}`}>{String(r.event_name)}</Link> · {String(r.space_name)}
                <br />
                <span className="muted">{t("venueHome.replyBy", { deadline: formatDateTime(r.response_deadline_at as Date, String(r.timezone)) })}</span>
              </p>
            ))}
            <Link href="/venue/enquiry">{t("venueHome.openInbox")}</Link>
          </div>
          {property ? (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{String(property.name)}</h2>
              <p className="small muted">{String(property.address_text)}</p>
              <Link href="/venue/properti">{t("venueHome.editProperty")}</Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
