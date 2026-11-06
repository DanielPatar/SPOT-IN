import Link from "next/link";
import { t } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { requireSession } from "@/web/session";
import { markNotificationsReadAction } from "@/web/actions/auth";

export default async function NotificationsPage() {
  const s = await requireSession("/notifikasi");
  const rows = await db()`select id, title, body, link, read_at, created_at from notifications where user_id = ${s.userId} order by created_at desc limit 100`;
  return (
    <div className="narrow">
      <div className="spread">
        <h1>{t("notifications.title")}</h1>
        <form action={markNotificationsReadAction}>
          <button className="btn btn-secondary" type="submit">
            {t("notifications.markAllRead")}
          </button>
        </form>
      </div>
      {rows.length === 0 ? <p className="muted">{t("notifications.empty")}</p> : null}
      {rows.map((n) => (
        <div key={String(n.id)} className="card" style={{ opacity: n.read_at ? 0.7 : 1 }}>
          <div className="spread">
            <strong>{String(n.title)}</strong>
            <span className="small muted">{formatDateTime(n.created_at as Date, "Asia/Jakarta")}</span>
          </div>
          <p className="small" style={{ margin: "4px 0" }}>
            {String(n.body ?? "")}
          </p>
          {n.link ? <Link href={String(n.link)}>{t("notifications.open")}</Link> : null}
        </div>
      ))}
    </div>
  );
}
