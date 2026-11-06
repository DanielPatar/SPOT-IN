import { t } from "@/lib/i18n";
import { Form, Submit } from "@/components/Form";
import { forgotPasswordAction } from "@/web/actions/auth";

export default function ForgotPage() {
  return (
    <div className="narrow card">
      <h1>{t("auth.forgotTitle")}</h1>
      <Form action={forgotPasswordAction}>
        <label>
          {t("fields.email")}
          <input type="email" name="email" required />
        </label>
        <Submit>{t("auth.resetButton")}</Submit>
      </Form>
    </div>
  );
}
