import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { requireVenuePage, rp } from "@/web/view";
import { venueAddOnsAndTax } from "@/server/listings";
import { savedReplies } from "@/server/messaging";
import { Form, Submit } from "@/components/Form";
import { orgProfileAction, thresholdAction, taxAction, addOnAction, removeAddOnAction, savedReplyAction, removeSavedReplyAction } from "@/web/actions/venue";
import { can } from "@/lib/permissions";

export default async function VenueSettingsPage() {
  const { session, venue } = await requireVenuePage("/venue/pengaturan");
  const a = { userId: session.userId };
  const { addOns, tax, threshold } = await venueAddOnsAndTax(a);
  const replies = await savedReplies(a);
  const [o] = await db()`select display_name, legal_name, city, contact_email, contact_phone from organizations where id = ${venue.orgId}`;
  const owner = venue.role === "owner";
  const edit = can("venue_operator", venue.role, "listing.edit");
  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <div className="cols cols-even">
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("settings.profile")}</h2>
            <Form action={orgProfileAction} encType="multipart/form-data">
              <input type="hidden" name="orgId" value={venue.orgId} />
              <label>
                {t("settings.displayName")}
                <input name="displayName" required defaultValue={String(o!.display_name)} disabled={!owner} />
              </label>
              <label>
                {t("fields.legalNameOptional")}
                <input name="legalName" defaultValue={String(o!.legal_name ?? "")} disabled={!owner} />
              </label>
              <label>
                {t("fields.city")}
                <input name="city" defaultValue={String(o!.city ?? "")} disabled={!owner} />
              </label>
              <label>
                {t("settings.contactEmail")}
                <input type="email" name="contactEmail" defaultValue={String(o!.contact_email ?? "")} disabled={!owner} />
              </label>
              <label>
                {t("fields.contactPhoneOptional")}
                <input name="contactPhone" defaultValue={String(o!.contact_phone ?? "")} disabled={!owner} />
              </label>
              <label>
                {t("settings.logo")}
                <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" disabled={!owner} />
              </label>
              {owner ? <Submit>{t("common.save")}</Submit> : null}
            </Form>
          </div>
          {owner ? (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{t("settings.threshold")}</h2>
              <p className="small muted">{t("settings.thresholdHelp")}</p>
              <Form action={thresholdAction}>
                <input type="hidden" name="orgId" value={venue.orgId} />
                <label>
                  {t("settings.thresholdAmount")}
                  <input name="threshold" inputMode="numeric" defaultValue={threshold ? String(threshold) : ""} placeholder="50.000.000" />
                </label>
                <Submit>{t("common.save")}</Submit>
              </Form>
            </div>
          ) : null}
          {owner ? (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{t("settings.tax")}</h2>
              <Form action={taxAction}>
                <label className="check">
                  <input type="checkbox" name="isPkp" defaultChecked={!!tax.is_pkp} /> {t("settings.isPkp")}
                </label>
                <label>
                  {t("settings.serviceCharge")}
                  <input name="serviceCharge" inputMode="decimal" defaultValue={String(Number(tax.service_charge_bps) / 100)} />
                </label>
                <p className="small muted">{t("settings.taxHelp")}</p>
                <Submit>{t("common.save")}</Submit>
              </Form>
            </div>
          ) : null}
        </div>
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("settings.addOns")}</h2>
            <table>
              <tbody>
                {addOns.map((x) => (
                  <tr key={String(x.id)}>
                    <td>
                      {String(x.name)}
                      {x.mandatory ? <span className="badge">{t("settings.mandatory")}</span> : null}
                    </td>
                    <td className="small">
                      {rp(x.price)} {t(`addOnUnits.${String(x.unit)}`)}
                    </td>
                    <td>
                      {edit ? (
                        <form action={removeAddOnAction}>
                          <input type="hidden" name="id" value={String(x.id)} />
                          <button className="link-btn small">{t("common.remove")}</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {edit ? (
              <Form action={addOnAction} resetOnOk>
                <label>
                  {t("settings.addOnName")}
                  <input name="name" required placeholder={t("settings.addOnExample")} />
                </label>
                <div className="form-inline">
                  <label>
                    {t("settings.addOnUnit")}
                    <select name="unit">
                      {["per_day", "per_kva_day", "per_person", "per_item"].map((u) => (
                        <option key={u} value={u}>
                          {t(`addOnUnits.${u}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("settings.price")}
                    <input name="price" inputMode="numeric" required />
                  </label>
                </div>
                <label className="check">
                  <input type="checkbox" name="taxable" defaultChecked /> {t("settings.taxable")}
                </label>
                <label className="check">
                  <input type="checkbox" name="mandatory" /> {t("settings.mandatory")}
                </label>
                <Submit variant="secondary">{t("settings.addAddOn")}</Submit>
              </Form>
            ) : null}
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("settings.savedReplies")}</h2>
            {replies.map((r) => (
              <div key={String(r.id)} className="small spread">
                <span>
                  <strong>{String(r.title)}</strong> — {String(r.body).slice(0, 80)}
                </span>
                {edit ? (
                  <form action={removeSavedReplyAction}>
                    <input type="hidden" name="id" value={String(r.id)} />
                    <button className="link-btn small">{t("common.remove")}</button>
                  </form>
                ) : null}
              </div>
            ))}
            {edit ? (
              <Form action={savedReplyAction} resetOnOk>
                <label>
                  {t("settings.replyTitle")}
                  <input name="title" required />
                </label>
                <label>
                  {t("settings.replyBody")}
                  <textarea name="body" required />
                </label>
                <Submit variant="secondary">{t("settings.addReply")}</Submit>
              </Form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
