import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatWeekdayDate, formatTime } from "@/lib/time";
import { PermissionError, can } from "@/lib/permissions";
import { requireOrganizerPage } from "@/web/view";
import { attendees } from "@/server/event-pages";
import { Form, Submit } from "@/components/Form";
import { Notice, PageTitle, StateBlock, Status } from "@/components/kit";
import { checkInAction, organizerCancelRegistrationAction } from "@/web/actions/after";

const FILTERS = ["all", "not_checked_in", "checked_in", "cancelled"] as const;

/** Attendee list with search, status filter, check-in, cancel with message, CSV (FR-M30-11, FR-M32-01, FR-M32-12). */
export default async function AttendeesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; status?: string; session?: string; done?: string; who?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { session, organizer } = await requireOrganizerPage(`/acara/${id}/peserta`);
  const [pg] = await db()`select id from event_pages where event_id = ${id} and organizer_org_id = ${organizer.orgId}`;
  if (!pg) notFound();
  let data;
  try {
    data = await attendees({ userId: session.userId }, String(pg.id), { q: sp.q, status: sp.status, sessionId: sp.session });
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const { page, rows } = data;
  const sessions = await db()`select s.id, s.day, s.taken, s.capacity, pr.timezone from event_sessions s join event_pages ep on ep.id = s.page_id join bookings b on b.id = ep.booking_id join spaces sp on sp.id = b.space_id join properties pr on pr.id = sp.property_id where s.page_id = ${pg.id as string} order by s.day`;
  const tz = String(sessions[0]?.timezone ?? "Asia/Jakarta");
  const keep = Object.entries({ q: sp.q, status: sp.status, session: sp.session }).filter(([, v]) => v) as [string, string][];
  const back = `/acara/${id}/peserta${keep.length ? `?${new URLSearchParams(keep).toString()}` : ""}`;
  const isOwner = can("organizer", organizer.role, "attendees.export");
  const dayOf = (d: unknown) => formatWeekdayDate(d instanceof Date ? d.toISOString().slice(0, 10) : String(d));
  return (
    <div>
      <PageTitle
        back={{ href: `/acara/${id}/halaman`, label: t("attendeeList.back") }}
        title={t("attendeeList.title")}
        description={String(page.title)}
        actions={
          <div className="row">
            <Link className="btn btn-secondary" href={`/acara/${id}/peserta/cetak${sp.session ? `?session=${sp.session}` : ""}`}>{t("attendeeList.print")}</Link>
            {isOwner ? <a className="btn btn-secondary" href={`/api/attendees/${pg.id}`}>{t("attendeeList.csv")}</a> : null}
          </div>
        }
      />
      {sp.done === "checkin" || sp.done === "undo" ? <Notice tone="positive" className="alert-ok mb-3" title={t(sp.done === "undo" ? "checkinPanel.undone" : "checkinPanel.done", { name: String(sp.who ?? "") })} /> : null}
      {!isOwner ? <p className="small muted">{t("attendeeList.csvOwnerOnly")}</p> : null}
      <p className="small">
        {sessions.map((x) => t("attendeeList.sessionCount", { day: dayOf(x.day), taken: Number(x.taken), capacity: Number(x.capacity) })).join(" · ")}
      </p>
      <form method="get" className="form-inline card mb-4" role="search">
        <label style={{ flex: 1 }}>
          {t("attendeeList.search")}
          <input name="q" defaultValue={sp.q ?? ""} placeholder={t("attendeeList.searchPlaceholder")} />
        </label>
        <label>
          {t("attendeeList.session")}
          <select name="session" defaultValue={sp.session ?? ""}>
            <option value="">{t("attendeeList.allSessions")}</option>
            {sessions.map((x) => (
              <option key={String(x.id)} value={String(x.id)}>{dayOf(x.day)}</option>
            ))}
          </select>
        </label>
        <label>
          {t("attendeeList.status")}
          <select name="status" defaultValue={sp.status ?? "all"}>
            {FILTERS.map((f) => (
              <option key={f} value={f}>{t(`attendeeList.filters.${f}`)}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary">{t("attendeeList.apply")}</button>
      </form>
      {rows.length === 0 ? (
        <StateBlock icon={Users} title={sp.q || sp.status ? t("attendeeList.noMatch") : t("attendeeList.emptyTitle")}>
          {sp.q || sp.status ? null : t("attendeeList.emptyBody")}
        </StateBlock>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t("attendees.csv.name")}</th>
                <th scope="col">{t("attendeeList.session")}</th>
                <th scope="col">{t("attendees.csv.status")}</th>
                <th scope="col">{t("attendeeList.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = r.pass_status === "checked_in" ? "checked_in" : String(r.status);
                return (
                  <tr key={String(r.id)} data-testid="attendee-row">
                    <td>
                      <strong>{String(r.name)}</strong>
                      <div className="small muted">{String(r.email)}{r.number ? ` · ${String(r.number)}` : ""}</div>
                    </td>
                    <td className="small">{dayOf(r.day)}</td>
                    <td>
                      <Status tone={st === "checked_in" ? "positive" : st === "cancelled" ? "danger" : "waiting"}>{t(`attendees.status.${st}`)}</Status>
                      {r.checked_in_at ? <div className="small muted">{t("attendeeList.checkedInAt", { time: formatTime(r.checked_in_at as Date, tz), member: String(r.checked_in_by_name ?? "") })}</div> : null}
                    </td>
                    <td>
                      {r.pass_status === "issued" && r.status === "confirmed" ? (
                        <Form action={checkInAction} className="form-inline">
                          <input type="hidden" name="passId" value={String(r.pass_id)} />
                          <input type="hidden" name="name" value={String(r.name).split(/\s+/)[0] ?? ""} />
                          <input type="hidden" name="back" value={back} />
                          <Submit>{t("attendeeList.checkIn")}</Submit>
                        </Form>
                      ) : null}
                      {r.status !== "cancelled" ? (
                        <details className="mt-1">
                          <summary className="small">{t("attendeeList.cancel")}</summary>
                          <Form action={organizerCancelRegistrationAction}>
                            <input type="hidden" name="registrationId" value={String(r.id)} />
                            <input type="hidden" name="eventId" value={id} />
                            <label>
                              {t("attendeeList.cancelMessage")}
                              <textarea name="message" required rows={2} />
                            </label>
                            <Submit variant="danger">{t("attendeeList.cancelSubmit")}</Submit>
                          </Form>
                        </details>
                      ) : null}
                    </td>
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
