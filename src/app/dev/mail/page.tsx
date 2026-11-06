import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Email outbox viewer for development and the demo environment only (never in the pilot). */
export default async function DevMailPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  if (config().APP_ENV === "pilot") notFound();
  const { to } = await searchParams;
  const rows = to
    ? await db()`select * from email_outbox where to_email = ${to} order by created_at desc limit 50`
    : await db()`select * from email_outbox order by created_at desc limit 50`;
  return (
    <div>
      <h1>{t("dev.mailTitle")}</h1>
      <p className="small muted">{t("dev.mailHelp")}</p>
      {rows.map((m) => (
        <div className="card" key={String(m.id)} data-testid="mail">
          <div className="spread small">
            <strong>{String(m.to_email)}</strong>
            <span className="muted">{formatDateTime(m.created_at as Date, "Asia/Jakarta")}</span>
          </div>
          <h3>{String(m.subject)}</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{String(m.text_body)}</pre>
        </div>
      ))}
    </div>
  );
}
