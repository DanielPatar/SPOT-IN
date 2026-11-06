import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatDateTime, formatDate } from "@/lib/time";
import { requireVenuePage } from "@/web/view";
import { venueInbox } from "@/server/enquiries";
import { venueSpaces } from "@/server/listings";

/** Venue inbox with filters: unreplied, awaiting me, by space (FR-M10-07). */
export default async function VenueInboxPage({ searchParams }: { searchParams: Promise<{ view?: string; space?: string }> }) {
  const sp = await searchParams;
  const { session } = await requireVenuePage("/venue/enquiry");
  const a = { userId: session.userId };
  const view = sp.view === "unreplied" || sp.view === "mine" ? sp.view : "all";
  const { rows } = await venueInbox(a, { view, spaceId: sp.space });
  const { spaces } = await venueSpaces(a);
  return (
    <div>
      <h1>{t("inbox.title")}</h1>
      <form className="form-inline" method="get">
        <label>
          {t("inbox.view")}
          <select name="view" defaultValue={view}>
            <option value="all">{t("inbox.all")}</option>
            <option value="unreplied">{t("inbox.unreplied")}</option>
            <option value="mine">{t("inbox.mine")}</option>
          </select>
        </label>
        <label>
          {t("inbox.space")}
          <select name="space" defaultValue={sp.space ?? ""}>
            <option value="">{t("inbox.allSpaces")}</option>
            {spaces.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {String(s.name)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-secondary">{t("inbox.filter")}</button>
      </form>
      <div className="card" style={{ marginTop: 12 }}>
        {rows.length === 0 ? <p className="muted">{t("inbox.empty")}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("inbox.event")}</th>
                <th>{t("inbox.space")}</th>
                <th>{t("inbox.dates")}</th>
                <th>{t("inbox.status")}</th>
                <th>{t("inbox.deadline")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const days = r.days as { date: string }[];
                const overdue = !r.first_response_at && ["submitted", "viewed"].includes(String(r.status));
                return (
                  <tr key={String(r.id)}>
                    <td>
                      <Link href={`/venue/enquiry/${r.id}`}>{String(r.event_name)}</Link>
                      {r.unread ? <span className="badge badge-warn">{t("inbox.new")}</span> : null}
                      <div className="small muted">{String(r.organizer_name)}</div>
                    </td>
                    <td>{String(r.space_name)}</td>
                    <td className="small">
                      {formatDate(days[0]!.date)}
                      {days.length > 1 ? ` – ${formatDate(days[days.length - 1]!.date)}` : ""}
                    </td>
                    <td>
                      <span className="badge">{t(`enquiryStatus.${String(r.status)}`)}</span>
                    </td>
                    <td className="small">{overdue ? formatDateTime(r.response_deadline_at as Date, String(r.timezone)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
