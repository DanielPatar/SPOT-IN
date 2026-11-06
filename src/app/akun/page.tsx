import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { Form, Submit } from "@/components/Form";
import { TotpSetup } from "@/components/TotpSetup";
import { profileAction, revokeSessionAction, deleteAccountAction } from "@/web/actions/auth";
import { requireSession } from "@/web/session";
import { listSessions, deletionBlockers } from "@/server/accounts";

export const metadata: Metadata = { title: t("account.title") };

export default async function AccountPage() {
  const s = await requireSession("/akun");
  const [u] = await db()`select name, email, phone, notification_prefs, totp_enabled_at from users where id = ${s.userId}`;
  const sessions = await listSessions(s.userId);
  const blockers = await deletionBlockers(s.userId);
  const prefs = (u!.notification_prefs ?? {}) as { emailOptional?: boolean };
  return (
    <div className="cols cols-even">
      <div>
        <h1>{t("account.title")}</h1>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("account.profile")}</h2>
          <Form action={profileAction}>
            <label>
              {t("fields.fullName")}
              <input name="name" defaultValue={String(u!.name)} required />
            </label>
            <label>
              {t("fields.email")}
              <input value={String(u!.email)} disabled />
            </label>
            <label>
              {t("fields.contactPhoneOptional")}
              <input name="phone" defaultValue={String(u!.phone ?? "")} inputMode="tel" />
              <span className="small muted">{t("account.phoneHelp")}</span>
            </label>
            <label className="check">
              <input type="checkbox" name="emailOptional" defaultChecked={prefs.emailOptional !== false} /> {t("account.emailOptional")}
            </label>
            <p className="small muted">{t("account.transactionalNote")}</p>
            <Submit>{t("common.save")}</Submit>
          </Form>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("account.twoFactor")}</h2>
          {u!.totp_enabled_at ? <p className="badge badge-ok">{t("account.twoFactorOn")}</p> : <TotpSetup next="/akun" />}
        </div>
      </div>
      <div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("account.sessions")}</h2>
          <ul>
            {sessions.map((x) => (
              <li key={String(x.id)} className="spread">
                <span className="small">
                  {String(x.user_agent ?? t("account.unknownDevice")).slice(0, 60)} · {formatDateTime(x.last_seen_at as Date, "Asia/Jakarta")}
                  {String(x.id) === s.sessionId ? <strong> {t("account.thisDevice")}</strong> : null}
                </span>
                {String(x.id) !== s.sessionId ? (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="sessionId" value={String(x.id)} />
                    <button className="link-btn small" type="submit">
                      {t("account.revoke")}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("account.yourData")}</h2>
          <p className="small">{t("account.exportHelp")}</p>
          <a className="btn btn-secondary" href="/api/akun/ekspor">
            {t("account.export")}
          </a>
          <h3>{t("account.delete")}</h3>
          {blockers.length ? (
            <p className="alert alert-warn small">{t("account.deletionBlocked", { orgs: blockers.join(", ") })}</p>
          ) : (
            <Form action={deleteAccountAction}>
              <p className="small">{t("account.deleteHelp")}</p>
              <label>
                {t("account.typeHapus")}
                <input name="confirm" autoComplete="off" />
              </label>
              <Submit variant="danger">{t("account.deleteButton")}</Submit>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
