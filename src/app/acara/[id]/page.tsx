import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/time";
import { PermissionError } from "@/lib/permissions";
import { requireOrganizerPage, fileUrl, rp } from "@/web/view";
import { eventDetail } from "@/server/enquiries";

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { id } = await params;
  const { sent } = await searchParams;
  const { session } = await requireOrganizerPage(`/acara/${id}`);
  let d;
  try {
    d = await eventDetail({ userId: session.userId }, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const e = d.event;
  const days = e.days as { date: string; start: string; end: string }[];
  return (
    <div>
      {sent ? <p className="alert alert-ok">{t("events.sent", { n: Number(sent) })}</p> : null}
      <div className="spread">
        <h1>{String(e.name)}</h1>
        <div className="row">
          <Link className="btn btn-secondary" href={`/acara/${id}/ubah`}>
            {t("events.edit")}
          </Link>
          <Link className="btn btn-primary" href={`/cari?from=${days[0]!.date}&to=${days[days.length - 1]!.date}&attendance=${Number(e.expected_attendance)}`}>
            {t("events.findSpaces")}
          </Link>
        </div>
      </div>
      <div className="cols">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("events.enquiries")}</h2>
          {d.enquiries.length === 0 ? <p className="muted">{t("events.noEnquiries")}</p> : null}
          <table>
            <tbody>
              {d.enquiries.map((q) => (
                <tr key={String(q.id)}>
                  <td>
                    <Link href={`/enquiry/${q.id}`}>{String(q.space_name)}</Link>
                    <div className="small muted">{String(q.property_name)}</div>
                  </td>
                  <td>
                    <span className="badge">{t(`enquiryStatus.${String(q.status)}`)}</span>
                  </td>
                  <td className="small">
                    {["submitted", "viewed"].includes(String(q.status)) ? t("events.venueReplyBy", { at: formatDateTime(q.response_deadline_at as Date, String(q.timezone)) }) : null}
                    {q.decline_reason ? t(`declineReasons.${String(q.decline_reason)}`) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>{t("events.dates")}</dt>
            <dd>
              {days.map((x) => (
                <div key={x.date}>
                  {formatDate(x.date)} {x.start}–{x.end}
                </div>
              ))}
            </dd>
            <dt>{t("events.attendance")}</dt>
            <dd>{Number(e.expected_attendance)}</dd>
            <dt>{t("events.type")}</dt>
            <dd>{t(`eventTypes.${String(e.type)}`)}</dd>
            {e.budget_max ? (
              <>
                <dt>{t("events.budget")}</dt>
                <dd>
                  {rp(e.budget_min)} – {rp(e.budget_max)}
                </dd>
              </>
            ) : null}
          </dl>
          {d.files.length ? (
            <ul className="small">
              {d.files.map((f) => (
                <li key={String(f.id)}>
                  <a href={fileUrl(String(f.id))}>{String(f.filename)}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
