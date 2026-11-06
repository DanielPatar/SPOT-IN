import { t } from "@/lib/i18n";
import { Form, Submit } from "@/components/Form";
import { verifyEmailAction } from "@/web/actions/links";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="narrow card">
      <h1>{t("auth.verifyTitle")}</h1>
      <Form action={verifyEmailAction}>
        <input type="hidden" name="token" value={token ?? ""} />
        <Submit>{t("auth.verifyButton")}</Submit>
      </Form>
    </div>
  );
}
