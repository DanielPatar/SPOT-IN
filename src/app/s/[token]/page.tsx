import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { sharedShortlist } from "@/server/search";
import { coverUrl, rp } from "@/web/view";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** View-only shared shortlist, no login (FR-M8-02). */
export default async function SharedShortlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await sharedShortlist(token);
  if (!data) {
    return (
      <div className="narrow card">
        <h1>{t("shortlist.unavailable")}</h1>
      </div>
    );
  }
  return (
    <div>
      <h1>{data.name}</h1>
      <p className="muted">{t("shortlist.sharedBy", { org: data.organizerName })}</p>
      <div className="grid">
        {data.items.map((i) => {
          const img = coverUrl(i.media);
          return (
            <div className="card space-card" key={String(i.id)} data-testid="shared-item">
              {img ? <img src={img} alt="" /> : <div className="thumb-empty" />}
              <strong>{String(i.name)}</strong>
              <span className="small muted">
                {String(i.property_name)} · {String(i.city)} · {t(`spaceTypes.${String(i.type)}`)}
              </span>
              <span className="price">{t("spaces.fromPrice", { price: rp(i.from_price) })}</span>
              {i.note ? <span className="small">{String(i.note)}</span> : null}
            </div>
          );
        })}
      </div>
      <p className="small muted">{t("shortlist.indicative")}</p>
    </div>
  );
}
