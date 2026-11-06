import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { requireVenuePage, fileUrl, rp } from "@/web/view";
import { spaceForVenue } from "@/server/listings";
import { PermissionError } from "@/lib/permissions";
import { Form, Submit } from "@/components/Form";
import { SpaceFields } from "@/components/SpaceFields";
import { updateSpaceAction, spacePhotosAction, rateCardAction, addSeasonAction, removeSeasonAction, spaceStatusAction } from "@/web/actions/venue";
import { formatDate } from "@/lib/time";
import { can } from "@/lib/permissions";

export default async function EditSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, venue } = await requireVenuePage(`/venue/ruang/${id}`);
  let data;
  try {
    data = await spaceForVenue({ userId: session.userId }, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const { space: s, rateCard: rc, seasons } = data;
  const media = (s.media ?? []) as { fileId: string; caption?: string; cover?: boolean }[];
  const status = String(s.status);
  const edit = can("venue_operator", venue.role, "listing.edit");
  return (
    <div>
      <div className="spread">
        <h1>{String(s.name)}</h1>
        <div className="row">
          <span className="badge">{t(`spaceStatus.${status}`)}</span>
          <Link href={`/venue/ruang/${id}/kalender`}>{t("venueHome.calendar")}</Link>
          {status === "published" ? <Link href={`/ruang/${id}`}>{t("spaces.viewPublic")}</Link> : null}
        </div>
      </div>
      {s.review_reason ? <p className="alert alert-warn">{t("spaces.reviewReason", { reason: String(s.review_reason) })}</p> : null}
      {edit ? (
        <Form action={spaceStatusAction} className="form-inline">
          <input type="hidden" name="spaceId" value={id} />
          {status === "draft" ? <Submit name="op" value="submit">{t("spaces.submit")}</Submit> : null}
          {status === "published" ? <Submit name="op" value="unpublish" variant="secondary">{t("spaces.unpublish")}</Submit> : null}
          {status === "unpublished" ? <Submit name="op" value="publish">{t("spaces.publish")}</Submit> : null}
          <Submit name="op" value="duplicate" variant="secondary">{t("spaces.duplicate")}</Submit>
        </Form>
      ) : null}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t("spaces.photosTitle")}</h2>
        <Form action={spacePhotosAction} encType="multipart/form-data">
          <input type="hidden" name="spaceId" value={id} />
          <div className="gallery">
            {media.map((m) => (
              <div key={m.fileId} className="form">
                <img className="thumb" src={fileUrl(m.fileId)} alt={m.caption || t("spaces.photoAlt")} />
                <input name={`caption_${m.fileId}`} defaultValue={m.caption ?? ""} aria-label={t("spaces.caption")} placeholder={t("spaces.caption")} />
                <label className="check small">
                  <input type="radio" name="cover" value={m.fileId} defaultChecked={!!m.cover} /> {t("spaces.cover")}
                </label>
                <label className="check small">
                  <input type="checkbox" name="remove" value={m.fileId} /> {t("spaces.removePhoto")}
                </label>
              </div>
            ))}
          </div>
          <label>
            {t("spaces.addPhotos", { n: 15 - media.length })}
            <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" />
          </label>
          {edit ? <Submit variant="secondary">{t("spaces.savePhotos")}</Submit> : null}
        </Form>
      </div>
      <div className="cols cols-even">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("rateCard.title")}</h2>
          <Form action={rateCardAction}>
            <input type="hidden" name="spaceId" value={id} />
            <label>
              {t("rateCard.unit")}
              <select name="unit" defaultValue={String(rc?.unit ?? "day")}>
                {["day", "half_day", "hour"].map((u) => (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-inline">
              <label>
                {t("rateCard.weekday")}
                <input name="weekdayPrice" inputMode="numeric" required defaultValue={rc ? String(rc.weekday_price) : ""} />
              </label>
              <label>
                {t("rateCard.weekend")}
                <input name="weekendPrice" inputMode="numeric" defaultValue={rc?.weekend_price != null ? String(rc.weekend_price) : ""} />
              </label>
            </div>
            <div className="form-inline">
              <label>
                {t("rateCard.minUnits")}
                <input name="minUnits" type="number" min={1} defaultValue={String(rc?.min_units ?? 1)} />
              </label>
              <label>
                {t("rateCard.minSpend")}
                <input name="minSpend" inputMode="numeric" defaultValue={rc?.min_spend != null ? String(rc.min_spend) : ""} />
              </label>
            </div>
            <label>
              {t("rateCard.display")}
              <select name="display" defaultValue={rc?.show_full_rate_card === false ? "from" : "full"}>
                <option value="full">{t("rateCard.showFull")}</option>
                <option value="from">{t("rateCard.showFrom")}</option>
              </select>
            </label>
            <label>
              {t("rateCard.fromPrice")}
              <input name="fromPrice" inputMode="numeric" defaultValue={rc ? String(rc.from_price) : ""} />
              <span className="small muted">{t("rateCard.fromHelp")}</span>
            </label>
            {edit ? <Submit>{t("common.save")}</Submit> : null}
          </Form>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("rateCard.seasons")}</h2>
          <table>
            <tbody>
              {seasons.map((x) => (
                <tr key={String(x.id)}>
                  <td>{String(x.name)}</td>
                  <td className="small">
                    {formatDate(String(x.start_date instanceof Date ? x.start_date.toISOString().slice(0, 10) : x.start_date))} – {formatDate(String(x.end_date instanceof Date ? x.end_date.toISOString().slice(0, 10) : x.end_date))}
                  </td>
                  <td>{rp(x.price)}</td>
                  <td>
                    {edit ? (
                      <form action={removeSeasonAction}>
                        <input type="hidden" name="spaceId" value={id} />
                        <input type="hidden" name="seasonId" value={String(x.id)} />
                        <button className="link-btn small">{t("common.remove")}</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {edit ? (
            <Form action={addSeasonAction} resetOnOk>
              <input type="hidden" name="spaceId" value={id} />
              <label>
                {t("rateCard.seasonName")}
                <input name="name" required placeholder={t("rateCard.seasonExample")} />
              </label>
              <div className="form-inline">
                <label>
                  {t("rateCard.from")}
                  <input type="date" name="startDate" required />
                </label>
                <label>
                  {t("rateCard.to")}
                  <input type="date" name="endDate" required />
                </label>
                <label>
                  {t("rateCard.pricePerUnit")}
                  <input name="price" inputMode="numeric" required />
                </label>
              </div>
              <Submit variant="secondary">{t("rateCard.addSeason")}</Submit>
            </Form>
          ) : null}
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t("spaces.details")}</h2>
        <Form action={updateSpaceAction}>
          <input type="hidden" name="spaceId" value={id} />
          <SpaceFields s={s} />
          {edit ? <Submit>{t("common.save")}</Submit> : null}
        </Form>
      </div>
    </div>
  );
}
