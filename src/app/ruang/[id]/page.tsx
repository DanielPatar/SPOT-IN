import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { config } from "@/lib/config";
import { now } from "@/lib/clock";
import { addDays, formatDate, localDate } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import { PermissionError } from "@/lib/permissions";
import { requireSession, memberships } from "@/web/session";
import { fileUrl, rp } from "@/web/view";
import { publicSpace, listShortlists } from "@/server/search";
import { publicAvailability } from "@/server/calendar";
import { CalendarGrid, shiftMonth } from "@/components/Calendar";
import { StaticMap } from "@/components/MapPicker";
import { Estimate } from "@/components/Estimate";
import { Form, Submit } from "@/components/Form";
import { BadgeCheck, Images, LayoutGrid, MapPin, Ruler, Users, Zap } from "lucide-react";
import { addToShortlistAction, createShortlistAction, reportSpaceAction } from "@/web/actions/organizer";

export default async function SpacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s0 = await requireSession(`/ruang/${id}`);
  let data;
  try {
    data = await publicSpace({ userId: s0.userId }, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const { space: s, rateCard: rc, seasons, addOns } = data;
  const m = await memberships(s0.userId);
  const lists = m.organizer ? await listShortlists({ userId: s0.userId }) : [];
  const today = localDate(await now(), String(s.timezone));
  const month = today.slice(0, 7);
  const avail = await publicAvailability(id, `${month}-01`, addDays(`${shiftMonth(month, 2)}-01`, -1));
  const settings = await getSettings();
  const policy = settings.cancellation_policies[String(s.cancellation_policy) as "moderate"];
  const caps = (s.capacities ?? {}) as Record<string, number>;
  const media = (s.media ?? []) as { fileId: string; caption?: string; cover?: boolean }[];
  const docs = (s.required_docs ?? []) as { name: string; mandatory: boolean; dueOffsetDays: number }[];
  const cfg = config();
  const initialDays = sp.from ? [{ date: sp.from, start: "10:00", end: "21:00" }] : undefined;
  const maxCap = Math.max(0, ...Object.values(caps).map(Number));
  const highlights = [
    { icon: LayoutGrid, label: t("spaces.type"), value: t(`spaceTypes.${String(s.type)}`) },
    maxCap ? { icon: Users, label: t("spacePage.maxCapacity"), value: t("search.capacityShort", { n: maxCap }) } : null,
    s.area_m2 ? { icon: Ruler, label: t("spaces.area"), value: t("spacePage.m2", { n: String(s.area_m2) }) } : null,
    s.power_kva ? { icon: Zap, label: t("spaces.power"), value: t("spacePage.kva", { n: Number(s.power_kva) }) } : null,
  ].filter((x): x is { icon: typeof Users; label: string; value: string } => !!x);
  const shown = media.slice(0, 5);
  const canEnquire = m.organizer && s.status === "published";
  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-2 text-[30px] sm:text-[36px]">{String(s.name)}</h1>
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted-foreground">
          {s.verified ? (
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <BadgeCheck className="size-4 text-brand" aria-hidden="true" />
              {t("badges.verified")}
            </span>
          ) : null}
          {s.verified ? <span aria-hidden="true">·</span> : null}
          <Link href={`/properti/${s.property_id}`} className="font-semibold text-ink underline">
            {String(s.property_name)}
          </Link>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden="true" />
            {String(s.area ?? "")} {String(s.city)}
          </span>
        </p>
      </div>

      <section aria-label={t("spacePage.gallery")} className="mb-10">
        {shown.length === 0 ? (
          <div className="thumb-empty aspect-[21/9]" />
        ) : shown.length === 1 ? (
          <img className="aspect-[16/9] max-h-[460px] w-full rounded-2xl object-cover sm:aspect-[21/9]" src={fileUrl(shown[0]!.fileId)} alt={shown[0]!.caption || String(s.name)} />
        ) : (
          <div className="grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[460px]">
            {shown.map((ph, i) => (
              <figure key={ph.fileId} className={`relative m-0 bg-sunken ${i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block"} ${shown.length === 2 && i === 1 ? "sm:col-span-2 sm:row-span-2" : ""} ${shown.length === 3 && i > 0 ? "sm:col-span-2" : ""}`}>
                <img className="size-full object-cover" src={fileUrl(ph.fileId)} alt={ph.caption || String(s.name)} />
                {i === shown.length - 1 && media.length > shown.length ? (
                  <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ink shadow-sm">
                    <Images className="size-4" aria-hidden="true" />
                    {t("spacePage.morePhotos", { n: media.length - shown.length })}
                  </span>
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {highlights.length ? (
            <ul aria-label={t("spacePage.highlights")} className="m-0 grid list-none grid-cols-2 gap-4 border-b border-line p-0 pb-8 sm:grid-cols-4">
              {highlights.map((h) => (
                <li key={h.label} className="flex items-start gap-3">
                  <h.icon className="mt-0.5 size-6 shrink-0 text-ink" aria-hidden="true" />
                  <span>
                    <span className="block text-sm text-muted-foreground">{h.label}</span>
                    <span className="block font-semibold text-ink">{h.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <section className="border-b border-line py-8">
            <h2 className="mt-0 mb-4 text-[22px]">{t("spacePage.specs")}</h2>
            <dl className="kv">
              <dt>{t("spaces.type")}</dt>
              <dd>{t(`spaceTypes.${String(s.type)}`)}</dd>
              {s.level_text ? (
                <>
                  <dt>{t("spaces.level")}</dt>
                  <dd>{String(s.level_text)}</dd>
                </>
              ) : null}
              {s.area_m2 ? (
                <>
                  <dt>{t("spaces.area")}</dt>
                  <dd>{t("spacePage.m2", { n: String(s.area_m2) })}</dd>
                </>
              ) : null}
              {s.ceiling_height_m ? (
                <>
                  <dt>{t("spaces.ceiling")}</dt>
                  <dd>{t("spacePage.meters", { n: String(s.ceiling_height_m) })}</dd>
                </>
              ) : null}
              <dt>{t("spaces.capacity")}</dt>
              <dd>
                {Object.entries(caps)
                  .map(([k, v]) => `${t(`layouts.${k}`)} ${v}`)
                  .join(" · ") || "—"}
              </dd>
              {s.power_kva ? (
                <>
                  <dt>{t("spaces.power")}</dt>
                  <dd>{t("spacePage.kva", { n: Number(s.power_kva) })}</dd>
                </>
              ) : null}
              <dt>{t("spaces.environment")}</dt>
              <dd>
                {t(`environment.${String(s.environment)}`)}
                {s.wifi ? ` · ${t("spaces.wifi")}` : ""}
              </dd>
              <dt>{t("spaces.activities")}</dt>
              <dd>{((s.permitted_activities ?? []) as string[]).map((a) => t(`activities.${a}`)).join(", ") || "—"}</dd>
              {s.prohibited_categories ? (
                <>
                  <dt>{t("spaces.prohibited")}</dt>
                  <dd>{String(s.prohibited_categories)}</dd>
                </>
              ) : null}
              <dt>{t("spacePage.duration")}</dt>
              <dd>{t("spacePage.durationValue", { min: Number(s.min_days), max: s.max_days ? Number(s.max_days) : "∞" })}</dd>
              {s.accessibility_notes ? (
                <>
                  <dt>{t("spaces.accessibility")}</dt>
                  <dd>{String(s.accessibility_notes)}</dd>
                </>
              ) : null}
            </dl>
            {s.video_url ? (
              <p className="mt-4">
                <a href={String(s.video_url)} target="_blank" rel="noreferrer" className="font-semibold">
                  {t("spacePage.video")}
                </a>
              </p>
            ) : null}
          </section>
          <section className="border-b border-line py-8">
            <h2 className="mt-0 mb-4 text-[22px]">{t("spacePage.pricing")}</h2>
            <p className="price mb-3 text-lg">{t("spaces.fromPrice", { price: rp(rc?.from_price) })}</p>
            {rc?.show_full_rate_card ? (
              <dl className="kv">
                <dt>{t("rateCard.weekday")}</dt>
                <dd>
                  {rp(rc.weekday_price)} {t(`unitsPer.${String(rc.unit)}`)}
                </dd>
                {rc.weekend_price != null ? (
                  <>
                    <dt>{t("rateCard.weekend")}</dt>
                    <dd>
                      {rp(rc.weekend_price)} {t(`unitsPer.${String(rc.unit)}`)}
                    </dd>
                  </>
                ) : null}
                {seasons.map((x) => (
                  <div key={String(x.name)} style={{ display: "contents" }}>
                    <dt>{String(x.name)}</dt>
                    <dd>{rp(x.price)}</dd>
                  </div>
                ))}
                {rc.min_spend ? (
                  <>
                    <dt>{t("rateCard.minSpend")}</dt>
                    <dd>{rp(rc.min_spend)}</dd>
                  </>
                ) : null}
              </dl>
            ) : null}
            {addOns.length ? (
              <>
                <h3>{t("settings.addOns")}</h3>
                <ul className="small">
                  {addOns.map((a) => (
                    <li key={String(a.id)}>
                      {String(a.name)} · {rp(a.price)} {t(`addOnUnits.${String(a.unit)}`)}
                      {a.mandatory ? ` (${t("settings.mandatory")})` : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="mt-8 rounded-2xl bg-sunken p-5 sm:p-6">
            <h3 className="mt-0 mb-4 text-lg">{t("estimate.title")}</h3>
            {rc ? (
              <Estimate
                spaceId={id}
                initialDays={initialDays}
                addOns={addOns.map((a) => ({ id: String(a.id), name: String(a.name), unit: String(a.unit), price: rp(a.price), mandatory: !!a.mandatory }))}
              />
            ) : null}
            </div>
          </section>
          <section className="border-b border-line py-8">
            <h2 className="mt-0 mb-1 text-[22px]">{t("spacePage.availability")}</h2>
            <p className="mb-5 text-sm text-muted-foreground">{t("spacePage.availabilityHelp")}</p>
            <div className="grid gap-8 xl:grid-cols-2">
              <CalendarGrid month={month} days={avail} />
              <CalendarGrid month={shiftMonth(month, 1)} days={avail} />
            </div>
          </section>
          <section className="border-b border-line py-8">
            <h2 className="mt-0 mb-4 text-[22px]">{t("spacePage.location")}</h2>
            {s.lat != null ? <StaticMap lat={Number(s.lat)} lon={Number(s.lon)} tileUrl={cfg.MAP_TILE_URL} attribution={cfg.MAP_TILE_ATTRIBUTION} /> : null}
            <p className="mt-3 mb-0 inline-flex items-center gap-1.5 text-[15px] text-ink">
              <MapPin className="size-4" aria-hidden="true" />
              {String(s.address_text)}
            </p>
          </section>
          <section className="py-8">
            <h2 className="mt-0 mb-2 text-[22px]">{t("spacePage.rules")}</h2>
            {s.house_rules ? (
              <>
                <h3>{t("property.houseRules")}</h3>
                <p className="small">{String(s.house_rules)}</p>
              </>
            ) : null}
            {docs.length ? (
              <>
                <h3>{t("property.requiredDocs")}</h3>
                <ul className="small">
                  {docs.map((d) => (
                    <li key={d.name}>
                      {d.name} — {t("spacePage.docDue", { n: d.dueOffsetDays })}
                      {d.mandatory ? ` (${t("property.mandatory")})` : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <h3>{t("spaces.cancellationPolicy")}</h3>
            <p className="small">
              <strong>{t(`policies.${String(s.cancellation_policy)}.name`)}</strong>
            </p>
            <ul className="small">
              {policy.map((tier, i) => (
                <li key={i}>{t("spacePage.policyTier", { days: tier.minDays, pct: tier.refundBps / 100 })}</li>
              ))}
            </ul>
          </section>
          <details className="mt-2 rounded-xl border border-line p-4">
            <summary>{t("report.title")}</summary>
            <div className="mt-4">
              <Form action={reportSpaceAction}>
                <input type="hidden" name="spaceId" value={id} />
                <label>
                  {t("report.reason")}
                  <select name="reason">
                    {["misleading", "inappropriate", "scam", "other"].map((r) => (
                      <option key={r} value={r}>
                        {t(`report.reasons.${r}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("report.text")}
                  <textarea name="text" />
                </label>
                <Submit variant="secondary">{t("report.send")}</Submit>
              </Form>
            </div>
          </details>
          <p className="mt-4 text-sm text-muted-foreground">{t("spacePage.updated", { date: formatDate(localDate(new Date(s.updated_at as Date), String(s.timezone))) })}</p>
        </div>

        <aside className="min-w-0">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-float lg:sticky lg:top-24">
            <p className="m-0 text-sm text-muted-foreground">{t("spacePage.bookCardLabel")}</p>
            <p className="mt-1 mb-4 text-2xl font-extrabold tracking-tight text-ink">
              {t("spaces.fromPrice", { price: rp(rc?.from_price) })}
              {rc ? <span className="text-base font-medium text-muted-foreground"> {t(`unitsPer.${String(rc.unit)}`)}</span> : null}
            </p>
            {canEnquire ? (
              <Link className="btn btn-primary w-full" href={`/acara/kirim?spaces=${id}`}>
                {t("spacePage.sendEnquiry")}
              </Link>
            ) : null}
            {canEnquire ? <p className="mt-2 mb-0 text-center text-[13px] text-muted-foreground">{t("spacePage.noCharge")}</p> : null}
          {m.organizer ? (
            <div className="mt-5 grid gap-5 border-t border-line pt-5">
              <h2 className="mt-0 mb-0 text-base">{t("shortlist.save")}</h2>
              {lists.length ? (
                <Form action={addToShortlistAction}>
                  <input type="hidden" name="spaceId" value={id} />
                  <label>
                    {t("shortlist.choose")}
                    <select name="shortlistId">
                      {lists.map((l) => (
                        <option key={String(l.id)} value={String(l.id)}>
                          {String(l.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("shortlist.note")}
                    <input name="note" />
                  </label>
                  <Submit variant="secondary">{t("shortlist.add")}</Submit>
                </Form>
              ) : null}
              <Form action={createShortlistAction}>
                <input type="hidden" name="spaceId" value={id} />
                <label>
                  {t("shortlist.newName")}
                  <input name="name" required placeholder={t("shortlist.namePlaceholder")} />
                </label>
                <Submit variant="secondary">{t("shortlist.createAndAdd")}</Submit>
              </Form>
            </div>
          ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
