import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { config } from "@/lib/config";
import { Form, Submit } from "@/components/Form";
import { loginAction, magicLinkAction } from "@/web/actions/auth";
import { getSession } from "@/web/session";

export const metadata: Metadata = { title: t("auth.loginTitle") };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; deleted?: string; error?: string }> }) {
  const sp = await searchParams;
  if (await getSession()) redirect(sp.next ?? "/");
  const google = !!config().GOOGLE_CLIENT_ID;
  return (
    <div className="narrow">
      <h1>{t("auth.loginTitle")}</h1>
      {sp.deleted ? <p className="alert alert-ok">{t("account.deleted")}</p> : null}
      {sp.error ? <p className="alert alert-error">{t(`auth.oauth.${sp.error === "not_invited" ? "notInvited" : "failed"}`)}</p> : null}
      <div className="card">
        <Form action={loginAction}>
          <input type="hidden" name="next" value={sp.next ?? "/"} />
          <label>
            {t("fields.email")}
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            {t("fields.password")}
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          <Submit>{t("auth.loginButton")}</Submit>
          <Link href="/lupa-sandi" className="small">
            {t("auth.forgot")}
          </Link>
        </Form>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t("auth.magicTitle")}</h2>
        <p className="muted small">{t("auth.magicHelp")}</p>
        <Form action={magicLinkAction}>
          <label>
            {t("fields.email")}
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <Submit variant="secondary">{t("auth.magicButton")}</Submit>
        </Form>
      </div>
      {google ? (
        <a className="btn btn-secondary" href="/api/auth/google">
          {t("auth.google")}
        </a>
      ) : null}
      <p className="small muted">
        {t("auth.noAccount")} <Link href="/daftar">{t("auth.signUpLink")}</Link>
      </p>
    </div>
  );
}
