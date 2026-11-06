import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { requireAdminPage } from "@/web/session";
import { listPilotInvites } from "@/server/admin";
import { Form, Submit } from "@/components/Form";
import { invitePilotAction, revokePilotInviteAction } from "@/web/actions/admin";
import { AdminNav } from "../AdminNav";

export default async function AdminInvitesPage() {
  await requireAdminPage();
  const rows = await listPilotInvites();
  return (
    <div>
      <h1>{t("admin.invitesTitle")}</h1>
      <AdminNav />
      <div className="card">
        <Form action={invitePilotAction} className="form-inline" resetOnOk>
          <label style={{ flex: 1 }}>
            {t("fields.email")}
            <input type="email" name="email" required />
          </label>
          <label>
            {t("admin.roleHint")}
            <select name="roleHint" defaultValue="both">
              {["venue", "organizer", "both"].map((r) => (
                <option key={r} value={r}>
                  {t(`admin.roleHints.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <Submit>{t("admin.sendInvite")}</Submit>
        </Form>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("fields.email")}</th>
              <th>{t("admin.roleHint")}</th>
              <th>{t("admin.status")}</th>
              <th>{t("admin.expires")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.email)}</td>
                <td>{t(`admin.roleHints.${String(r.role_hint)}`)}</td>
                <td>
                  <span className="badge">{t(`admin.inviteStatus.${String(r.status)}`)}</span>
                </td>
                <td className="small">{formatDateTime(r.expires_at as Date, "Asia/Jakarta")}</td>
                <td>
                  {r.status === "pending" ? (
                    <form action={revokePilotInviteAction}>
                      <input type="hidden" name="id" value={String(r.id)} />
                      <button className="link-btn small">{t("team.revoke")}</button>
                    </form>
                  ) : r.status === "expired" ? (
                    <Form action={invitePilotAction}>
                      <input type="hidden" name="email" value={String(r.email)} />
                      <input type="hidden" name="roleHint" value={String(r.role_hint)} />
                      <Submit variant="secondary">{t("team.resend")}</Submit>
                    </Form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
