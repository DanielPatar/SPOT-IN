import { t } from "@/lib/i18n";
import { Form, Submit } from "@/components/Form";
import { resetPasswordAction } from "@/web/actions/auth";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="narrow card">
      <h1>{t("auth.newPasswordTitle")}</h1>
      <Form action={resetPasswordAction}>
        <input type="hidden" name="token" value={token ?? ""} />
        <label>
          {t("fields.newPassword")}
          <input type="password" name="password" required minLength={10} autoComplete="new-password" />
        </label>
        <Submit>{t("common.save")}</Submit>
      </Form>
    </div>
  );
}
