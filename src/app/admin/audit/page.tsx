import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { requireAdminPage } from "@/web/session";
import { adminAuditLog } from "@/server/admin";
import { AdminNav } from "../AdminNav";

/** FR-M24-08: append-only admin audit log. */
export default async function AdminAuditPage() {
  await requireAdminPage();
  const rows = await adminAuditLog(200);
  return (
    <div>
      <h1>{t("admin.auditTitle")}</h1>
      <AdminNav />
      <div className="card table-wrap">
        <table>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="small">{formatDateTime(r.at as Date, "Asia/Jakarta")}</td>
                <td className="small">{String(r.actor ?? "—")}</td>
                <td>
                  <code>{String(r.action)}</code>
                </td>
                <td className="small">
                  {String(r.entity)} {String(r.entity_id ?? "")}
                </td>
                <td className="small muted">{r.after ? JSON.stringify(r.after).slice(0, 120) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
