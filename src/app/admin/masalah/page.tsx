import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { requireAdminPage } from "@/web/session";
import { openProblemsQueue } from "@/server/lifecycle";
import { Form, Submit } from "@/components/Form";
import { Notice } from "@/components/kit";
import { AdminNav } from "../AdminNav";
import { resolveProblemAction } from "@/web/actions/after";

/** FR-M24-01/04, FR-M16-08: reported problems hold release until an Admin records the outcome. */
export default async function AdminProblemsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  await requireAdminPage();
  const { done } = await searchParams;
  const rows = await openProblemsQueue();
  return (
    <div>
      <h1>{t("adminProblems.title")}</h1>
      <AdminNav />
      {done ? <Notice tone="positive" className="alert-ok mb-3" title={t("adminProblems.resolved")} /> : null}
      {rows.length === 0 ? <p className="muted">{t("adminProblems.empty")}</p> : null}
      {rows.map((p) => (
        <div key={String(p.id)} className="card" data-testid="problem-item">
          <p className="m-0">
            <strong>{String(p.reference)}</strong> · {t("afterEvent.problemBy", { name: String(p.reporter ?? ""), side: t(`docs.sides.${String(p.side)}`) })} · <span className="small muted">{formatDateTime(p.created_at as Date, "Asia/Jakarta")}</span>
          </p>
          <p>{String(p.description)}</p>
          <p className="small"><Link href={`/admin/cari?q=${p.booking_id}`}>{t("adminProblems.findBooking")}</Link></p>
          <Form action={resolveProblemAction}>
            <input type="hidden" name="problemId" value={String(p.id)} />
            <fieldset>
              <legend>{t("adminProblems.outcome")}</legend>
              <label className="check"><input type="radio" name="outcome" value="release_as_is" defaultChecked /> {t("adminProblems.releaseAsIs")}</label>
              <label className="check"><input type="radio" name="outcome" value="adjusted" /> {t("adminProblems.adjust")}</label>
            </fieldset>
            <label>
              {t("adminProblems.adjustment")}
              <input name="adjustment" inputMode="numeric" />
            </label>
            <label>
              {t("adminProblems.note")}
              <textarea name="note" required rows={2} />
            </label>
            <Submit>{t("adminProblems.resolve")}</Submit>
          </Form>
        </div>
      ))}
    </div>
  );
}
