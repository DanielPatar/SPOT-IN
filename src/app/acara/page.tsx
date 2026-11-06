import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/time";
import { requireOrganizerPage } from "@/web/view";
import { organizerEvents } from "@/server/enquiries";

/** Organizer events list with enquiry counts and the next action. */
export default async function EventsPage() {
  const { session } = await requireOrganizerPage("/acara");
  const { events } = await organizerEvents({ userId: session.userId });
  return (
    <div>
      <div className="spread">
        <h1>{t("events.title")}</h1>
        <Link className="btn btn-primary" href="/acara/baru">
          {t("events.new")}
        </Link>
      </div>
      {events.length === 0 ? <p className="muted">{t("events.empty")}</p> : null}
      <div className="grid">
        {events.map((e) => {
          const days = e.days as { date: string }[];
          const next = Number(e.info_requested) > 0 ? "answerVenue" : Number(e.enquiries) === 0 ? "sendEnquiry" : Number(e.open_enquiries) > 0 ? "waitQuotes" : "findMore";
          return (
            <Link className="card space-card" key={String(e.id)} href={`/acara/${e.id}`}>
              <strong>{String(e.name)}</strong>
              <span className="small muted">
                {formatDate(days[0]!.date)}
                {days.length > 1 ? ` – ${formatDate(days[days.length - 1]!.date)}` : ""}
              </span>
              <span className="small">{t("events.counts", { all: Number(e.enquiries), open: Number(e.open_enquiries) })}</span>
              <span className="badge badge-brand">{t(`events.next.${next}`)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
