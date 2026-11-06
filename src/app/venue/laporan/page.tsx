import { t } from "@/lib/i18n";
import { now } from "@/lib/clock";
import { formatRupiah } from "@/lib/money";
import { localDate, addDays } from "@/lib/time";
import { requireVenuePage } from "@/web/view";
import { venueCounts } from "@/server/dashboards";
import { Facts, PageTitle, Panel } from "@/components/kit";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** FR-M22-03: counts for a chosen period with a CSV of the rows behind them. */
export default async function VenueReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { session } = await requireVenuePage("/venue/laporan");
  const today = localDate(await now(), "Asia/Jakarta");
  const from = sp.from && DATE.test(sp.from) ? sp.from : addDays(today, -29);
  const to = sp.to && DATE.test(sp.to) ? sp.to : today;
  const c = await venueCounts({ userId: session.userId }, from, to);
  return (
    <div>
      <PageTitle title={t("counts.title")} description={t("counts.intro")} />
      <form method="get" className="form-inline card mb-4">
        <label>
          {t("counts.from")}
          <input type="date" name="from" defaultValue={from} />
        </label>
        <label>
          {t("counts.to")}
          <input type="date" name="to" defaultValue={to} />
        </label>
        <button className="btn btn-primary">{t("counts.apply")}</button>
        <a className="btn btn-secondary" href={`/api/venue-counts?from=${from}&to=${to}`}>{t("counts.csvLink")}</a>
      </form>
      <Panel>
        <Facts
          cols={2}
          items={[
            { k: t("counts.enquiries"), v: String(c.enquiries) },
            { k: t("counts.quotes"), v: String(c.quotes) },
            { k: t("counts.bookings"), v: String(c.bookings) },
            { k: t("counts.conversion"), v: t("counts.pct", { n: c.conversionPct }) },
            { k: t("counts.median"), v: c.medianResponseHours === null ? t("counts.none") : t("compare.hours", { n: c.medianResponseHours }) },
            { k: t("counts.revenue"), v: formatRupiah(c.revenue) },
          ]}
        />
        <p className="small muted">{t("counts.note")}</p>
      </Panel>
    </div>
  );
}
