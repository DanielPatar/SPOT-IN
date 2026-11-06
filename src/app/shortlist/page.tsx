import Link from "next/link";
import { t } from "@/lib/i18n";
import { requireOrganizerPage } from "@/web/view";
import { listShortlists } from "@/server/search";
import { Form, Submit } from "@/components/Form";
import { createShortlistAction } from "@/web/actions/organizer";

export default async function ShortlistsPage() {
  const { session } = await requireOrganizerPage("/shortlist");
  const lists = await listShortlists({ userId: session.userId });
  return (
    <div className="narrow">
      <h1>{t("shortlist.title")}</h1>
      {lists.map((l) => (
        <div className="card spread" key={String(l.id)}>
          <Link href={`/shortlist/${l.id}`}>{String(l.name)}</Link>
          <span className="small muted">{t("shortlist.items", { n: Number(l.items) })}</span>
        </div>
      ))}
      <div className="card">
        <Form action={createShortlistAction}>
          <label>
            {t("shortlist.newName")}
            <input name="name" required placeholder={t("shortlist.namePlaceholder")} />
          </label>
          <Submit>{t("shortlist.create")}</Submit>
        </Form>
      </div>
    </div>
  );
}
