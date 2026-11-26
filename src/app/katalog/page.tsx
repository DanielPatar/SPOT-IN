import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { t } from "@/lib/i18n";
import { listCatalog, catalogRegions } from "@/server/catalog";
import { CatalogCard, type CatalogItem } from "@/components/CatalogCard";
import { BudgetLegend } from "@/components/BudgetLevel";
import { StateBlock } from "@/components/kit";

export const metadata: Metadata = { title: t("catalog.title") };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Open-space catalog (UI v2): public, read-only, from data/katalog/*.csv. */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const budgetMax = Number(one(sp.budget)) || null;
  const minPax = Number(one(sp.pax)) || null;
  const [rows, regions] = await Promise.all([
    listCatalog({ q: one(sp.q), region: one(sp.wilayah) || undefined, budgetMax, minPax }),
    catalogRegions(),
  ]);
  return (
    <div>
      <div className="mb-6 max-w-2xl">
        <h1 className="mb-2">{t("catalog.title")}</h1>
        <p className="m-0 text-lg text-muted-foreground">{t("catalog.lead")}</p>
      </div>
      <form
        method="get"
        role="search"
        aria-label={t("catalog.searchLabel")}
        className="mb-8 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-float sm:p-5 md:grid-cols-[2fr_1.2fr_1.2fr_0.8fr_auto] md:items-end"
      >
        <label className="col-span-2 md:col-span-1">
          {t("catalog.keyword")}
          <input name="q" defaultValue={one(sp.q)} placeholder={t("catalog.keywordPlaceholder")} />
        </label>
        <label>
          {t("catalog.region")}
          <select name="wilayah" defaultValue={one(sp.wilayah)}>
            <option value="">{t("catalog.anyRegion")}</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("catalog.budget")}
          <select name="budget" defaultValue={one(sp.budget)}>
            <option value="">{t("catalog.anyBudget")}</option>
            {[1, 2, 3, 4].map((i) => (
              <option key={i} value={i}>
                {t("budget.symbol").repeat(i)} {t(`budget.levels.${i}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("catalog.minPax")}
          <input name="pax" inputMode="numeric" defaultValue={one(sp.pax)} />
        </label>
        <button type="submit" className="btn btn-primary col-span-2 md:col-span-1">
          {t("catalog.submit")}
        </button>
      </form>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <p className="mb-6 text-[15px] font-semibold text-ink">
            {t("catalog.count", { n: rows.length })}
          </p>
          {rows.length === 0 ? (
            <StateBlock
              icon={SearchX}
              title={t("catalog.emptyTitle")}
              action={
                <Link className="btn btn-secondary" href="/katalog">
                  {t("catalog.reset")}
                </Link>
              }
            >
              {t("catalog.empty")}
            </StateBlock>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((v) => (
                <CatalogCard key={String(v.slug)} v={v as unknown as CatalogItem} />
              ))}
            </div>
          )}
        </div>
        <aside>
          <div className="rounded-2xl bg-sunken p-5 lg:sticky lg:top-24">
            <h2 className="mt-0 mb-3 text-base">{t("catalog.legendTitle")}</h2>
            <BudgetLegend />
            <p className="mt-4 mb-0 text-[13px] text-muted-foreground">{t("catalog.costHelp")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
