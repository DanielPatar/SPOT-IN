import { t } from "@/lib/i18n";
import { Form, Submit } from "@/components/Form";
import { consumeMagicLinkAction } from "@/web/actions/links";

/** Magic links are consumed by an explicit click so that email scanners can't use them up. */
export default async function MagicLinkPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="narrow card">
      <h1>{t("auth.magicConfirmTitle")}</h1>
      <Form action={consumeMagicLinkAction}>
        <input type="hidden" name="token" value={token ?? ""} />
        <Submit>{t("auth.magicConfirmButton")}</Submit>
      </Form>
    </div>
  );
}
