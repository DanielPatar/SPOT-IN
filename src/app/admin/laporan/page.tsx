import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { requireAdminPage } from "@/web/session";
import { reportsQueue } from "@/server/admin";
import { Form, Submit } from "@/components/Form";
import { reportDecisionAction } from "@/web/actions/admin";
import { AdminNav } from "../AdminNav";

export default async function AdminReportsPage() {
  await requireAdminPage();
  const rows = await reportsQueue();
  return (
    <div>
      <h1>{t("admin.reportsTitle")}</h1>
      <AdminNav />
      {rows.length === 0 ? <p className="muted">{t("admin.queueEmpty")}</p> : null}
      {rows.map((r) => (
        <div className="card" key={String(r.id)}>
          <p>
            <span className="badge">{t(`admin.subjects.${String(r.subject_type)}`)}</span> {String(r.reason)} · {String(r.reporter ?? "")} · {formatDateTime(r.created_at as Date, "Asia/Jakarta")}
          </p>
          {r.text ? <p className="small">{String(r.text)}</p> : null}
          <p className="small muted">{String(r.subject_id)}</p>
          <Form action={reportDecisionAction} className="form-inline">
            <input type="hidden" name="reportId" value={String(r.id)} />
            <label style={{ flex: 1 }}>
              {t("admin.note")}
              <input name="note" />
            </label>
            <Submit name="op" value="dismiss" variant="secondary">{t("admin.dismiss")}</Submit>
            <Submit name="op" value="action" variant="danger">{t("admin.actionSubject")}</Submit>
          </Form>
        </div>
      ))}
    </div>
  );
}
