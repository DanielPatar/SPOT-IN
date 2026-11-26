import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { config } from "@/lib/config";
import { requireOrganizerPage, coverUrl, rp } from "@/web/view";
import { searchSpaces, cities } from "@/server/search";
import { SPACE_TYPES, ACTIVITIES } from "@/server/listings";
import { EVENT_TYPES } from "@/server/enquiries";
import { dateRange } from "@/lib/pricing";
import { parseRupiah } from "@/lib/money";
import { ResultsMap } from "@/components/MapPicker";
import { NearMe } from "@/components/NearMe";
import { StateBlock } from "@/components/kit";
import { BadgeCheck, List, Map as MapIcon, SearchX, SlidersHorizontal, Users } from "lucide-react";

export const metadata: Metadata = { title: t("search.title") };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireOrganizerPage("/cari");
  const sp = await searchParams;
  const from = one(sp.from);
  const to = one(sp.to) || from;
  const dates = /^\d{4}-\d{2}-\d{2}$/.test(from) ? dateRange(from, to >= from ? to : from) : [];
  const lat = Number(one(sp.lat));
  const lon = Number(one(sp.lon));
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const res = await searchSpaces({
    q: one(sp.q),
    city: one(sp.city) || undefined,
    near: one(sp.lat) && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, radiusKm: Number(one(sp.radius)) || undefined } : null,
    spaceTypes: many(sp.type),
    eventType: one(sp.eventType) || undefined,
    dates,
    attendance: Number(one(sp.attendance)) || null,
    budgetMin: parseRupiah(one(sp.budgetMin)),
    budgetMax: parseRupiah(one(sp.budgetMax)),
    environment: (one(sp.env) || null) as "indoor" | null,
    minPowerKva: Number(one(sp.power)) || null,
    activities: many(sp.act),
    verifiedOnly: one(sp.verified) === "1",
    showLimited: one(sp.limited) === "1",
    sort: (one(sp.sort) || undefined) as "relevance",
    page,
  });
  const cityList = await cities();
  const isMap = one(sp.view) === "map";
  const cfg = config();
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of many(v)) p.append(k, x);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `?${p}`;
  };
  const pins = res.rows
    .filter((r) => r.lat != null)
    .map((r) => ({ id: String(r.id), lat: Number(r.lat), lon: Number(r.lon), title: String(r.name), subtitle: `${String(r.property_name)} · ${t("spaces.fromPrice", { price: rp(r.from_price) })}`, href: `/ruang/${r.id}` }));
  const segment = (on: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold no-underline hover:no-underline ${on ? "bg-ink text-white" : "text-ink hover:bg-sunken"}`;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="mb-0">{t("search.title")}</h1>
      </div>
      <form className="form mb-8 rounded-2xl border border-line bg-surface p-4 shadow-float sm:p-5" method="get" role="search">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-[2fr_1.2fr_1fr_1fr_0.8fr_1fr_auto] xl:items-end">
          <label className="col-span-2 md:col-span-4 xl:col-span-1">
            {t("search.keyword")}
            <input name="q" defaultValue={one(sp.q)} placeholder={t("search.keywordPlaceholder")} />
          </label>
          <label className="col-span-2 md:col-span-1">
            {t("fields.city")}
            <select name="city" defaultValue={one(sp.city)}>
              <option value="">{t("search.anyCity")}</option>
              {cityList.map((c) => (
                <option key={String(c.city)} value={String(c.city)}>
                  {String(c.city)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("search.from")}
            <input type="date" name="from" defaultValue={from} />
          </label>
          <label>
            {t("search.to")}
            <input type="date" name="to" defaultValue={one(sp.to)} />
          </label>
          <label>
            {t("search.attendance")}
            <input name="attendance" inputMode="numeric" defaultValue={one(sp.attendance)} />
          </label>
          <label>
            {t("search.budgetMax")}
            <input name="budgetMax" inputMode="numeric" defaultValue={one(sp.budgetMax)} />
          </label>
          <button className="btn btn-primary col-span-2 md:col-span-4 xl:col-span-1" type="submit">
            {t("search.submit")}
          </button>
        </div>
        <details className="group">
          <summary className="inline-flex w-fit items-center gap-2 rounded-full border border-line-strong px-4 py-2 no-underline hover:border-ink [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t("search.moreFilters")}
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <label>
              {t("search.eventType")}
              <select name="eventType" defaultValue={one(sp.eventType)}>
                <option value="">{t("search.any")}</option>
                {EVENT_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {t(`eventTypes.${x}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("search.environment")}
              <select name="env" defaultValue={one(sp.env)}>
                <option value="">{t("search.any")}</option>
                {["indoor", "outdoor", "covered"].map((x) => (
                  <option key={x} value={x}>
                    {t(`environment.${x}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("search.minPower")}
              <input name="power" inputMode="numeric" defaultValue={one(sp.power)} />
            </label>
            <label>
              {t("search.budgetMin")}
              <input name="budgetMin" inputMode="numeric" defaultValue={one(sp.budgetMin)} />
            </label>
            <label>
              {t("search.radius")}
              <input name="radius" inputMode="numeric" defaultValue={one(sp.radius)} />
            </label>
          </div>
          <fieldset className="mt-4">
            <legend>{t("search.spaceTypes")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {SPACE_TYPES.map((x) => (
                <label className="check" key={x}>
                  <input type="checkbox" name="type" value={x} defaultChecked={many(sp.type).includes(x)} /> {t(`spaceTypes.${x}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend>{t("search.activities")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {ACTIVITIES.map((x) => (
                <label className="check" key={x}>
                  <input type="checkbox" name="act" value={x} defaultChecked={many(sp.act).includes(x)} /> {t(`activities.${x}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="row mt-4 gap-6">
            <label className="check">
              <input type="checkbox" name="verified" value="1" defaultChecked={one(sp.verified) === "1"} /> {t("search.verifiedOnly")}
            </label>
            <label className="check">
              <input type="checkbox" name="limited" value="1" defaultChecked={one(sp.limited) === "1"} /> {t("search.showLimited")}
            </label>
          </div>
        </details>
        <input type="hidden" name="lat" defaultValue={one(sp.lat)} />
        <input type="hidden" name="lon" defaultValue={one(sp.lon)} />
        <input type="hidden" name="view" defaultValue={one(sp.view)} />
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="w-48">
              {t("search.sort")}
              <select name="sort" defaultValue={res.sort}>
                {["relevance", "price", "distance", "newest"].map((x) => (
                  <option key={x} value={x}>
                    {t(`search.sorts.${x}`)}
                  </option>
                ))}
              </select>
            </label>
            <NearMe />
          </div>
        </div>
      </form>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[15px] font-semibold text-ink">{t("search.count", { n: res.total })}</p>
        <nav aria-label={t("search.viewToggle")} className="inline-flex items-center gap-1 rounded-full border border-line-strong p-1">
          <Link href={qs({ view: "list" })} aria-current={!isMap} className={segment(!isMap)}>
            <List className="size-4" aria-hidden="true" />
            {t("search.listView")}
          </Link>
          <Link href={qs({ view: "map" })} aria-current={isMap} className={segment(isMap)}>
            <MapIcon className="size-4" aria-hidden="true" />
            {t("search.mapView")}
          </Link>
        </nav>
      </div>
      {isMap ? (
        <div className="[&_.map]:h-[620px]">
          <ResultsMap tileUrl={cfg.MAP_TILE_URL} attribution={cfg.MAP_TILE_ATTRIBUTION} pins={pins} />
        </div>
      ) : res.rows.length === 0 ? (
        <StateBlock icon={SearchX} title={t("search.emptyTitle")} action={<Link className="btn btn-secondary" href="/cari">{t("search.reset")}</Link>}>
          {t("search.empty")}
        </StateBlock>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
            {res.rows.map((r) => {
              const img = coverUrl(r.media);
              return (
                <Link key={String(r.id)} href={`/ruang/${r.id}${dates.length ? `?from=${from}&to=${to}` : ""}`} className="space-card group" data-testid="result">
                  <span className="space-photo block">
                    {img ? <img src={img} alt="" /> : <span className="thumb-empty block" />}
                    {r.verified || r.limited ? (
                      <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {r.verified ? (
                          <span className="badge border-0 bg-white/95 text-ink shadow-sm">
                            <BadgeCheck className="size-3.5 text-brand" aria-hidden="true" />
                            {t("badges.verified")}
                          </span>
                        ) : null}
                        {r.limited ? <span className="badge badge-warn border-0 shadow-sm">{t("calendar.state.limited")}</span> : null}
                      </span>
                    ) : null}
                  </span>
                  <strong className="text-[17px] leading-snug text-ink group-hover:underline">{String(r.name)}</strong>
                  <span className="text-sm text-muted-foreground">
                    {String(r.property_name)} · {String(r.area ?? r.city)}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>{t(`spaceTypes.${String(r.type)}`)}</span>
                    {r.max_capacity ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden="true" />
                        {t("search.upTo", { n: Number(r.max_capacity) })}
                      </span>
                    ) : null}
                    {r.distance_m != null ? <span>{t("search.km", { km: (Number(r.distance_m) / 1000).toFixed(1) })}</span> : null}
                  </span>
                  <span className="price mt-1 text-[15px]">{t("spaces.fromPrice", { price: rp(r.from_price) })}</span>
                </Link>
              );
            })}
          </div>
          {pins.length ? (
            <aside className="hidden lg:block">
              <div className="sticky top-24 [&_.map]:h-[calc(100vh-8rem)] [&_.map]:min-h-[420px]">
                <ResultsMap tileUrl={cfg.MAP_TILE_URL} attribution={cfg.MAP_TILE_ATTRIBUTION} pins={pins} />
              </div>
            </aside>
          ) : null}
        </div>
      )}
      {res.total > res.pageSize ? (
        <div className="mt-10 flex items-center justify-center gap-4 text-sm font-semibold">
          {page > 1 ? <Link href={qs({ page: String(page - 1) })}>{t("search.prev")}</Link> : null}
          <span>{t("search.page", { page, pages: Math.ceil(res.total / res.pageSize) })}</span>
          {page * res.pageSize < res.total ? <Link href={qs({ page: String(page + 1) })}>{t("search.next")}</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
