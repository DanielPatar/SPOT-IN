import Link from "next/link";
import { notFound } from "next/navigation";
import { Scale } from "lucide-react";
import { t } from "@/lib/i18n";
import { PermissionError } from "@/lib/permissions";
import { requireOrganizerPage } from "@/web/view";
import { compareRows } from "@/web/compare";
import { PageTitle, StateBlock, Status } from "@/components/kit";

const FIELDS = ["total", "perDay", "deposit", "deadlines", "cancellation", "response", "inclusions"] as const;

/** Side-by-side comparison of quotes for one event (FR-M8-05). */
export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireOrganizerPage(`/acara/${id}/bandingkan`);
  let data;
  try {
    data = await compareRows({ userId: session.userId }, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }
  const { event, rows } = data;
  const cheapest = rows.length > 1 ? Math.min(...rows.map((r) => r.totalValue)) : null;
  return (
    <div>
      <PageTitle
        back={{ href: `/acara/${id}`, label: t("compare.back") }}
        title={t("compare.title")}
        description={t("compare.intro", { event: String(event.name) })}
        actions={rows.length ? <Link className="btn btn-secondary" href={`/api/documents/compare/${id}`}>{t("compare.pdf")}</Link> : undefined}
      />
      {rows.length === 0 ? (
        <StateBlock icon={Scale} title={t("compare.emptyTitle")}>
          {t("compare.emptyBody")}
        </StateBlock>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">{t("compare.title")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("compare.space")}</th>
                {rows.map((r) => (
                  <th key={r.quoteId} scope="col">
                    <Link href={`/enquiry/${r.enquiryId}`}>{r.space}</Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Status tone={r.status === "sent" ? "positive" : "neutral"}>{t(`quoteStatus.${r.status}`)}</Status>
                      {cheapest !== null && r.totalValue === cheapest ? <Status tone="info" icon={false}>{t("compare.lowest")}</Status> : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f}>
                  <th scope="row">{t(`compare.${f}`)}</th>
                  {rows.map((r) => (
                    <td key={r.quoteId} className={f === "total" || f === "perDay" ? "num" : "small"}>
                      {r[f] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
