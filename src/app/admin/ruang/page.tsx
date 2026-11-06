import Link from "next/link";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/web/session";
import { spaceReviewQueue } from "@/server/admin";
import { Form, Submit } from "@/components/Form";
import { spaceReviewAction } from "@/web/actions/admin";
import { AdminNav } from "../AdminNav";

export default async function AdminSpacesPage() {
  await requireAdminPage();
  const rows = await spaceReviewQueue();
  return (
    <div>
      <h1>{t("admin.spaceReviewTitle")}</h1>
      <AdminNav />
      {rows.length === 0 ? <p className="muted">{t("admin.queueEmpty")}</p> : null}
      {rows.map((s) => (
        <div className="card" key={String(s.id)} data-testid="space-review-item">
          <div className="spread">
            <h2 style={{ marginTop: 0 }}>
              <Link href={`/ruang/${s.id}`}>{String(s.name)}</Link>
            </h2>
            <span className={`badge ${s.verification_status === "verified" ? "badge-ok" : "badge-warn"}`}>{t(`verification.${String(s.verification_status)}`)}</span>
          </div>
          <p className="small">
            {String(s.operator)} · {String(s.property_name)} · {String(s.city)} · {t(`spaceTypes.${String(s.type)}`)}
          </p>
          <div className="cols cols-even">
            <Form action={spaceReviewAction}>
              <input type="hidden" name="spaceId" value={String(s.id)} />
              <Submit name="op" value="approve">{t("admin.approve")}</Submit>
            </Form>
            <Form action={spaceReviewAction}>
              <input type="hidden" name="spaceId" value={String(s.id)} />
              <label>
                {t("admin.rejectReason")}
                <input name="reason" />
              </label>
              <Submit name="op" value="reject" variant="danger">{t("admin.reject")}</Submit>
            </Form>
          </div>
        </div>
      ))}
    </div>
  );
}
