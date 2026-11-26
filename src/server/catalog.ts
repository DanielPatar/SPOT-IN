import { db } from "@/lib/db";

/**
 * Open-space catalog (UI v2): read-only directory imported from public sources
 * (scripts/import-catalog.ts). Public to everyone; nothing here is bookable.
 */
export type CatalogFilters = {
  q?: string;
  region?: string;
  /** Matches every region containing this text, e.g. "Jakarta" → Jakarta Barat, Jakarta Pusat, … */
  regionLike?: string;
  budgetMax?: number | null;
  minPax?: number | null;
};

export async function listCatalog(f: CatalogFilters = {}) {
  const sql = db();
  const q = (f.q ?? "").trim();
  const where = sql`and`.join(
    [
      sql`true`,
      q
        ? sql`(name ilike ${`%${q}%`} or category ilike ${`%${q}%`} or area_type ilike ${`%${q}%`})`
        : null,
      f.region ? sql`lower(region) = lower(${f.region})` : null,
      f.regionLike ? sql`region ilike ${`%${f.regionLike}%`}` : null,
      f.budgetMax ? sql`budget_level <= ${f.budgetMax}` : null,
      f.minPax ? sql`max_pax >= ${f.minPax}` : null,
    ].filter((x): x is NonNullable<typeof x> => x !== null),
  );
  return sql`select slug, name, region, category, area_m2, max_pax, area_type, budget_level, budget_note, floorplan_path, photo_url
             from catalog_venues where ${where} order by region, name`;
}

export async function catalogRegions(): Promise<string[]> {
  return (await db()`select distinct region from catalog_venues order by region`).map((r) =>
    String(r.region),
  );
}

export async function catalogVenue(slug: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const [v] = await db()`select * from catalog_venues where slug = ${slug}`;
  return v ?? null;
}
