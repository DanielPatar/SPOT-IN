import { t } from "@/lib/i18n";
import { config } from "@/lib/config";
import { now, clockOffsetMs } from "@/lib/clock";
import { formatDateTime } from "@/lib/time";
import { requireAdminPage } from "@/web/session";
import { verificationQueue, spaceReviewQueue, reportsQueue } from "@/server/admin";
import { Form, Submit } from "@/components/Form";
import { demoClockAction, runJobsAction } from "@/web/actions/admin";
import { AdminNav } from "./AdminNav";

export default async function AdminHome() {
  await requireAdminPage();
  const [v, s, r] = await Promise.all([verificationQueue(), spaceReviewQueue(), reportsQueue()]);
  const cfg = config();
  const offset = await clockOffsetMs();
  return (
    <div>
      <h1>{t("admin.title")}</h1>
      <AdminNav />
      <div className="grid">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("admin.navItems.verifikasi")}</h2>
          <p className="price">{v.length}</p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("admin.navItems.ruang")}</h2>
          <p className="price">{s.length}</p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("admin.navItems.laporan")}</h2>
          <p className="price">{r.length}</p>
        </div>
      </div>
      {cfg.demoClockEnabled ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("admin.demoClock")}</h2>
          <p className="small">
            {t("admin.clockNow", { at: formatDateTime(await now(), "Asia/Jakarta") })} · {t("admin.clockOffset", { hours: Math.round(offset / 3600_000) })}
          </p>
          <Form action={demoClockAction} className="form-inline">
            <label style={{ width: 100 }}>
              {t("admin.days")}
              <input name="days" type="number" min={0} defaultValue={0} />
            </label>
            <label style={{ width: 100 }}>
              {t("admin.hours")}
              <input name="hours" type="number" min={0} defaultValue={0} />
            </label>
            <Submit>{t("admin.moveClock")}</Submit>
          </Form>
          <p className="small muted">{t("admin.clockHelp")}</p>
        </div>
      ) : null}
      <Form action={runJobsAction} className="form-inline">
        <Submit variant="secondary">{t("admin.runJobs")}</Submit>
      </Form>
    </div>
  );
}
