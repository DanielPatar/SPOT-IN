import "server-only";
import { t } from "@/lib/i18n";
import { formatRupiah } from "@/lib/money";
import { businessHoursBetween } from "@/lib/business-days";
import { loadHolidays } from "@/lib/holidays";
import { compareQuotes } from "@/server/quotes";
import type { Actor } from "@/server/accounts";

/** Rows for the comparison table and its PDF (FR-M8-05), from the latest quote per space. */
export async function compareRows(actor: Actor, eventId: string) {
  const { event, quotes } = await compareQuotes(actor, eventId);
  const holidays = await loadHolidays();
  const nDays = (event.days as unknown[]).length || 1;
  const rows = quotes.map((q) => {
    const s = q.payment_schedule as unknown as { mode: string; depositBps: number; depositDays: number; balanceDaysBefore: number };
    const tiers = q.policy_snapshot as unknown as { minDays: number; refundBps: number }[];
    const hours = q.first_response_at ? businessHoursBetween(new Date(q.enquiry_at), new Date(q.first_response_at), q.timezone, holidays) : null;
    return {
      quoteId: q.id,
      enquiryId: String(q.enquiry_id),
      space: `${q.space_name}, ${q.property_name}`,
      total: formatRupiah(q.totals.organizerTotal),
      totalValue: q.totals.organizerTotal,
      perDay: formatRupiah(Math.round(q.totals.venueTotal / nDays)),
      inclusions: String(q.inclusions ?? ""),
      deposit: s.mode === "full" ? t("compare.fullPayment") : t("compare.depositPct", { pct: s.depositBps / 100 }),
      deadlines: s.mode === "full" ? t("compare.fullDue") : t("compare.deadlines", { days: s.depositDays, before: s.balanceDaysBefore }),
      cancellation: `${t(`policies.${String(q.cancellation_policy)}.name`)} · ${t("compare.refund30", { pct: (tiers[0]?.refundBps ?? 0) / 100 })}`,
      response: hours === null ? "—" : t("compare.hours", { n: Math.round(hours * 10) / 10 }),
      status: String(q.status),
      version: Number(q.version),
    };
  });
  return { event, rows };
}
