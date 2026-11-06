import { t } from "@/lib/i18n";
import { Form, Submit } from "@/components/Form";
import { resendVerificationAction } from "@/web/actions/auth";
import { requireSession } from "@/web/session";

export default async function ResendPage() {
  const s = await requireSession("/akun/verifikasi");
  return (
    <div className="narrow card">
      <h1>{t("auth.verifyTitle")}</h1>
      <p>{s.emailVerified ? t("auth.alreadyVerified") : t("auth.verifyExplain", { email: s.email })}</p>
      <p className="small muted">{t("auth.spamHint")}</p>
      {!s.emailVerified ? (
        <Form action={resendVerificationAction}>
          <Submit>{t("auth.resendVerification")}</Submit>
        </Form>
      ) : null}
    </div>
  );
}
