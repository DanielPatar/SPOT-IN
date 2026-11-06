import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { config } from "@/lib/config";
import { PermissionError } from "@/lib/permissions";
import { requireSession } from "@/web/session";
import { coverUrl, rp } from "@/web/view";
import { publicProperty } from "@/server/search";
import { StaticMap } from "@/components/MapPicker";

/** FR-M7-06: the property page lists all its published spaces. */
export default async function PropertyPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/properti/${id}`);
  let data;
  try {
    data = await publicProperty(id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const { property: p, spaces } = data;
  const cfg = config();
  return (
    <div>
      <h1>{String(p.name)}</h1>
      <p className="muted">
        {t(`propertyTypes.${String(p.type)}`)} · {String(p.address_text)} {p.verified ? <span className="badge badge-ok">{t("badges.verified")}</span> : null}
      </p>
      <div className="cols">
        <div className="grid">
          {spaces.map((s) => {
            const img = coverUrl(s.media);
            return (
              <Link key={String(s.id)} href={`/ruang/${s.id}`} className="card space-card">
                {img ? <img src={img} alt="" /> : <div className="thumb-empty" />}
                <strong>{String(s.name)}</strong>
                <span className="small muted">{t(`spaceTypes.${String(s.type)}`)}</span>
                <span className="price">{t("spaces.fromPrice", { price: rp(s.from_price) })}</span>
              </Link>
            );
          })}
        </div>
        <div>
          {p.lat != null ? <StaticMap lat={Number(p.lat)} lon={Number(p.lon)} tileUrl={cfg.MAP_TILE_URL} attribution={cfg.MAP_TILE_ATTRIBUTION} /> : null}
          {p.parking_notes ? (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>{t("property.parking")}</h3>
              <p className="small">{String(p.parking_notes)}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
