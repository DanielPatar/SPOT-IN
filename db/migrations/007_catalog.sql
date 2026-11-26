-- Open-space catalog (UI v2): a read-only directory of venues from public sources,
-- imported from data/katalog/*.csv. These venues are NOT Spot-In listings: they cannot be
-- booked or enquired through the platform; the page shows the operator's own contact.
create table catalog_venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null,               -- Wilayah, e.g. "Jakarta Barat"
  category text,
  area_m2 integer,
  max_pax integer,
  area_type text,
  power_kva integer,
  loading_dock text,
  facilities text[] not null default '{}',
  hours text[] not null default '{}',
  transit text,
  budget_level smallint check (budget_level between 1 and 4),
  budget_note text,
  contacts text[] not null default '{}',
  source_url text,
  floorplan_path text,                -- /denah/<slug>.<ext> or an https URL
  imported_at timestamptz not null default now()
);
create index catalog_venues_region on catalog_venues (lower(region));
create index catalog_venues_name_trgm on catalog_venues using gin (name gin_trgm_ops);
