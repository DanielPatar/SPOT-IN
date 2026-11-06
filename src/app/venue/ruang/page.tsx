import Link from "next/link";
import { t } from "@/lib/i18n";
import { requireVenuePage, coverUrl, rp } from "@/web/view";
import { venueSpaces } from "@/server/listings";

export default async function VenueSpacesPage() {
  const { session } = await requireVenuePage("/venue/ruang");
  const { spaces } = await venueSpaces({ userId: session.userId });
  return (
    <div>
      <div className="spread">
        <h1>{t("spaces.title")}</h1>
        <Link className="btn btn-primary" href="/venue/ruang/baru">
          {t("spaces.new")}
        </Link>
      </div>
      <div className="grid">
        {spaces.map((s) => {
          const img = coverUrl(s.media);
          return (
            <Link key={String(s.id)} className="card space-card" href={`/venue/ruang/${s.id}`}>
              {img ? <img src={img} alt="" /> : <div className="thumb-empty" />}
              <strong>{String(s.name)}</strong>
              <span className="row">
                <span className="badge">{t(`spaceStatus.${String(s.status)}`)}</span>
                <span className="small muted">{t("spaces.fromPrice", { price: rp(s.from_price) })}</span>
              </span>
              {s.review_reason ? <span className="small alert alert-warn">{String(s.review_reason)}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
