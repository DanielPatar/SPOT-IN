/**
 * Performance seed (PRD §8): 5,000 published spaces and 50,000 calendar entries spread
 * over Indonesian cities, inserted in bulk with SQL. Demo/dev only.
 */
import { db, closeDb } from "../src/lib/db";

async function main() {
  if (process.env.APP_ENV === "pilot") throw new Error("Refusing to seed the pilot environment.");
  const sql = db();
  const spaces = Number(process.env.PERF_SPACES ?? 5000);
  const entries = Number(process.env.PERF_ENTRIES ?? 50000);
  const t0 = Date.now();
  await sql.unsafe(`
    with cities(city, lat, lon, tz) as (values
      ('Jakarta Selatan', -6.26, 106.81, 'Asia/Jakarta'), ('Jakarta Barat', -6.17, 106.76, 'Asia/Jakarta'), ('Jakarta Pusat', -6.18, 106.83, 'Asia/Jakarta'),
      ('Tangerang', -6.18, 106.63, 'Asia/Jakarta'), ('Bandung', -6.91, 107.61, 'Asia/Jakarta'), ('Surabaya', -7.25, 112.75, 'Asia/Jakarta'),
      ('Denpasar', -8.65, 115.22, 'Asia/Makassar'), ('Medan', 3.59, 98.67, 'Asia/Jakarta'), ('Makassar', -5.14, 119.43, 'Asia/Makassar')),
    ops as (
      insert into organizations (kind, display_name, verification_status, verified_by_spotin_at, verification_method, created_at)
      select 'venue_operator', 'Perf Venue ' || g, 'verified', now(), 'call', now() from generate_series(1, ${Math.ceil(spaces / 2)}) g
      returning id, display_name),
    numbered as (select id, row_number() over () as n from ops),
    props as (
      insert into properties (operator_id, name, type, address_text, city, area, geo, timezone, created_at, updated_at)
      select o.id, 'Perf Property ' || o.n, 'mall', 'Jl. Uji ' || o.n, c.city, 'Area ' || (o.n % 7),
        ST_SetSRID(ST_MakePoint(c.lon + (random() - 0.5) * 0.2, c.lat + (random() - 0.5) * 0.2), 4326)::geography, c.tz, now(), now()
      from numbered o join (select *, row_number() over () - 1 as k from cities) c on c.k = o.n % 9
      returning id)
    insert into spaces (property_id, name, type, capacities, power_kva, permitted_activities, status, published_at, created_at, updated_at)
    select p.id, (array['Atrium','Hall','Ballroom','Booth','Ruang Rapat'])[1 + (s % 5)] || ' ' || s,
      (array['atrium','event_hall','event_hall','booth','function_room'])[1 + (s % 5)],
      jsonb_build_object('standing', 50 + (s * 37) % 900), (s * 13) % 120, array['selling','fnb_sampling']::text[], 'published', now(), now(), now()
    from props p cross join generate_series(1, 2) s`);
  await sql.unsafe(`
    insert into rate_cards (space_id, unit, weekday_price, weekend_price, from_price)
    select id, 'day', 5000000 + (abs(hashtext(id::text)) % 40) * 1000000, null, 5000000 + (abs(hashtext(id::text)) % 40) * 1000000
    from spaces where name ~ ' [0-9]+$' and id not in (select space_id from rate_cards)`);
  await sql.unsafe(`
    insert into calendar_entries (space_id, during, kind, reason, created_at)
    select s.id, tstzrange(d, d + interval '1 day'), 'block', 'perf', now()
    from (select id, row_number() over () as n from spaces) s
    cross join lateral (select (date '2026-11-01' + ((s.n * 7 + k * 11) % 360)::int)::timestamptz as d from generate_series(1, ${Math.round(entries / spaces)}) k) days
    on conflict do nothing`);
  const [c] = await sql`select (select count(*) from spaces)::int as spaces, (select count(*) from calendar_entries)::int as entries`;
  console.log(`perf seed: ${c!.spaces} spaces, ${c!.entries} calendar entries in ${Date.now() - t0} ms`);
  await sql`analyze`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
