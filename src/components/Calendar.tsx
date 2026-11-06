import { t } from "@/lib/i18n";
import { addDays, weekdayOf } from "@/lib/time";

/** Month grid of day states (FR-M6-01 venue view, FR-M6-02 organizer view). */
export function CalendarGrid({ month, days }: { month: string; days: { date: string; state: string }[] }) {
  const first = `${month}-01`;
  const lead = (weekdayOf(first) + 6) % 7; // Monday first
  const inMonth = days.filter((d) => d.date.startsWith(month));
  const cells: ({ date: string; state: string } | null)[] = [...Array(lead).fill(null), ...inMonth];
  const heads = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return (
    <div>
      <div className="cal" aria-hidden="true">
        {heads.map((h) => (
          <div className="cal-head" key={h}>
            {t(`weekdaysShort.${h}`)}
          </div>
        ))}
      </div>
      <div className="cal" role="list">
        {cells.map((c, i) =>
          c ? (
            <div className={`cal-day st-${c.state}`} key={c.date} role="listitem" data-date={c.date} data-state={c.state}>
              {Number(c.date.slice(8))}
              <small>{t(`calendar.state.${c.state}`)}</small>
            </div>
          ) : (
            <div className="cal-day st-empty" key={`e${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

export function monthBounds(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { from, to: addDays(next, -1) };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
