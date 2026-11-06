import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { requireSession } from "@/web/session";
import { TotpSetup } from "@/components/TotpSetup";
import { Form, Submit } from "@/components/Form";
import { passTotpAction } from "@/web/actions/auth";

/** FR-M1-03 / FR-M24-12: Admins must enrol and pass TOTP before reaching admin pages. */
export default async function Admin2faPage() {
  const s = await requireSession("/admin/2fa");
  if (!s.isAdmin) redirect("/");
  if (s.twoFactorEnabled && s.twoFactorPassed) redirect("/admin");
  return (
    <div className="narrow card">
      <h1>{t("admin.twoFactorTitle")}</h1>
      {s.twoFactorEnabled ? (
        <Form action={passTotpAction}>
          <label>
            {t("account.twoFactorCode")}
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" />
          </label>
          <Submit>{t("admin.verifyCode")}</Submit>
        </Form>
      ) : (
        <>
          <p>{t("admin.twoFactorRequired")}</p>
          <TotpSetup next="/admin" />
        </>
      )}
    </div>
  );
}
