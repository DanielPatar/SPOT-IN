import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { requireOrganizerPage } from "@/web/view";
import { TeamPanel } from "@/components/TeamPanel";
import { Form, Submit } from "@/components/Form";
import { orgProfileAction } from "@/web/actions/venue";

export default async function OrganizerTeamPage() {
  const { session, organizer } = await requireOrganizerPage("/organizer/tim");
  const [o] = await db()`select display_name, legal_name, city, contact_email, contact_phone from organizations where id = ${organizer.orgId}`;
  return (
    <div>
      <h1>{t("team.organizerTitle")}</h1>
      {organizer.role === "owner" ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("settings.profile")}</h2>
          <Form action={orgProfileAction} encType="multipart/form-data">
            <input type="hidden" name="orgId" value={organizer.orgId} />
            <label>
              {t("settings.displayName")}
              <input name="displayName" required defaultValue={String(o!.display_name)} />
            </label>
            <label>
              {t("fields.legalNameOptional")}
              <input name="legalName" defaultValue={String(o!.legal_name ?? "")} />
            </label>
            <label>
              {t("fields.city")}
              <input name="city" defaultValue={String(o!.city ?? "")} />
            </label>
            <label>
              {t("settings.contactEmail")}
              <input type="email" name="contactEmail" defaultValue={String(o!.contact_email ?? "")} />
            </label>
            <label>
              {t("settings.logo")}
              <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" />
            </label>
            <Submit>{t("common.save")}</Submit>
          </Form>
        </div>
      ) : null}
      <TeamPanel userId={session.userId} m={organizer} path="/organizer/tim" />
    </div>
  );
}
