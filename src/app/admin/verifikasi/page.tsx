import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { requireAdminPage } from "@/web/session";
import { verificationQueue } from "@/server/admin";
import { Form, Submit } from "@/components/Form";
import { verificationAction } from "@/web/actions/admin";
import { AdminNav } from "../AdminNav";

/** FR-M3-02, FR-M3-09: manual check by call or chat; only date, method and outcome are recorded. */
export default async function AdminVerificationPage() {
  await requireAdminPage();
  const rows = await verificationQueue();
  return (
    <div>
      <h1>{t("admin.verificationTitle")}</h1>
      <AdminNav />
      <p className="small muted">{t("admin.verificationHelp")}</p>
      {rows.length === 0 ? <p className="muted">{t("admin.queueEmpty")}</p> : null}
      {rows.map((o) => (
        <div className="card" key={String(o.id)} data-testid="verification-item">
          <div className="spread">
            <h2 style={{ marginTop: 0 }}>{String(o.display_name)}</h2>
            <span className="badge">{t(`orgKinds.${String(o.kind)}`)}</span>
          </div>
          <p className="small">
            {String(o.legal_name ?? "")} · {String(o.city ?? "")} · {String(o.owners ?? "")} · {String(o.contact_phone ?? "")}
            <br />
            {t("admin.submittedAt", { at: formatDateTime(o.verification_submitted_at as Date, "Asia/Jakarta") })}
          </p>
          <div className="cols cols-even">
            <Form action={verificationAction}>
              <input type="hidden" name="orgId" value={String(o.id)} />
              <label>
                {t("admin.method")}
                <select name="method" defaultValue="call">
                  {["call", "chat", "meeting"].map((m) => (
                    <option key={m} value={m}>
                      {t(`admin.methods.${m}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("admin.note")}
                <input name="note" />
              </label>
              <Submit name="op" value="verify">{t("admin.verify")}</Submit>
            </Form>
            <Form action={verificationAction}>
              <input type="hidden" name="orgId" value={String(o.id)} />
              <label>
                {t("admin.rejectReason")}
                <input name="reason" />
              </label>
              <Submit name="op" value="reject" variant="danger">{t("admin.reject")}</Submit>
            </Form>
          </div>
        </div>
      ))}
    </div>
  );
}
