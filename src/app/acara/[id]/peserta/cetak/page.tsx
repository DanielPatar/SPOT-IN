import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatWeekdayDate } from "@/lib/time";
import { requireOrganizerPage } from "@/web/view";
import { attendees } from "@/server/event-pages";
import { PrintButton } from "@/components/PrintButton";

/** FR-M32-12: printable list per session (name, status, blank tick column) as a fallback. */
export default async function PrintAttendees({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ session?: string }> }) {
  const { id } = await params;
  const { session: sessionId } = await searchParams;
  const { session, organizer } = await requireOrganizerPage(`/acara/${id}/peserta/cetak`);
  const [pg] = await db()`select id from event_pages where event_id = ${id} and organizer_org_id = ${organizer.orgId}`;
  if (!pg) notFound();
  const { page, rows } = await attendees({ userId: session.userId }, String(pg.id), { sessionId });
  const byDay = new Map<string, Record<string, unknown>[]>();
  for (const r of rows.filter((x) => x.status !== "cancelled")) {
    const d = r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day);
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  return (
    <div className="print-sheet">
      <div className="no-print mb-3">
        <PrintButton />
      </div>
      <h1>{String(page.title)}</h1>
      <p className="small">{t("pilot.eventLabel")}</p>
      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="mb-6 break-after-page">
          <h2>{formatWeekdayDate(day)}</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">{t("printList.no")}</th>
                <th scope="col">{t("attendees.csv.name")}</th>
                <th scope="col">{t("attendees.csv.pass")}</th>
                <th scope="col">{t("attendees.csv.status")}</th>
                <th scope="col">{t("printList.tick")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={String(r.id)} data-testid="print-row">
                  <td>{i + 1}</td>
                  <td>{String(r.name)}</td>
                  <td>{String(r.number ?? "")}</td>
                  <td>{t(`attendees.status.${r.pass_status === "checked_in" ? "checked_in" : String(r.status)}`)}</td>
                  <td style={{ width: 80 }}><span className="tick-box" aria-hidden="true" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
