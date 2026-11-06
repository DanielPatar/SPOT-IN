import Link from "next/link";
import { Inbox } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import { requireVenuePage } from "@/web/view";
import { PIPELINE_COLUMNS, venuePipeline } from "@/server/dashboards";
import { PageTitle, StateBlock, Status } from "@/components/kit";

/** FR-M22-01: venue pipeline as a list or a kanban board, with overdue-reply badges. */
export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const { session } = await requireVenuePage("/venue/pipeline");
  const rows = await venuePipeline({ userId: session.userId });
  const kanban = view === "kanban";
  const card = (r: (typeof rows)[number]) => (
    <div key={r.id} className="rounded-md border border-line bg-surface p-3" data-testid="pipeline-item">
      <Link href={r.bookingId ? `/pemesanan/${r.bookingId}` : `/venue/enquiry/${r.id}`} className="font-medium">
        {r.eventName}
      </Link>
      <p className="small muted m-0">{r.spaceName} · {r.organizerName}</p>
      {r.overdue ? <Status tone="danger">{t("pipeline.overdue", { at: formatDateTime(r.deadline, "Asia/Jakarta") })}</Status> : null}
    </div>
  );
  return (
    <div>
      <PageTitle
        title={t("pipeline.title")}
        description={t("pipeline.intro")}
        actions={
          <nav aria-label={t("pipeline.viewLabel")} className="row">
            <Link className={`btn ${kanban ? "btn-secondary" : "btn-primary"}`} href="/venue/pipeline" aria-current={!kanban ? "page" : undefined}>{t("pipeline.list")}</Link>
            <Link className={`btn ${kanban ? "btn-primary" : "btn-secondary"}`} href="/venue/pipeline?view=kanban" aria-current={kanban ? "page" : undefined}>{t("pipeline.kanban")}</Link>
          </nav>
        }
      />
      {rows.length === 0 ? (
        <StateBlock icon={Inbox} title={t("pipeline.emptyTitle")}>{t("pipeline.emptyBody")}</StateBlock>
      ) : kanban ? (
        <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${PIPELINE_COLUMNS.length}, minmax(200px, 1fr))` }}>
          {PIPELINE_COLUMNS.map((c) => {
            const items = rows.filter((r) => r.column === c);
            return (
              <section key={c} aria-labelledby={`col-${c}`} className="rounded-lg bg-sunken p-2">
                <h2 id={`col-${c}`} className="m-0 mb-2 text-sm">{t(`pipeline.columns.${c}`)} <span className="muted">({items.length})</span></h2>
                <div className="grid gap-2">{items.map(card)}</div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t("pipeline.event")}</th>
                <th scope="col">{t("pipeline.stage")}</th>
                <th scope="col">{t("pipeline.replyBy")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-testid="pipeline-row">
                  <td>
                    <Link href={r.bookingId ? `/pemesanan/${r.bookingId}` : `/venue/enquiry/${r.id}`}>{r.eventName}</Link>
                    <div className="small muted">{r.spaceName} · {r.organizerName}</div>
                  </td>
                  <td>{t(`pipeline.columns.${r.column}`)}</td>
                  <td>{r.overdue ? <Status tone="danger">{t("pipeline.overdueShort")}</Status> : r.column === "new" ? <span className="small">{formatDateTime(r.deadline, "Asia/Jakarta")}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
