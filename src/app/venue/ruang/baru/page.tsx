import { t } from "@/lib/i18n";
import { requireVenuePage } from "@/web/view";
import { Form, Submit } from "@/components/Form";
import { SpaceFields } from "@/components/SpaceFields";
import { createSpaceAction } from "@/web/actions/venue";

export default async function NewSpacePage() {
  await requireVenuePage("/venue/ruang/baru");
  return (
    <div>
      <h1>{t("spaces.new")}</h1>
      <Form action={createSpaceAction}>
        <SpaceFields s={null} />
        <Submit>{t("spaces.createDraft")}</Submit>
      </Form>
    </div>
  );
}
