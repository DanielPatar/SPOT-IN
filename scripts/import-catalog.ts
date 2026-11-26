/**
 * Imports the open-space catalog CSV (UI v2) into catalog_venues, upserting by slug.
 *
 *   npm run catalog:import                      # data/katalog/openspace-dki.csv
 *   npm run catalog:import -- path/to/file.csv
 *   npm run catalog:import -- --slugs           # print the expected denah file names
 *
 * Expected header (extra columns are ignored; "Denah" is optional):
 *   Nama_Venue,Wilayah,Kategori,Luas_Area_m2,Kapasitas_Max_Pax,Tipe_Area,Daya_Listrik_kVA,
 *   Loading_Dock,Fasilitas_Pendukung,Jam_Operasional,Akses_Transportasi,Rating_Budget,
 *   Kontak_Manajemen,Link_Sumber[,Denah,Foto,Kredit_Foto,Halaman_Foto]
 *
 * Floor plans: put /public/denah/<slug>.(webp|png|jpg|jpeg|svg|pdf), or give an https URL
 * or a file name in the "Denah" column.
 */
import { pathToFileURL } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const DENAH_DIR = path.resolve(process.cwd(), "public/denah");
const DENAH_EXT = ["webp", "png", "jpg", "jpeg", "svg", "pdf"];

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const int = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** "💰💰 (Atau Gratis dengan Izin Pemprov)" → level 2, note "Atau Gratis dengan Izin Pemprov". */
export function parseBudget(v: string | undefined): { level: number | null; note: string | null } {
  const s = String(v ?? "");
  const level = (s.match(/💰/gu) ?? []).length;
  const note = s.replace(/💰/gu, "").replace(/[()]/g, "").trim();
  return { level: level ? Math.min(4, level) : null, note: note || null };
}

function floorplanFor(slug: string, column: string | undefined): string | null {
  const c = (column ?? "").trim();
  if (/^https:\/\//.test(c)) return c;
  if (c && existsSync(path.join(DENAH_DIR, path.basename(c)))) return `/denah/${path.basename(c)}`;
  for (const ext of DENAH_EXT)
    if (existsSync(path.join(DENAH_DIR, `${slug}.${ext}`))) return `/denah/${slug}.${ext}`;
  return null;
}

export type CatalogRow = ReturnType<typeof toRecord>;

export function toRecord(h: Record<string, string>) {
  const name = (h.Nama_Venue ?? "").trim();
  const slug = slugify(name);
  const budget = parseBudget(h.Rating_Budget);
  const split = (v: string | undefined, sep: RegExp) =>
    String(v ?? "")
      .split(sep)
      .map((x) => x.trim())
      .filter(Boolean);
  return {
    slug,
    name,
    region: (h.Wilayah ?? "").trim(),
    category: (h.Kategori ?? "").trim() || null,
    area_m2: int(h.Luas_Area_m2),
    max_pax: int(h.Kapasitas_Max_Pax),
    area_type: (h.Tipe_Area ?? "").trim() || null,
    power_kva: int(h.Daya_Listrik_kVA),
    loading_dock: (h.Loading_Dock ?? "").trim() || null,
    facilities: split(h.Fasilitas_Pendukung, /,/),
    hours: split(h.Jam_Operasional, /\|/),
    transit: (h.Akses_Transportasi ?? "").trim() || null,
    budget_level: budget.level,
    budget_note: budget.note,
    contacts: split(h.Kontak_Manajemen, /\s\/\s/),
    source_url: /^https?:\/\//.test((h.Link_Sumber ?? "").trim()) ? h.Link_Sumber!.trim() : null,
    floorplan_path: floorplanFor(slug, h.Denah),
    // Only freely licensed photos, always with a credit (author + licence) and the source page.
    photo_url:
      /^(https:\/\/|\/katalog-foto\/)/.test((h.Foto ?? "").trim()) && (h.Kredit_Foto ?? "").trim()
        ? h.Foto!.trim()
        : null,
    photo_credit: (h.Kredit_Foto ?? "").trim() || null,
    photo_page: /^https:\/\//.test((h.Halaman_Foto ?? "").trim()) ? h.Halaman_Foto!.trim() : null,
  };
}

export function readCatalog(file: string): CatalogRow[] {
  const [header, ...rows] = parseCsv(readFileSync(file, "utf8"));
  if (!header) return [];
  const keys = header.map((k) => k.trim());
  return rows
    .map((r) => toRecord(Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""]))))
    .filter((r) => r.name && r.region);
}

/** Needs only DATABASE_URL (like db:migrate), so it can run from a laptop against Supabase. */
export async function importCatalog(
  file: string,
  databaseUrl = process.env.DATABASE_URL,
): Promise<number> {
  if (!databaseUrl) throw new Error("Set DATABASE_URL first (see docs/ops/database.md).");
  const items = readCatalog(file);
  const sql = postgres(databaseUrl, {
    max: 1,
    onnotice: () => {},
    prepare: process.env.DB_PREPARE !== "false",
  });
  try {
    for (const it of items) {
      await sql`
      insert into catalog_venues ${sql(it)}
      on conflict (slug) do update set
        name = excluded.name, region = excluded.region, category = excluded.category, area_m2 = excluded.area_m2,
        max_pax = excluded.max_pax, area_type = excluded.area_type, power_kva = excluded.power_kva,
        loading_dock = excluded.loading_dock, facilities = excluded.facilities, hours = excluded.hours,
        transit = excluded.transit, budget_level = excluded.budget_level, budget_note = excluded.budget_note,
        contacts = excluded.contacts, source_url = excluded.source_url, floorplan_path = excluded.floorplan_path, photo_url = excluded.photo_url, photo_credit = excluded.photo_credit, photo_page = excluded.photo_page,
        imported_at = now()`;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
  return items.length;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--")) ?? "data/katalog/openspace-dki.csv";
  if (args.includes("--slugs")) {
    for (const r of readCatalog(file))
      console.log(`${r.floorplan_path ? "✓" : "·"} ${r.slug}  (${r.name})`);
  } else {
    const n = await importCatalog(file);
    const linked = readCatalog(file).filter((r) => r.floorplan_path).length;
    console.log(`Imported ${n} venues from ${file}; ${linked} with a floor plan.`);
  }
}
