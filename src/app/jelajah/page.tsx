import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarSearch, MapPin, Radio, Ticket } from "lucide-react";
import { t } from "@/lib/i18n";
import { config, eventDiscoveryOn } from "@/lib/config";
import { formatWeekdayDate, localDate } from "@/lib/time";
import { REGIONS } from "@/lib/regions";
import { fileUrl } from "@/web/view";
import { getSession } from "@/web/session";
import { listedEvents } from "@/server/event-pages";
import { ResultsMap } from "@/components/MapPicker";
import { PilotEventLabel, StateBlock } from "@/components/kit";

export const metadata: Metadata = {
  title: t("discover.title"),
  robots: { index: false, follow: false },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Visitor home (UI v2; proposed amendment to FR-M28-05): events organizers chose to list, by area,
 * with a map. Public, no login. Pages keep noindex and the pilot label (FR-M28-17).
 */
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  if (!eventDiscoveryOn()) {
    return (
      <div className="narrow">
        <StateBlock icon={CalendarSearch} title={t("discover.offTitle")}>
          {t("discover.off")}
        </StateBlock>
      </div>
    );
  }
  const region = one(sp.wilayah);
  const when = (["now", "soon"].includes(one(sp.kapan)) ? one(sp.kapan) : "") as
    "now" | "soon" | "";
  const [rows, s] = await Promise.all([listedEvents({ q: one(sp.q), region, when }), getSession()]);
  const cfg = config();
  const pins = rows
    .filter((r) => r.lat != null)
    .map((r) => ({
      id: String(r.slug),
      lat: Number(r.lat),
      lon: Number(r.lon),
      title: String(r.title),
      subtitle: `${String(r.property_name)} · ${String(r.area ?? r.city)}`,
      href: `/e/${String(r.slug)}`,
    }));
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <PilotEventLabel className="mb-3" />
          <h1 className="mb-2">
            {region ? t("discover.titleIn", { city: region }) : t("discover.title")}
          </h1>
          <p className="m-0 text-lg text-muted-foreground">{t("discover.lead")}</p>
        </div>
        {s ? (
          <Link href="/kartu-saya" className="btn btn-secondary">
            <Ticket className="size-4" aria-hidden="true" />
            {t("discover.myPasses")}
          </Link>
        ) : null}
      </div>

      <form
        method="get"
        role="search"
        aria-label={t("discover.searchLabel")}
        className="mb-8 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-float sm:p-5 md:grid-cols-[2fr_1.2fr_1.2fr_auto] md:items-end"
      >
        <label className="col-span-2 md:col-span-1">
          {t("discover.keyword")}
          <input name="q" defaultValue={one(sp.q)} placeholder={t("discover.keywordPlaceholder")} />
        </label>
        <label>
          {t("discover.where")}
          <select name="wilayah" defaultValue={region}>
            <option value="">{t("discover.anyWhere")}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("discover.when")}
          <select name="kapan" defaultValue={when}>
            <option value="">{t("discover.whenAny")}</option>
            <option value="now">{t("discover.whenNow")}</option>
            <option value="soon">{t("discover.whenSoon")}</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary col-span-2 md:col-span-1">
          {t("discover.submit")}
        </button>
      </form>

      <p className="mb-6 text-[15px] font-semibold text-ink">
        {t("discover.count", { n: rows.length })}
      </p>
      {rows.length === 0 ? (
        <StateBlock
          icon={CalendarSearch}
          title={t("discover.emptyTitle")}
          action={
            <Link className="btn btn-secondary" href="/jelajah">
              {t("discover.reset")}
            </Link>
          }
        >
          {t("discover.empty")}
        </StateBlock>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_460px]">
          <ul className="m-0 grid list-none gap-6 p-0">
            {rows.map((r) => {
              const tz = String(r.timezone);
              const start = r.next_start
                ? formatWeekdayDate(localDate(new Date(r.next_start as Date), tz))
                : "";
              const end = formatWeekdayDate(localDate(new Date(r.last_end as Date), tz));
              return (
                <li key={String(r.slug)}>
                  <Link
                    href={`/e/${String(r.slug)}`}
                    className="group lift grid overflow-hidden rounded-2xl border border-line bg-surface text-ink no-underline hover:no-underline sm:grid-cols-[240px_1fr]"
                    data-testid="discover-item"
                  >
                    <span className="relative block overflow-hidden bg-sunken">
                      {r.cover_file_id ? (
                        <img
                          src={fileUrl(String(r.cover_file_id))}
                          alt=""
                          loading="lazy"
                          className="aspect-[16/10] size-full object-cover transition-transform duration-500 group-hover:scale-[1.05] sm:aspect-auto"
                        />
                      ) : (
                        <span className="thumb-empty block rounded-none sm:h-full" />
                      )}
                      <span
                        className={`badge absolute top-3 left-3 border-0 shadow-sm ${r.ongoing ? "bg-ink text-white" : "bg-white/95 text-ink"}`}
                      >
                        {r.ongoing ? (
                          <Radio className="size-3.5" aria-hidden="true" />
                        ) : (
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                        )}
                        {r.ongoing ? t("discover.ongoing") : t("discover.upcoming")}
                      </span>
                    </span>
                    <span className="grid content-start gap-2 p-5">
                      <span className="text-xs font-bold tracking-wide text-brand uppercase">
                        {t(`categories.${String(r.category)}`)}
                      </span>
                      <strong className="text-xl leading-snug group-hover:underline">
                        {String(r.title)}
                      </strong>
                      <span className="text-[15px] leading-relaxed text-muted-foreground">
                        {String(r.summary)}
                      </span>
                      {r.description ? (
                        <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {String(r.description)}
                        </span>
                      ) : null}
                      <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-4" aria-hidden="true" />
                          {t("discover.at", {
                            venue: `${String(r.property_name)}, ${String(r.area ?? r.city)}`,
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-4" aria-hidden="true" />
                          {r.ongoing
                            ? t("discover.until", { date: end })
                            : t("discover.starts", { date: start })}
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t("discover.by", { organizer: String(r.organizer_name) })}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {pins.length ? (
            <aside aria-label={t("discover.mapLabel")}>
              <div className="sticky top-24 [&_.map]:h-[420px] lg:[&_.map]:h-[calc(100vh-8rem)] lg:[&_.map]:min-h-[420px]">
                <ResultsMap
                  tileUrl={cfg.MAP_TILE_URL}
                  attribution={cfg.MAP_TILE_ATTRIBUTION}
                  pins={pins}
                />
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
