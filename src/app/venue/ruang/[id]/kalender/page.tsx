import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { now } from "@/lib/clock";
import { localDate, formatDateTime, tzLabel } from "@/lib/time";
import { requireVenuePage } from "@/web/view";
import { venueCalendar } from "@/server/calendar";
import { PermissionError } from "@/lib/permissions";
import { CalendarGrid, monthBounds, shiftMonth } from "@/components/Calendar";
import { Form, Submit } from "@/components/Form";
import { blockAction, removeBlockAction } from "@/web/actions/venue";

export default async function VenueCalendarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const { id } = await params;
  const { m } = await searchParams;
  const { session } = await requireVenuePage(`/venue/ruang/${id}/kalender`);
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : localDate(await now(), "Asia/Jakarta").slice(0, 7);
  const { from, to } = monthBounds(month);
  let cal;
  try {
    cal = await venueCalendar({ userId: session.userId }, id, from, to);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const tz = String(cal.space.timezone);
  return (
    <div>
      <div className="spread">
        <h1>{t("calendar.title", { space: String(cal.space.name) })}</h1>
        <div className="row">
          <Link href={`?m=${shiftMonth(month, -1)}`}>{t("calendar.prev")}</Link>
          <strong>{month}</strong>
          <Link href={`?m=${shiftMonth(month, 1)}`}>{t("calendar.next")}</Link>
        </div>
      </div>
      <p className="small muted">{t("calendar.tzNote", { tz: tzLabel(tz) })}</p>
      <div className="cols">
        <div className="card">
          <CalendarGrid month={month} days={cal.days} />
        </div>
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("calendar.blockTitle")}</h2>
            <Form action={blockAction} resetOnOk>
              <input type="hidden" name="spaceId" value={id} />
              <div className="form-inline">
                <label>
                  {t("rateCard.from")}
                  <input type="date" name="from" required />
                </label>
                <label>
                  {t("rateCard.to")}
                  <input type="date" name="to" />
                </label>
              </div>
              <label>
                {t("calendar.reason")}
                <input name="reason" />
              </label>
              <label className="check">
                <input type="checkbox" name="weekly" /> {t("calendar.weekly")}
              </label>
              <label>
                {t("calendar.weeklyUntil")}
                <input type="date" name="weeklyUntil" />
              </label>
              <Submit>{t("calendar.block")}</Submit>
            </Form>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("calendar.entries")}</h2>
            {cal.entries.length === 0 ? <p className="muted small">{t("calendar.noEntries")}</p> : null}
            {cal.entries.map((e) => (
              <div key={String(e.id)} className="small" style={{ marginBottom: 8 }}>
                <span className="badge">{t(`calendar.state.${String(e.kind)}`)}</span> {formatDateTime(e.starts_at as Date, tz)} → {formatDateTime(e.ends_at as Date, tz)}
                {e.reason ? <div className="muted">{String(e.reason)}</div> : null}
                {e.event_name ? <div>{String(e.event_name)}</div> : null}
                {e.expires_at ? <div className="muted">{t("calendar.expires", { at: formatDateTime(e.expires_at as Date, tz) })}</div> : null}
                {e.kind === "block" ? (
                  <form action={removeBlockAction} className="row">
                    <input type="hidden" name="spaceId" value={id} />
                    <input type="hidden" name="entryId" value={String(e.id)} />
                    <button className="link-btn small">{t("calendar.unblock")}</button>
                    {e.series_id ? (
                      <label className="check small">
                        <input type="checkbox" name="series" /> {t("calendar.wholeSeries")}
                      </label>
                    ) : null}
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
