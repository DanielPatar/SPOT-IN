import { t } from "@/lib/i18n";
import { config } from "@/lib/config";
import { requireVenuePage, fileUrl } from "@/web/view";
import { propertyOfVenue, PROPERTY_TYPES, WEEKDAYS } from "@/server/listings";
import { Form, Submit } from "@/components/Form";
import { MapPicker } from "@/components/MapPicker";
import { savePropertyAction } from "@/web/actions/venue";
import { TIMEZONES } from "@/lib/time";

export default async function PropertyPage() {
  const { session } = await requireVenuePage("/venue/properti");
  const { property: p } = await propertyOfVenue({ userId: session.userId });
  const cfg = config();
  const hours = (p?.operating_hours ?? {}) as Record<string, { open: string; close: string } | null>;
  const docs = ((p?.required_docs ?? []) as { name: string; mandatory: boolean; dueOffsetDays: number }[]).concat(Array(3).fill({ name: "", mandatory: false, dueOffsetDays: 7 }));
  const photos = (p?.photos ?? []) as { fileId: string }[];
  return (
    <div>
      <h1>{p ? t("property.editTitle") : t("property.newTitle")}</h1>
      <Form action={savePropertyAction} encType="multipart/form-data">
        <div className="cols cols-even">
          <fieldset>
            <legend>{t("property.basics")}</legend>
            <label>
              {t("property.name")}
              <input name="name" required defaultValue={String(p?.name ?? "")} />
            </label>
            <label>
              {t("property.type")}
              <select name="type" defaultValue={String(p?.type ?? "mall")}>
                {PROPERTY_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {t(`propertyTypes.${x}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("property.address")}
              <textarea name="addressText" required defaultValue={String(p?.address_text ?? "")} />
            </label>
            <label>
              {t("fields.city")}
              <input name="city" required defaultValue={String(p?.city ?? "")} list="cities" />
            </label>
            <datalist id="cities">
              {["Jakarta Selatan", "Jakarta Pusat", "Jakarta Barat", "Jakarta Timur", "Jakarta Utara", "Tangerang", "Tangerang Selatan", "Bekasi", "Depok", "Bogor", "Bandung", "Surabaya", "Denpasar", "Medan", "Yogyakarta", "Semarang", "Makassar"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <label>
              {t("property.area")}
              <input name="area" defaultValue={String(p?.area ?? "")} />
            </label>
            <label>
              {t("property.timezone")}
              <select name="timezone" defaultValue={String(p?.timezone ?? "")}>
                <option value="">{t("property.timezoneAuto")}</option>
                {Object.entries(TIMEZONES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <fieldset>
            <legend>{t("property.mapPin")}</legend>
            <MapPicker lat={p?.lat == null ? null : Number(p.lat)} lon={p?.lon == null ? null : Number(p.lon)} tileUrl={cfg.MAP_TILE_URL} attribution={cfg.MAP_TILE_ATTRIBUTION} />
            {!p?.lat ? <p className="alert alert-warn small">{t("property.pinRequiredNote")}</p> : null}
          </fieldset>
        </div>
        <fieldset>
          <legend>{t("property.hours")}</legend>
          {WEEKDAYS.map((d) => (
            <div className="form-inline" key={d}>
              <span style={{ width: 70 }}>{t(`weekdays.${d}`)}</span>
              <label>
                <span className="sr-only">{t("property.open")}</span>
                <input type="time" name={`${d}_open`} defaultValue={hours[d]?.open ?? "10:00"} />
              </label>
              <label>
                <span className="sr-only">{t("property.close")}</span>
                <input type="time" name={`${d}_close`} defaultValue={hours[d]?.close ?? "22:00"} />
              </label>
              <label className="check">
                <input type="checkbox" name={`${d}_closed`} defaultChecked={p ? hours[d] === null || hours[d] === undefined : false} /> {t("property.closed")}
              </label>
            </div>
          ))}
        </fieldset>
        <div className="cols cols-even">
          <fieldset>
            <legend>{t("property.notes")}</legend>
            <label>
              {t("property.parking")}
              <textarea name="parkingNotes" defaultValue={String(p?.parking_notes ?? "")} />
            </label>
            <label>
              {t("property.loading")}
              <textarea name="loadingNotes" defaultValue={String(p?.loading_notes ?? "")} />
            </label>
            <label>
              {t("property.houseRules")}
              <textarea name="houseRules" defaultValue={String(p?.house_rules ?? "")} />
            </label>
          </fieldset>
          <fieldset>
            <legend>{t("property.requiredDocs")}</legend>
            <p className="small muted">{t("property.requiredDocsHelp")}</p>
            {docs.map((d, i) => (
              <div className="form-inline" key={i}>
                <label style={{ flex: 2 }}>
                  {t("property.docName")}
                  <input name="docName" defaultValue={d.name} />
                </label>
                <label style={{ width: 110 }}>
                  {t("property.docDue")}
                  <input name="docDue" type="number" min={0} defaultValue={d.dueOffsetDays} />
                </label>
                <label className="check">
                  <input type="checkbox" name="docMandatory" value={String(i)} defaultChecked={d.mandatory} /> {t("property.mandatory")}
                </label>
              </div>
            ))}
          </fieldset>
        </div>
        <fieldset>
          <legend>{t("property.photos")}</legend>
          <div className="gallery">
            {photos.map((ph) => (
              <img key={ph.fileId} className="thumb" src={fileUrl(ph.fileId)} alt={t("property.photoAlt")} />
            ))}
          </div>
          <label>
            {t("property.addPhotos")}
            <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" />
          </label>
        </fieldset>
        <Submit>{t("common.save")}</Submit>
      </Form>
    </div>
  );
}
