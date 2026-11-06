import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError, PermissionError } from "@/lib/permissions";
import { randomToken } from "@/lib/tokens";
import { requirePermission, membershipOf, isUuid } from "./access";
import type { Actor } from "./accounts";
import { ACTIVITIES, SPACE_TYPES } from "./listings";

/**
 * Search (M7) runs entirely in PostgreSQL (FR-M7-12): filters, availability computed from
 * calendar entries in the same query, PostGIS distance, trigram + full-text keyword match
 * with a synonym table (FR-M7-10).
 */
export type SearchInput = {
  q?: string;
  city?: string;
  area?: string;
  near?: { lat: number; lon: number; radiusKm?: number } | null;
  spaceTypes?: string[];
  eventType?: string;
  dates?: string[]; // YYYY-MM-DD
  attendance?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  environment?: "indoor" | "outdoor" | "covered" | null;
  minPowerKva?: number | null;
  activities?: string[];
  verifiedOnly?: boolean;
  showLimited?: boolean;
  sort?: "relevance" | "price" | "distance" | "newest";
  page?: number;
  pageSize?: number;
};

/** Which space types suit an event type (FR-M7-01 event-type filter). */
const EVENT_TYPE_SPACES: Record<string, string[]> = {
  exhibition: ["atrium", "event_hall", "outdoor_area", "booth"],
  bazaar: ["atrium", "outdoor_area", "booth", "popup_unit"],
  brand_activation: ["atrium", "booth", "popup_unit", "outdoor_area"],
  concert: ["event_hall", "outdoor_area"],
  workshop: ["function_room", "event_hall"],
  seminar: ["function_room", "event_hall"],
};

export function normalizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
}

/** Each query token becomes a group of alternatives: itself plus synonym expansions (exact or fuzzy). */
export async function expandTokens(tokens: string[]): Promise<string[][]> {
  if (!tokens.length) return [];
  const rows = await db()`
    select t.token, s.expansion, similarity(t.token, s.term) as sim
    from unnest(${tokens}::text[]) as t(token)
    join search_synonyms s on s.term = t.token or similarity(t.token, s.term) >= 0.5`;
  return tokens.map((tok) => {
    const alts = new Set([tok]);
    for (const r of rows.filter((r) => r.token === tok)) alts.add(String(r.expansion));
    return [...alts];
  });
}

export async function searchSpaces(input: SearchInput) {
  const sql = db();
  const pageSize = Math.min(Math.max(input.pageSize ?? 24, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const groups = await expandTokens(normalizeQuery(input.q ?? ""));
  const doc = sql`s.search_doc`;
  // Each token group must match; an alternative matches when every one of its words matches.
  // `<%` is pg_trgm word similarity (threshold 0.5, set per database in migration 003) and can use the GIN index.
  const wordMatch = (w: string) => sql`(${w} <% s.search_doc or s.search_tsv @@ plainto_tsquery('simple', ${w}))`;
  const keywordConds = groups.map(
    (alts) => sql`(${sql` or `.join(alts.map((a) => sql`(${sql` and `.join(a.split(" ").map(wordMatch))})`))})`,
  );
  const relevance = groups.length
    ? sql`(${sql` + `.join(groups.map((alts) => sql`greatest(${sql`, `.join(alts.map((a) => sql`word_similarity(${a}, ${doc})`))})`))})`
    : sql`0`;

  const dates = (input.dates ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 31);
  const at = await now();
  const near = input.near && Number.isFinite(input.near.lat) && Number.isFinite(input.near.lon) ? input.near : null;
  const point = near ? sql`ST_SetSRID(ST_MakePoint(${near.lon}, ${near.lat}), 4326)::geography` : null;
  const types = (input.spaceTypes ?? []).filter((t) => SPACE_TYPES.includes(t as never));
  const eventTypes = input.eventType ? EVENT_TYPE_SPACES[input.eventType] : undefined;
  const activities = (input.activities ?? []).filter((a) => ACTIVITIES.includes(a as never));

  // Entries that make a space unavailable on any requested date (in the property's time zone).
  const blockingKinds = input.showLimited ? ["booked", "block"] : ["booked", "block", "booking_hold", "tentative_hold"];
  const availability = dates.length
    ? sql`and not exists (
        select 1 from calendar_entries c, unnest(${dates}::date[]) as d(day)
        where c.space_id = s.id and c.released_at is null and c.kind in ${sql(blockingKinds)}
          and (c.kind not in ('tentative_hold') or c.expires_at > ${at})
          and c.during && tstzrange((d.day::timestamp) at time zone p.timezone, ((d.day + 1)::timestamp) at time zone p.timezone))`
    : sql``;
  const limited = dates.length
    ? sql`exists (
        select 1 from calendar_entries c, unnest(${dates}::date[]) as d(day)
        where c.space_id = s.id and c.released_at is null and c.kind in ('booking_hold', 'tentative_hold')
          and (c.kind <> 'tentative_hold' or c.expires_at > ${at})
          and c.during && tstzrange((d.day::timestamp) at time zone p.timezone, ((d.day + 1)::timestamp) at time zone p.timezone))`
    : sql`false`;

  const where = sql`and`.join([
    sql`s.status = 'published'`,
    sql`o.status = 'active'`,
    input.city ? sql`lower(p.city) = lower(${input.city})` : null,
    input.area ? sql`lower(p.area) = lower(${input.area})` : null,
    types.length ? sql`s.type in ${sql(types)}` : null,
    eventTypes ? sql`s.type in ${sql(eventTypes)}` : null,
    input.attendance ? sql`s.max_capacity >= ${input.attendance}` : null,
    input.budgetMin != null ? sql`r.from_price >= ${input.budgetMin}` : null,
    input.budgetMax != null ? sql`r.from_price <= ${input.budgetMax}` : null,
    input.environment ? sql`s.environment = ${input.environment}` : null,
    input.minPowerKva ? sql`coalesce(s.power_kva, 0) >= ${input.minPowerKva}` : null,
    activities.length ? sql`s.permitted_activities @> ${activities}::text[]` : null,
    input.verifiedOnly ? sql`o.verification_status = 'verified'` : null,
    point && near?.radiusKm ? sql`ST_DWithin(p.geo, ${point}, ${near.radiusKm * 1000})` : null,
    ...keywordConds,
  ]);

  const sort = input.sort ?? (groups.length ? "relevance" : near ? "distance" : "newest");
  const order =
    sort === "price"
      ? sql`r.from_price asc nulls last, s.published_at desc`
      : sort === "distance" && point
        ? sql`distance_m asc nulls last`
        : sort === "relevance" && groups.length
          ? sql`relevance desc, s.published_at desc`
          : sql`s.published_at desc nulls last`;

  const rows = await sql`
    select s.id, s.name, s.type, s.max_capacity, s.power_kva, s.environment, s.media, s.capacities,
           p.id as property_id, p.name as property_name, p.city, p.area, p.timezone,
           ST_Y(p.geo::geometry) as lat, ST_X(p.geo::geometry) as lon,
           r.from_price, r.unit, o.verification_status = 'verified' as verified,
           ${point ? sql`ST_Distance(p.geo, ${point})` : sql`null::float`} as distance_m,
           ${relevance} as relevance, ${limited} as limited,
           count(*) over () as total
    from spaces s join properties p on p.id = s.property_id join organizations o on o.id = p.operator_id
    left join rate_cards r on r.space_id = s.id
    where ${where} ${availability}
    order by ${order}
    limit ${pageSize} offset ${(page - 1) * pageSize}`;
  return { total: rows[0] ? Number(rows[0].total) : 0, page, pageSize, sort, rows };
}

/** Public space page data for logged-in pilot users (FR-M7-06, §6.2). */
export async function publicSpace(actor: Actor, spaceId: string) {
  if (!isUuid(spaceId)) throw new PermissionError();
  const [s] = await db()`
    select s.*, p.id as property_id, p.name as property_name, p.type as property_type, p.address_text, p.city, p.area, p.timezone,
           p.operating_hours, p.parking_notes, p.loading_notes, p.house_rules, p.required_docs, p.operator_id,
           ST_Y(p.geo::geometry) as lat, ST_X(p.geo::geometry) as lon,
           o.display_name as operator_name, o.verification_status = 'verified' as verified, o.status as operator_status
    from spaces s join properties p on p.id = s.property_id join organizations o on o.id = p.operator_id where s.id = ${spaceId}`;
  if (!s) throw new PermissionError();
  const venue = await membershipOf(actor.userId, "venue_operator");
  const own = venue?.orgId === String(s.operator_id);
  if (!own && (s.status !== "published" || s.operator_status !== "active")) throw new PermissionError();
  const [rateCard] = await db()`select * from rate_cards where space_id = ${spaceId}`;
  const seasons = await db()`select name, start_date, end_date, price from rate_seasons where space_id = ${spaceId} order by start_date`;
  const addOns = await db()`select id, name, unit, price, taxable, mandatory from add_ons where property_id = ${s.property_id as string} order by mandatory desc, name`;
  return { space: s, rateCard: rateCard ?? null, seasons, addOns, own };
}

export async function publicProperty(propertyId: string) {
  if (!isUuid(propertyId)) throw new PermissionError();
  const [p] = await db()`
    select p.*, ST_Y(p.geo::geometry) as lat, ST_X(p.geo::geometry) as lon, o.display_name as operator_name,
           o.verification_status = 'verified' as verified, o.status as operator_status
    from properties p join organizations o on o.id = p.operator_id where p.id = ${propertyId}`;
  if (!p || p.operator_status !== "active") throw new PermissionError();
  const spaces = await db()`
    select s.id, s.name, s.type, s.max_capacity, s.media, r.from_price, r.unit
    from spaces s left join rate_cards r on r.space_id = s.id where s.property_id = ${propertyId} and s.status = 'published' order by s.name`;
  return { property: p, spaces };
}

export async function cities() {
  return db()`select distinct p.city from properties p join spaces s on s.property_id = p.id where s.status = 'published' order by p.city`;
}

// ---------------------------------------------------------------------------
// Shortlists (FR-M8-01, -02, -04)
// ---------------------------------------------------------------------------
async function shortlistOf(actor: Actor, shortlistId: string, permission = "shortlist.edit") {
  if (!isUuid(shortlistId)) throw new PermissionError();
  const m = await requirePermission(actor.userId, "organizer", permission);
  const [l] = await db()`select * from shortlists where id = ${shortlistId} and org_id = ${m.orgId}`;
  if (!l) throw new PermissionError();
  return { m, list: l };
}

export async function listShortlists(actor: Actor) {
  const m = await requirePermission(actor.userId, "organizer", "shortlist.edit");
  return db()`
    select l.id, l.name, l.created_at, (select count(*)::int from shortlist_items i where i.shortlist_id = l.id) as items
    from shortlists l where l.org_id = ${m.orgId} order by l.created_at desc`;
}

export async function createShortlist(actor: Actor, name: string): Promise<string> {
  const m = await requirePermission(actor.userId, "organizer", "shortlist.edit");
  if (!name.trim()) throw new AppError("errors.nameRequired");
  const [l] = await db()`insert into shortlists (org_id, name, created_by, created_at) values (${m.orgId}, ${name.trim()}, ${actor.userId}, ${await now()}) returning id`;
  return String(l!.id);
}

export async function renameShortlist(actor: Actor, shortlistId: string, name: string): Promise<void> {
  await shortlistOf(actor, shortlistId);
  if (!name.trim()) throw new AppError("errors.nameRequired");
  await db()`update shortlists set name = ${name.trim()} where id = ${shortlistId}`;
}

export async function deleteShortlist(actor: Actor, shortlistId: string): Promise<void> {
  await shortlistOf(actor, shortlistId);
  await db()`delete from shortlists where id = ${shortlistId}`;
}

export async function addToShortlist(actor: Actor, shortlistId: string, spaceId: string, note?: string): Promise<void> {
  await shortlistOf(actor, shortlistId);
  const [s] = await db()`select 1 from spaces where id = ${spaceId} and status = 'published'`;
  if (!s) throw new PermissionError();
  await db()`
    insert into shortlist_items (shortlist_id, space_id, note, added_at) values (${shortlistId}, ${spaceId}, ${note?.trim() || null}, ${await now()})
    on conflict (shortlist_id, space_id) do update set note = coalesce(excluded.note, shortlist_items.note)`;
}

export async function updateShortlistNote(actor: Actor, shortlistId: string, spaceId: string, note: string): Promise<void> {
  await shortlistOf(actor, shortlistId);
  await db()`update shortlist_items set note = ${note.trim() || null} where shortlist_id = ${shortlistId} and space_id = ${spaceId}`;
}

export async function removeFromShortlist(actor: Actor, shortlistId: string, spaceId: string): Promise<void> {
  await shortlistOf(actor, shortlistId);
  await db()`delete from shortlist_items where shortlist_id = ${shortlistId} and space_id = ${spaceId}`;
}

async function shortlistItems(shortlistId: string) {
  return db()`
    select s.id, s.name, s.type, s.max_capacity, s.media, s.status, p.name as property_name, p.city, p.area, i.note, r.from_price, r.unit
    from shortlist_items i join spaces s on s.id = i.space_id join properties p on p.id = s.property_id
    left join rate_cards r on r.space_id = s.id where i.shortlist_id = ${shortlistId} order by i.added_at`;
}

export async function shortlistDetail(actor: Actor, shortlistId: string) {
  const { list } = await shortlistOf(actor, shortlistId);
  const links = await db()`select id, token, created_at from share_links where shortlist_id = ${shortlistId} and revoked_at is null order by created_at desc`;
  return { list, items: await shortlistItems(shortlistId), links };
}

export async function createShareLink(actor: Actor, shortlistId: string): Promise<string> {
  await shortlistOf(actor, shortlistId);
  const token = randomToken(24);
  await db()`insert into share_links (shortlist_id, token, created_by, created_at) values (${shortlistId}, ${token}, ${actor.userId}, ${await now()})`;
  return token;
}

export async function revokeShareLink(actor: Actor, shortlistId: string, linkId: string): Promise<void> {
  await shortlistOf(actor, shortlistId);
  await db()`update share_links set revoked_at = ${await now()} where id = ${linkId} and shortlist_id = ${shortlistId}`;
}

/** View-only, no login: spaces, notes and indicative prices — never messages or quotes (FR-M8-02). */
export async function sharedShortlist(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const [l] = await db()`
    select l.id, l.name, o.display_name as organizer_name from share_links k join shortlists l on l.id = k.shortlist_id
    join organizations o on o.id = l.org_id where k.token = ${token} and k.revoked_at is null`;
  if (!l) return null;
  return { name: String(l.name), organizerName: String(l.organizer_name), items: (await shortlistItems(String(l.id))).filter((i) => i.status === "published") };
}
