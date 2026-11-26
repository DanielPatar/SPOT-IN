import Link from "next/link";
import { Building2, Landmark, Map as MapIcon, Trees, Users } from "lucide-react";
import { t } from "@/lib/i18n";
import { BudgetLevel } from "@/components/BudgetLevel";

export type CatalogItem = {
  slug: unknown;
  name: unknown;
  region: unknown;
  category: unknown;
  area_m2: unknown;
  max_pax: unknown;
  budget_level: unknown;
  floorplan_path: unknown;
  photo_url?: unknown;
};

export function isImage(p: unknown): p is string {
  return typeof p === "string" && /\.(webp|png|jpe?g|svg)(\?.*)?$/i.test(p);
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const c = category.toLowerCase();
  const Icon =
    c.includes("park") || c.includes("taman")
      ? Trees
      : c.includes("convention") || c.includes("exhibition")
        ? Landmark
        : Building2;
  return <Icon className={className} aria-hidden="true" />;
}

/** Catalog card: floor plan (or a category tile), name, region, capacity, 💰 tier. */
export function CatalogCard({ v }: { v: CatalogItem }) {
  const fp = v.floorplan_path;
  return (
    <Link
      href={`/katalog/${String(v.slug)}`}
      className="space-card group"
      data-testid="catalog-item"
    >
      <span className="space-photo block">
        {v.photo_url ? (
          <img src={String(v.photo_url)} alt="" loading="lazy" />
        ) : isImage(fp) ? (
          <img src={fp} alt="" className="bg-white object-contain p-3" />
        ) : (
          <span className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-brand-soft via-white to-sunken">
            <CategoryIcon category={String(v.category ?? "")} className="size-12 text-brand/70" />
          </span>
        )}
        {fp ? (
          <span className="badge absolute top-3 left-3 border-0 bg-white/95 text-ink shadow-sm">
            <MapIcon className="size-3.5 text-brand" aria-hidden="true" />
            {t("catalog.hasFloorplan")}
          </span>
        ) : null}
      </span>
      <strong className="text-[17px] leading-snug text-ink group-hover:underline">
        {String(v.name)}
      </strong>
      <span className="text-sm text-muted-foreground">
        {String(v.region)}
        {v.category ? ` · ${String(v.category)}` : ""}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {v.max_pax ? (
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" />
            {t("catalog.upTo", { n: Number(v.max_pax).toLocaleString("id-ID") })}
          </span>
        ) : null}
        {v.area_m2 ? (
          <span>{t("catalog.m2", { n: Number(v.area_m2).toLocaleString("id-ID") })}</span>
        ) : null}
      </span>
      <BudgetLevel level={Number(v.budget_level) || null} size="sm" withName className="mt-1" />
    </Link>
  );
}
