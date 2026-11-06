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
  return (
    <div>
      <h1>{t("search.title")}</h1>
      <form className="card form" method="get" role="search">
        <div className="form-inline">
          <label style={{ flex: 2, minWidth: 220 }}>
            {t("search.keyword")}
            <input name="q" defaultValue={one(sp.q)} placeholder={t("search.keywordPlaceholder")} />
          </label>
          <label>
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
          <label style={{ width: 110 }}>
            {t("search.attendance")}
            <input name="attendance" inputMode="numeric" defaultValue={one(sp.attendance)} />
          </label>
          <label style={{ width: 150 }}>
            {t("search.budgetMax")}
            <input name="budgetMax" inputMode="numeric" defaultValue={one(sp.budgetMax)} />
          </label>
        </div>
        <details>
          <summary>{t("search.moreFilters")}</summary>
          <div className="form-inline" style={{ marginTop: 8 }}>
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
            <label style={{ width: 120 }}>
              {t("search.minPower")}
              <input name="power" inputMode="numeric" defaultValue={one(sp.power)} />
            </label>
            <label style={{ width: 150 }}>
              {t("search.budgetMin")}
              <input name="budgetMin" inputMode="numeric" defaultValue={one(sp.budgetMin)} />
            </label>
            <label style={{ width: 120 }}>
              {t("search.radius")}
              <input name="radius" inputMode="numeric" defaultValue={one(sp.radius)} />
            </label>
          </div>
          <fieldset style={{ marginTop: 8 }}>
            <legend>{t("search.spaceTypes")}</legend>
            <div className="row">
              {SPACE_TYPES.map((x) => (
                <label className="check" key={x}>
                  <input type="checkbox" name="type" value={x} defaultChecked={many(sp.type).includes(x)} /> {t(`spaceTypes.${x}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset style={{ marginTop: 8 }}>
            <legend>{t("search.activities")}</legend>
            <div className="row">
              {ACTIVITIES.map((x) => (
                <label className="check" key={x}>
                  <input type="checkbox" name="act" value={x} defaultChecked={many(sp.act).includes(x)} /> {t(`activities.${x}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="row" style={{ marginTop: 8 }}>
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
        <div className="row">
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
          <button className="btn btn-primary" type="submit">
            {t("search.submit")}
          </button>
          <NearMe />
        </div>
      </form>
      <div className="spread">
        <p className="muted">{t("search.count", { n: res.total })}</p>
        <div className="row">
          <Link href={qs({ view: "list" })} aria-current={!isMap}>
            {t("search.listView")}
          </Link>
          <Link href={qs({ view: "map" })} aria-current={isMap}>
            {t("search.mapView")}
          </Link>
        </div>
      </div>
      {isMap ? (
        <ResultsMap
          tileUrl={cfg.MAP_TILE_URL}
          attribution={cfg.MAP_TILE_ATTRIBUTION}
          pins={res.rows
            .filter((r) => r.lat != null)
            .map((r) => ({ id: String(r.id), lat: Number(r.lat), lon: Number(r.lon), title: String(r.name), subtitle: `${String(r.property_name)} · ${t("spaces.fromPrice", { price: rp(r.from_price) })}`, href: `/ruang/${r.id}` }))}
        />
      ) : (
        <div className="grid">
          {res.rows.map((r) => {
            const img = coverUrl(r.media);
            return (
              <Link key={String(r.id)} href={`/ruang/${r.id}${dates.length ? `?from=${from}&to=${to}` : ""}`} className="card space-card" data-testid="result">
                {img ? <img src={img} alt="" /> : <div className="thumb-empty" />}
                <strong>{String(r.name)}</strong>
                <span className="small muted">
                  {String(r.property_name)} · {String(r.area ?? r.city)}
                </span>
                <span className="row small">
                  <span>{t(`spaceTypes.${String(r.type)}`)}</span>
                  {r.max_capacity ? <span>· {t("search.upTo", { n: Number(r.max_capacity) })}</span> : null}
                  {r.distance_m != null ? <span>· {t("search.km", { km: (Number(r.distance_m) / 1000).toFixed(1) })}</span> : null}
                </span>
                <span className="row">
                  <span className="price">{t("spaces.fromPrice", { price: rp(r.from_price) })}</span>
                  {r.verified ? <span className="badge badge-ok">{t("badges.verified")}</span> : null}
                  {r.limited ? <span className="badge badge-warn">{t("calendar.state.limited")}</span> : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}
      {res.total > res.pageSize ? (
        <div className="row" style={{ marginTop: 16 }}>
          {page > 1 ? <Link href={qs({ page: String(page - 1) })}>{t("search.prev")}</Link> : null}
          <span>{t("search.page", { page, pages: Math.ceil(res.total / res.pageSize) })}</span>
          {page * res.pageSize < res.total ? <Link href={qs({ page: String(page + 1) })}>{t("search.next")}</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
