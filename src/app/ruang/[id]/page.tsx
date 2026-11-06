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
  return (
    <div>
      <div className="spread">
        <div>
          <h1>{String(s.name)}</h1>
          <p className="muted">
            <Link href={`/properti/${s.property_id}`}>{String(s.property_name)}</Link> · {String(s.area ?? "")} {String(s.city)}{" "}
            {s.verified ? <span className="badge badge-ok">{t("badges.verified")}</span> : null}
          </p>
        </div>
        {m.organizer && s.status === "published" ? (
          <Link className="btn btn-primary" href={`/acara/kirim?spaces=${id}`}>
            {t("spacePage.sendEnquiry")}
          </Link>
        ) : null}
      </div>
      <div className="gallery" style={{ marginBottom: 16 }}>
        {media.map((ph) => (
          <figure key={ph.fileId} style={{ margin: 0 }}>
            <img className="thumb" src={fileUrl(ph.fileId)} alt={ph.caption || String(s.name)} />
            {ph.caption ? <figcaption className="small muted">{ph.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
      <div className="cols">
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("spacePage.specs")}</h2>
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
              <p>
                <a href={String(s.video_url)} target="_blank" rel="noreferrer">
                  {t("spacePage.video")}
                </a>
              </p>
            ) : null}
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("spacePage.pricing")}</h2>
            <p className="price">{t("spaces.fromPrice", { price: rp(rc?.from_price) })}</p>
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
            <h3>{t("estimate.title")}</h3>
            {rc ? (
              <Estimate
                spaceId={id}
                initialDays={initialDays}
                addOns={addOns.map((a) => ({ id: String(a.id), name: String(a.name), unit: String(a.unit), price: rp(a.price), mandatory: !!a.mandatory }))}
              />
            ) : null}
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("spacePage.availability")}</h2>
            <p className="small muted">{t("spacePage.availabilityHelp")}</p>
            <CalendarGrid month={month} days={avail} />
            <h3>{shiftMonth(month, 1)}</h3>
            <CalendarGrid month={shiftMonth(month, 1)} days={avail} />
          </div>
        </div>
        <div>
          {s.lat != null ? <StaticMap lat={Number(s.lat)} lon={Number(s.lon)} tileUrl={cfg.MAP_TILE_URL} attribution={cfg.MAP_TILE_ATTRIBUTION} /> : null}
          <div className="card" style={{ marginTop: 16 }}>
            <p className="small">{String(s.address_text)}</p>
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
          </div>
          {m.organizer ? (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{t("shortlist.save")}</h2>
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
          <details className="card">
            <summary>{t("report.title")}</summary>
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
          </details>
          <p className="small muted">{t("spacePage.updated", { date: formatDate(localDate(new Date(s.updated_at as Date), String(s.timezone))) })}</p>
        </div>
      </div>
    </div>
  );
}
