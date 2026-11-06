"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { quoteTotals, type PricingSnapshot, type QuoteLine } from "@/lib/quote-math";
import { formatRupiah } from "@/lib/money";
import { MoneyRow } from "./kit";

/** Quote builder lines with live totals (FR-M12-01); the same arithmetic as the server. */
export function QuoteEditor({ initial, pricing, revisionComments }: { initial: QuoteLine[]; pricing: PricingSnapshot; revisionComments?: Record<string, string> }) {
  const t = useTranslations("quoteBuilder");
  const [lines, setLines] = useState<QuoteLine[]>(initial);
  const totals = useMemo(() => {
    try {
      return quoteTotals(lines.map((l) => ({ ...l, quantity: Number(l.quantity) || 0, unitPrice: Math.round(Number(l.unitPrice) || 0), discount: Math.round(Number(l.discount) || 0) })), pricing);
    } catch {
      return null;
    }
  }, [lines, pricing]);
  const set = (i: number, patch: Partial<QuoteLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-3">
        <input type="hidden" name="lines" value={JSON.stringify(lines)} />
        {lines.map((l, i) => (
          <fieldset key={l.id} className="gap-2">
            <legend>{t("lineN", { n: i + 1 })}</legend>
            {revisionComments?.[l.id] ? <p className="alert alert-warn small">{t("organizerComment", { comment: revisionComments[l.id]! })}</p> : null}
            <div className="grid gap-2 sm:grid-cols-[2fr_80px_140px_120px]">
              <label>
                {t("label")}
                <input value={l.label} onChange={(e) => set(i, { label: e.target.value })} required />
              </label>
              <label>
                {t("qty")}
                <input inputMode="decimal" value={String(l.quantity)} onChange={(e) => set(i, { quantity: e.target.value as unknown as number })} />
              </label>
              <label>
                {t("unitPrice")}
                <input inputMode="numeric" value={String(l.unitPrice)} onChange={(e) => set(i, { unitPrice: e.target.value.replace(/\D/g, "") as unknown as number })} />
              </label>
              <label>
                {t("discount")}
                <input inputMode="numeric" value={String(l.discount || "")} onChange={(e) => set(i, { discount: e.target.value.replace(/\D/g, "") as unknown as number })} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="check small">
                <input type="checkbox" checked={l.taxable} onChange={(e) => set(i, { taxable: e.target.checked })} /> {t("taxable")}
              </label>
              <button type="button" className="link-btn small inline-flex items-center gap-1" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                <Trash2 className="size-3.5" aria-hidden="true" />
                {t("removeLine")}
              </button>
            </div>
          </fieldset>
        ))}
        <button type="button" className="btn btn-secondary w-fit" onClick={() => setLines([...lines, { id: crypto.randomUUID(), kind: "custom", label: "", quantity: 1, unitPrice: 0, discount: 0, taxable: true }])}>
          <Plus className="size-4" aria-hidden="true" />
          {t("addLine")}
        </button>
      </div>
      <aside className="h-fit rounded-lg border border-line bg-surface p-4 lg:sticky lg:top-20" aria-live="polite">
        <h3 className="mt-0">{t("summary")}</h3>
        {totals ? (
          <>
            <MoneyRow label={t("rentalAndAddOns")} value={formatRupiah(totals.rentalAndAddOns)} />
            {totals.serviceCharge ? <MoneyRow label={t("serviceCharge")} value={formatRupiah(totals.serviceCharge)} /> : null}
            <MoneyRow label={pricing.isPkp ? t("ppn") : t("noPpn")} value={formatRupiah(totals.ppn)} muted={!pricing.isPkp} />
            <MoneyRow label={t("venueTotal")} value={formatRupiah(totals.venueTotal)} strong />
            <MoneyRow label={t("spotinFee")} sub={t("spotinFeeHint")} value={formatRupiah(totals.organizerFee)} muted />
            <MoneyRow label={t("organizerTotal")} value={formatRupiah(totals.organizerTotal)} strong />
          </>
        ) : null}
      </aside>
    </div>
  );
}
