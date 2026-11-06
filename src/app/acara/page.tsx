import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/time";
import { requireOrganizerPage } from "@/web/view";
import { organizerEventDashboard } from "@/server/dashboards";
import { BookingStatus } from "@/components/BookingStatus";
import { PageTitle, StateBlock, Status } from "@/components/kit";

/** FR-M22-06: each event with enquiries, quotes, booking status, next action and registrations vs capacity. */
export default async function EventsPage() {
  const { session } = await requireOrganizerPage("/acara");
  const events = await organizerEventDashboard({ userId: session.userId });
  return (
    <div>
      <PageTitle title={t("events.title")} actions={<Link className="btn btn-primary" href="/acara/baru">{t("events.new")}</Link>} />
      {events.length === 0 ? (
        <StateBlock icon={CalendarPlus} title={t("events.emptyTitle")} action={<Link className="btn btn-primary" href="/acara/baru">{t("events.new")}</Link>}>
          {t("events.empty")}
        </StateBlock>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t("eventDash.event")}</th>
                <th scope="col">{t("eventDash.enquiries")}</th>
                <th scope="col">{t("eventDash.booking")}</th>
                <th scope="col">{t("eventDash.registrations")}</th>
                <th scope="col">{t("eventDash.next")}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const days = e.days as { date: string }[];
                return (
                  <tr key={String(e.id)} data-testid="event-row">
                    <td>
                      <Link href={`/acara/${e.id}`} className="font-medium">{String(e.name)}</Link>
                      <div className="small muted">
                        {formatDate(days[0]!.date)}
                        {days.length > 1 ? ` – ${formatDate(days[days.length - 1]!.date)}` : ""}
                      </div>
                    </td>
                    <td className="small">{t("eventDash.counts", { enquiries: Number(e.enquiries), quotes: Number(e.open_quotes) })}</td>
                    <td>{e.booking_status ? <Link href={`/pemesanan/${e.booking_id}`}><BookingStatus status={String(e.booking_status)} /></Link> : <span className="small muted">{t("eventDash.noBooking")}</span>}</td>
                    <td className="small">{e.page_id ? t("eventDash.regs", { taken: Number(e.registered), capacity: Number(e.capacity) }) : "—"}</td>
                    <td><Status tone={e.nextAction === "none" ? "neutral" : "waiting"} icon={false}>{t(`eventDash.actions.${e.nextAction}`)}</Status></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
