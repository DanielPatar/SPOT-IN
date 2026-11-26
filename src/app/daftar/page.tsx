import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { registrationOpen } from "@/lib/config";
import { Form, Submit } from "@/components/Form";
import { AuthShell } from "@/components/AuthShell";
import { PilotNotice } from "@/components/PilotNotice";
import { signUpAction } from "@/web/actions/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: registrationOpen() ? t("auth.signUpTitleOpen") : t("auth.signUpTitle") };
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const open = registrationOpen();
  return (
    <AuthShell>
      <h1>{open ? t("auth.signUpTitleOpen") : t("auth.signUpTitle")}</h1>
      <p className="muted">{open ? t("auth.signUpIntroOpen") : t("auth.signUpIntro")}</p>
      <PilotNotice />
      <div className="card shadow-float">
        <Form action={signUpAction}>
          <label>
            {t("fields.fullName")}
            <input name="name" required autoComplete="name" />
          </label>
          <label>
            {t("fields.email")}
            <input type="email" name="email" required defaultValue={email ?? ""} autoComplete="email" />
          </label>
          <label>
            {t("fields.passwordOptional")}
            <input type="password" name="password" minLength={10} autoComplete="new-password" aria-describedby="password-help" />
          </label>
          <p id="password-help" className="muted small" style={{ margin: 0 }}>
            {t("auth.passwordOptionalHelp")}
          </p>
          <label className="check">
            <input type="checkbox" name="age" required /> {t("auth.ageConfirm")}
          </label>
          <label className="check">
            <input type="checkbox" name="consent" required /> {t("auth.consent")}
          </label>
          <p className="small muted">{t("auth.spamHint")}</p>
          <Submit>{t("auth.signUpButton")}</Submit>
        </Form>
      </div>
      <p className="small muted">
        {t("auth.haveAccount")} <Link href="/masuk">{t("auth.loginLink")}</Link>
      </p>
    </AuthShell>
  );
}
