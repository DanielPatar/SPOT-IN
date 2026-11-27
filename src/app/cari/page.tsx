import type { Metadata } from "next";
import { formatDate } from "@/lib/time";
import { redirect } from "next/navigation";
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
import { REGIONS, regionOf } from "@/lib/regions";
import { listCatalog } from "@/server/catalog";
import { CatalogCard, type CatalogItem } from "@/components/CatalogCard";
import { BadgeCheck, ChevronDown, List, Map as MapIcon, Search as SearchIcon, SearchX, SlidersHorizontal, Users } from "lucide-react";
import { FilterPopovers } from "@/components/FilterPopovers";

export const metadata: Metadata = { title: t("search.title") };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireOrganizerPage("/cari");
  const sp = await searchParams;
  // UI v2: the list only opens from a search. A bare /cari goes back to the home search bar.
  if (Object.keys(sp).length === 0) redirect("/#cari");
  // "Mau bikin acara apa?" is free text; an exact event-type or space-type name becomes that filter.
  const saidRaw = one(sp.q).trim().toLowerCase();
  const said = saidRaw === t("home.whatAny").toLowerCase() ? "" : saidRaw; // "Apa saja" = no filter
  const eventFromQ = said ? EVENT_TYPES.find((x) => t(`eventTypes.${x}`).toLowerCase() === said) : undefined;
  const typeFromQ = said && !eventFromQ ? SPACE_TYPES.find((x) => t(`spaceTypes.${x}`).toLowerCase() === said) : undefined;
  const qText = eventFromQ || typeFromQ || !said ? "" : one(sp.q);
  const eventType = one(sp.eventType) || eventFromQ || "";
  const spaceTypes = typeFromQ ? [...many(sp.type), typeFromQ] : many(sp.type);
  const from = one(sp.from);
  const to = one(sp.to) || from;
  const dates = /^\d{4}-\d{2}-\d{2}$/.test(from) ? dateRange(from, to >= from ? to : from) : [];
  const lat = Number(one(sp.lat));
  const lon = Number(one(sp.lon));
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const res = await searchSpaces({
    q: qText,
    city: one(sp.city) || undefined,
    near: one(sp.lat) && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, radiusKm: Number(one(sp.radius)) || undefined } : null,
    spaceTypes,
    eventType: eventType || undefined,
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
  // Open-space catalog venues in the same area (read-only, not bookable) — shown under the results.
  const cityParam = one(sp.city);
  const catalog =
    page === 1
      ? await listCatalog({ q: qText, ...(cityParam ? (regionOf(cityParam) ? { regionLike: regionOf(cityParam)! } : { region: cityParam }) : {}), minPax: Number(one(sp.attendance)) || null })
      : [];
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
  const pill = (on: boolean) =>
    `inline-flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-md px-3.5 text-[15px] font-semibold no-underline select-none [&::-webkit-details-marker]:hidden ${on ? "bg-brand-soft text-brand" : "text-ink hover:bg-sunken"}`;
  const chip = (on: boolean) =>
    `inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold no-underline hover:no-underline ${on ? "border-ink bg-ink text-white" : "border-line-strong text-ink hover:border-ink"}`;
  const panel = "absolute left-0 top-full z-40 mt-2 grid w-[min(92vw,320px)] gap-4 rounded-xl border border-line bg-white p-4 shadow-float";
  /** Link that switches one filter value on or off, keeping the rest of the search. */
  const toggle = (key: string, value: string) => {
    const p = new URLSearchParams();
    let had = false;
    for (const [k, v] of Object.entries(sp)) {
      for (const x of many(v)) {
        if (k === "page") continue;
        if (k === key && x === value) had = true;
        else p.append(k, x);
      }
    }
    if (!had) p.append(key, value);
    if (![...p.keys()].length) p.set("q", "");
    return `/cari?${p}`;
  };
  const whatLabel = eventType ? t(`eventTypes.${eventType}`) : typeFromQ ? t(`spaceTypes.${typeFromQ}`) : qText || t("home.whatAny");
  const moreCount = [qText, one(sp.env), one(sp.power), one(sp.radius), one(sp.verified), one(sp.limited)].filter(Boolean).length + many(sp.act).length + many(sp.type).length;
  const segment = (on: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold no-underline hover:no-underline ${on ? "bg-ink text-white" : "text-ink hover:bg-sunken"}`;
  return (
    <div>
      <h1 className="sr-only">{t("search.title")}</h1>
      <form method="get" role="search" aria-label={t("search.filters")} className="mb-6 border-b border-line pb-4">
        <FilterPopovers className="flex flex-wrap items-center gap-2">
          <Link href="/#cari" className="mr-1 inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-[15px] font-semibold text-white no-underline hover:bg-ink/85 hover:no-underline" aria-label={t("search.editSearch")}>
            <SearchIcon className="size-4" aria-hidden="true" />
            <span>{whatLabel}</span>
            <span aria-hidden="true">•</span>
            <span>{cityParam || t("search.anyCity")}</span>
          </Link>

          <details data-pop className="relative">
            <summary className={pill(dates.length > 0)}>
              {dates.length ? (to && to !== from ? `${formatDate(from)} – ${formatDate(to)}` : formatDate(from)) : t("search.when")}
              <ChevronDown className="size-4" aria-hidden="true" />
            </summary>
            <div className={panel}>
              <label>
                {t("search.from")}
                <input type="date" name="from" defaultValue={from} />
              </label>
              <label>
                {t("search.to")}
                <input type="date" name="to" defaultValue={one(sp.to)} />
              </label>
              <button className="btn btn-primary" type="submit">
                {t("search.apply")}
              </button>
            </div>
          </details>

          <details data-pop className="relative">
            <summary className={pill(!!one(sp.budgetMax) || !!one(sp.budgetMin))}>
              {t("search.price")}
              <ChevronDown className="size-4" aria-hidden="true" />
            </summary>
            <div className={panel}>
              <label>
                {t("search.budgetMin")}
                <input name="budgetMin" inputMode="numeric" defaultValue={one(sp.budgetMin)} />
              </label>
              <label>
                {t("search.budgetMax")}
                <input name="budgetMax" inputMode="numeric" defaultValue={one(sp.budgetMax)} />
              </label>
              <button className="btn btn-primary" type="submit">
                {t("search.apply")}
              </button>
            </div>
          </details>

          <details data-pop className="relative">
            <summary className={pill(!!one(sp.attendance))}>
              {one(sp.attendance) ? t("search.capacityShort", { n: one(sp.attendance) }) : t("search.attendance")}
              <ChevronDown className="size-4" aria-hidden="true" />
            </summary>
            <div className={panel}>
              <label>
                {t("search.attendance")}
                <input name="attendance" inputMode="numeric" defaultValue={one(sp.attendance)} />
              </label>
              <button className="btn btn-primary" type="submit">
                {t("search.apply")}
              </button>
            </div>
          </details>

          <details data-pop className="relative">
            <summary className={pill(moreCount > 0)}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {t("search.moreFilters")}
              {moreCount ? <span className="grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-ink">{moreCount}</span> : null}
            </summary>
            <div className={`${panel} max-h-[70vh] w-[min(92vw,640px)] overflow-y-auto sm:left-auto sm:right-0 lg:left-0 lg:right-auto`}>
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2">
                  {t("search.keyword")}
                  <input name="q" defaultValue={qText} placeholder={t("search.keywordPlaceholder")} />
                </label>
                <label>
                  {t("fields.city")}
                  <select name="city" defaultValue={one(sp.city)}>
                    <option value="">{t("search.anyCity")}</option>
                    <optgroup label={t("search.regionsGroup")}>
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t("search.citiesGroup")}>
                      {cityList.map((c) => String(c.city)).filter((c) => !REGIONS.includes(c as (typeof REGIONS)[number])).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <label>
                  {t("search.sort")}
                  <select name="sort" defaultValue={res.sort}>
                    {["relevance", "price", "distance", "newest"].map((x) => (
                      <option key={x} value={x}>
                        {t(`search.sorts.${x}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <label>
              {t("search.eventType")}
              <select name="eventType" defaultValue={eventType}>
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
                  <input type="checkbox" name="type" value={x} defaultChecked={spaceTypes.includes(x)} /> {t(`spaceTypes.${x}`)}
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <NearMe />
                  <Link href="/cari?q=" className="text-sm font-semibold text-ink underline">
                    {t("search.reset")}
                  </Link>
                </div>
                <button className="btn btn-primary" type="submit">
                  {t("search.apply")}
                </button>
              </div>
            </div>
          </details>

          <span className="mx-1 hidden h-8 w-px bg-line md:block" aria-hidden="true" />
          <Link href={toggle("verified", "1")} aria-current={one(sp.verified) === "1" ? "true" : undefined} className={chip(one(sp.verified) === "1")}>
            <BadgeCheck className="size-4" aria-hidden="true" />
            {t("badges.verified")}
          </Link>
          {(["atrium", "event_hall", "outdoor_area"] as const).map((x) => (
            <Link key={x} href={toggle("type", x)} aria-current={spaceTypes.includes(x) ? "true" : undefined} className={chip(spaceTypes.includes(x))}>
              {t(`spaceTypes.${x}`)}
            </Link>
          ))}
        </FilterPopovers>
        <input type="hidden" name="lat" defaultValue={one(sp.lat)} />
        <input type="hidden" name="lon" defaultValue={one(sp.lon)} />
        <input type="hidden" name="view" defaultValue={one(sp.view)} />
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
      ) : res.rows.length === 0 && catalog.length ? null : res.rows.length === 0 ? (
        <StateBlock icon={SearchX} title={t("search.emptyTitle")} action={<Link className="btn btn-secondary" href="/cari?q=">{t("search.reset")}</Link>}>
          {t("search.empty")}
        </StateBlock>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
            {res.rows.map((r) => {
              const demo = r.demo_photo_url ? String(r.demo_photo_url) : null;
              const img = demo ?? coverUrl(r.media);
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
                    {demo ? <span className="italic">{t("search.illustration")}</span> : null}
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
      {catalog.length && !isMap ? (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="dari-katalog">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <h2 id="dari-katalog" className="mt-0 mb-1 text-[22px]">
                {t("search.catalogTitle")}
              </h2>
              <p className="m-0 text-[15px] text-muted-foreground">{t("search.catalogLead")}</p>
            </div>
            <Link href="/katalog" className="btn btn-secondary h-10">
              {t("search.catalogAll")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.map((v) => (
              <CatalogCard key={String(v.slug)} v={v as unknown as CatalogItem} />
            ))}
          </div>
        </section>
      ) : null}
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
