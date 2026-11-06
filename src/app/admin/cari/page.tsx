import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/web/session";
import { adminSearch } from "@/server/admin";
import { Form, Submit } from "@/components/Form";
import { suspendAction } from "@/web/actions/admin";
import { AdminNav } from "../AdminNav";

function SuspendForm({ type, id, suspended }: { type: string; id: string; suspended: boolean }) {
  return (
    <Form action={suspendAction} className="form-inline">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      {suspended ? (
        <Submit name="op" value="unsuspend" variant="secondary">{t("admin.unsuspend")}</Submit>
      ) : (
        <>
          <input name="reason" placeholder={t("admin.reason")} aria-label={t("admin.reason")} />
          <Submit name="op" value="suspend" variant="danger">{t("admin.suspend")}</Submit>
        </>
      )}
    </Form>
  );
}

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminPage();
  const { q = "" } = await searchParams;
  const r = await adminSearch(q);
  return (
    <div>
      <h1>{t("admin.searchTitle")}</h1>
      <AdminNav />
      <form method="get" className="form-inline card">
        <label style={{ flex: 1 }}>
          {t("admin.searchLabel")}
          <input name="q" defaultValue={q} />
        </label>
        <button className="btn btn-primary">{t("search.submit")}</button>
      </form>
      {q ? (
        <div className="cols cols-even">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("admin.users")}</h2>
            {r.users.map((u) => (
              <div key={String(u.id)} className="small" style={{ marginBottom: 8 }}>
                <strong>{String(u.name)}</strong> · {String(u.email)} · <span className="badge">{String(u.status)}</span>
                {u.email_bounced_at ? <span className="badge badge-danger">{t("admin.bounced")}</span> : null}
                <SuspendForm type="user" id={String(u.id)} suspended={u.status === "suspended"} />
              </div>
            ))}
            <h2>{t("admin.orgs")}</h2>
            {r.orgs.map((o) => (
              <div key={String(o.id)} className="small" style={{ marginBottom: 8 }}>
                <strong>{String(o.display_name)}</strong> · {t(`orgKinds.${String(o.kind)}`)} · {t(`verification.${String(o.verification_status)}`)}
                <SuspendForm type="organization" id={String(o.id)} suspended={o.status === "suspended"} />
              </div>
            ))}
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("admin.spaces")}</h2>
            {r.spaces.map((s) => (
              <div key={String(s.id)} className="small" style={{ marginBottom: 8 }}>
                <strong>{String(s.name)}</strong> · {String(s.property_name)} · {t(`spaceStatus.${String(s.status)}`)}
                <SuspendForm type="space" id={String(s.id)} suspended={s.status === "suspended"} />
              </div>
            ))}
            <h2>{t("admin.enquiries")}</h2>
            {r.enquiries.map((e) => (
              <div key={String(e.id)} className="small">
                {String(e.event_name)} → {String(e.space_name)} · {t(`enquiryStatus.${String(e.status)}`)} · <code>{String(e.id)}</code>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
