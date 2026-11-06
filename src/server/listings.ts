import { db, num, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError, PermissionError } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { isTimeZone, timezoneFromLongitude } from "@/lib/time";
import { estimate, type AddOn, type EventDay, type RateCard, type Season } from "@/lib/pricing";
import { geocode } from "@/adapters/geocoder";
import { requirePermission, isUuid } from "./access";
import { adminIds, notify } from "./notify";
import { storeUpload } from "./files";
import { submitForVerification } from "./orgs";
import { declineOpenEnquiriesForSpaces } from "./enquiries";
import type { Actor } from "./accounts";

/** Properties, spaces and pricing (M4, M5). One property per operator, one level of spaces. */

export const PROPERTY_TYPES = ["mall", "hall", "convention_centre", "outdoor_site", "other"] as const;
export const SPACE_TYPES = ["atrium", "booth", "popup_unit", "event_hall", "function_room", "outdoor_area", "other"] as const;
export const ACTIVITIES = ["selling", "fnb_sampling", "open_flame", "live_music", "vehicles"] as const;
export const LAYOUTS = ["standing", "theatre", "classroom", "banquet", "booth"] as const;
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const MAX_PHOTOS = 15;
export const MAX_QUESTIONS = 5;

type RequiredDoc = { id: string; name: string; mandatory: boolean; dueOffsetDays: number };
type Hours = Partial<Record<(typeof WEEKDAYS)[number], { open: string; close: string } | null>>;

async function venueOf(actor: Actor, permission = "listing.edit", sql: Tx = db()) {
  const m = await requirePermission(actor.userId, "venue_operator", permission, sql);
  const [p] = await sql`select id from properties where operator_id = ${m.orgId}`;
  return { m, propertyId: p ? String(p.id) : null };
}

async function spaceOfVenue(actor: Actor, spaceId: string, permission = "listing.edit", sql: Tx = db()) {
  if (!isUuid(spaceId)) throw new PermissionError();
  const { m } = await venueOf(actor, permission, sql);
  const [s] = await sql`
    select s.*, p.operator_id, p.timezone from spaces s join properties p on p.id = s.property_id
    where s.id = ${spaceId} and p.operator_id = ${m.orgId}`;
  if (!s) throw new PermissionError();
  return { m, space: s };
}

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

/** FR-M4-01, FR-M4-08 */
export async function saveProperty(
  actor: Actor,
  input: {
    name: string;
    type: string;
    addressText: string;
    city: string;
    area?: string;
    lat?: number | null;
    lon?: number | null;
    timezone?: string | null;
    operatingHours?: Hours;
    parkingNotes?: string;
    loadingNotes?: string;
    houseRules?: string;
    requiredDocs?: { name: string; mandatory: boolean; dueOffsetDays: number }[];
  },
): Promise<string> {
  const { m, propertyId } = await venueOf(actor);
  if (!input.name.trim()) throw new AppError("errors.nameRequired");
  if (!PROPERTY_TYPES.includes(input.type as never)) throw new AppError("errors.invalidValue");
  if (!input.addressText.trim() || !input.city.trim()) throw new AppError("listings.addressRequired");
  let lat = input.lat ?? null;
  let lon = input.lon ?? null;
  if ((lat === null) !== (lon === null)) throw new AppError("listings.pinInvalid");
  if (lat !== null && lon !== null && (lat < -11.5 || lat > 6.5 || lon < 94 || lon > 141.5)) throw new AppError("listings.pinOutsideIndonesia");
  if (lat === null && !propertyId) {
    // Geocode once on save to suggest a pin; the venue confirms or moves it (PRD §10).
    const g = await geocode(`${input.addressText}, ${input.area ?? ""}, ${input.city}`);
    if (g) {
      lat = g.lat;
      lon = g.lon;
    }
  }
  const tz = input.timezone && isTimeZone(input.timezone) ? input.timezone : lon !== null ? timezoneFromLongitude(lon) : "Asia/Jakarta";
  const hours: Hours = {};
  for (const d of WEEKDAYS) {
    const h = input.operatingHours?.[d];
    if (h && time.test(h.open) && time.test(h.close)) hours[d] = h;
    else if (h === null) hours[d] = null;
  }
  const docs: RequiredDoc[] = (input.requiredDocs ?? [])
    .filter((d) => d.name.trim())
    .slice(0, 15)
    .map((d, i) => ({ id: `doc${i + 1}`, name: d.name.trim(), mandatory: !!d.mandatory, dueOffsetDays: Math.max(0, Math.min(365, Math.round(d.dueOffsetDays))) }));
  const at = await now();
  const geo = lat !== null && lon !== null ? db()`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography` : db()`null`;
  if (propertyId) {
    await db()`
      update properties set name = ${input.name.trim()}, type = ${input.type}, address_text = ${input.addressText.trim()},
        city = ${input.city.trim()}, area = ${input.area?.trim() || null},
        geo = ${lat !== null ? geo : db()`geo`}, timezone = ${tz}, operating_hours = ${db().json(hours as never)},
        parking_notes = ${input.parkingNotes?.trim() || null}, loading_notes = ${input.loadingNotes?.trim() || null},
        house_rules = ${input.houseRules?.trim() || null}, required_docs = ${db().json(docs as never)}, updated_at = ${at}
      where id = ${propertyId}`;
    return propertyId;
  }
  const [p] = await db()`
    insert into properties (operator_id, name, type, address_text, city, area, geo, timezone, operating_hours, parking_notes,
      loading_notes, house_rules, required_docs, created_at, updated_at)
    values (${m.orgId}, ${input.name.trim()}, ${input.type}, ${input.addressText.trim()}, ${input.city.trim()}, ${input.area?.trim() || null},
      ${geo}, ${tz}, ${db().json(hours as never)}, ${input.parkingNotes?.trim() || null}, ${input.loadingNotes?.trim() || null},
      ${input.houseRules?.trim() || null}, ${db().json(docs as never)}, ${at}, ${at})
    returning id`;
  return String(p!.id);
}

export async function propertyOfVenue(actor: Actor) {
  const { m, propertyId } = await venueOf(actor, "enquiry.view");
  if (!propertyId) return { membership: m, property: null };
  const [p] = await db()`
    select p.*, ST_Y(p.geo::geometry) as lat, ST_X(p.geo::geometry) as lon from properties p where p.id = ${propertyId}`;
  return { membership: m, property: p ?? null };
}

export async function addPropertyPhotos(actor: Actor, files: { name: string; bytes: Buffer }[]): Promise<void> {
  const { propertyId } = await venueOf(actor);
  if (!propertyId) throw new AppError("listings.propertyFirst");
  const [p] = await db()`select photos from properties where id = ${propertyId}`;
  const photos = (p!.photos as { fileId: string; caption?: string }[]) ?? [];
  if (photos.length + files.length > MAX_PHOTOS) throw new AppError("listings.tooManyPhotos", { max: MAX_PHOTOS });
  for (const f of files) photos.push({ fileId: (await storeUpload(actor.userId, "property_photo", f)).id });
  await db()`update properties set photos = ${db().json(photos as never)} where id = ${propertyId}`;
}

// ---------------------------------------------------------------------------
// Spaces (FR-M4-02, -03, -04, -09, -10, -11, -16)
// ---------------------------------------------------------------------------
export type SpaceInput = {
  name: string;
  type: string;
  levelText?: string;
  areaM2?: number | null;
  ceilingHeightM?: number | null;
  capacities?: Partial<Record<(typeof LAYOUTS)[number], number>>;
  powerKva?: number | null;
  environment?: "indoor" | "outdoor" | "covered";
  wifi?: boolean;
  accessibilityNotes?: string;
  permittedActivities?: string[];
  prohibitedCategories?: string;
  minDays?: number;
  maxDays?: number | null;
  videoUrl?: string;
  enquiryQuestions?: string[];
  cancellationPolicy?: "flexible" | "moderate" | "strict";
  bufferHours?: number;
};

function cleanSpace(input: SpaceInput) {
  if (!input.name.trim()) throw new AppError("errors.nameRequired");
  if (!SPACE_TYPES.includes(input.type as never)) throw new AppError("errors.invalidValue");
  const caps: Record<string, number> = {};
  for (const l of LAYOUTS) {
    const v = input.capacities?.[l];
    if (v != null && Number.isFinite(v) && v > 0) caps[l] = Math.round(v);
  }
  const questions = (input.enquiryQuestions ?? []).map((q) => q.trim()).filter(Boolean);
  if (questions.length > MAX_QUESTIONS) throw new AppError("listings.tooManyQuestions", { max: MAX_QUESTIONS });
  const minDays = Math.max(1, Math.round(input.minDays ?? 1));
  const maxDays = input.maxDays ? Math.round(input.maxDays) : null;
  if (maxDays !== null && maxDays < minDays) throw new AppError("listings.maxBelowMin");
  if (input.videoUrl && !/^https:\/\//.test(input.videoUrl)) throw new AppError("listings.videoUrlInvalid");
  return {
    name: input.name.trim(),
    type: input.type,
    level_text: input.levelText?.trim() || null,
    area_m2: input.areaM2 ?? null,
    ceiling_height_m: input.ceilingHeightM ?? null,
    capacities: caps,
    power_kva: input.powerKva ?? null,
    environment: input.environment ?? "indoor",
    wifi: !!input.wifi,
    accessibility_notes: input.accessibilityNotes?.trim() || null,
    permitted_activities: (input.permittedActivities ?? []).filter((a) => ACTIVITIES.includes(a as never)),
    prohibited_categories: input.prohibitedCategories?.trim() || null,
    min_days: minDays,
    max_days: maxDays,
    video_url: input.videoUrl?.trim() || null,
    enquiry_questions: questions.map((label, i) => ({ id: `q${i + 1}`, label })),
    cancellation_policy: input.cancellationPolicy ?? "moderate",
    buffer_hours: Math.max(0, Math.round(input.bufferHours ?? 0)),
  };
}

export async function createSpace(actor: Actor, input: SpaceInput): Promise<string> {
  const { propertyId } = await venueOf(actor);
  if (!propertyId) throw new AppError("listings.propertyFirst");
  const v = cleanSpace(input);
  const at = await now();
  const [s] = await db()`
    insert into spaces (property_id, name, type, level_text, area_m2, ceiling_height_m, capacities, power_kva, environment, wifi,
      accessibility_notes, permitted_activities, prohibited_categories, min_days, max_days, video_url, enquiry_questions,
      cancellation_policy, buffer_hours, status, created_at, updated_at)
    values (${propertyId}, ${v.name}, ${v.type}, ${v.level_text}, ${v.area_m2}, ${v.ceiling_height_m}, ${db().json(v.capacities)},
      ${v.power_kva}, ${v.environment}, ${v.wifi}, ${v.accessibility_notes}, ${v.permitted_activities}, ${v.prohibited_categories},
      ${v.min_days}, ${v.max_days}, ${v.video_url}, ${db().json(v.enquiry_questions)}, ${v.cancellation_policy}, ${v.buffer_hours},
      'draft', ${at}, ${at})
    returning id`;
  return String(s!.id);
}

/** Changes to a published space go live immediately and never affect sent quotes (FR-M4-10). */
export async function updateSpace(actor: Actor, spaceId: string, input: SpaceInput): Promise<void> {
  await spaceOfVenue(actor, spaceId);
  const v = cleanSpace(input);
  await db()`
    update spaces set name = ${v.name}, type = ${v.type}, level_text = ${v.level_text}, area_m2 = ${v.area_m2},
      ceiling_height_m = ${v.ceiling_height_m}, capacities = ${db().json(v.capacities)}, power_kva = ${v.power_kva},
      environment = ${v.environment}, wifi = ${v.wifi}, accessibility_notes = ${v.accessibility_notes},
      permitted_activities = ${v.permitted_activities}, prohibited_categories = ${v.prohibited_categories},
      min_days = ${v.min_days}, max_days = ${v.max_days}, video_url = ${v.video_url},
      enquiry_questions = ${db().json(v.enquiry_questions)}, cancellation_policy = ${v.cancellation_policy},
      buffer_hours = ${v.buffer_hours}, updated_at = ${await now()}
    where id = ${spaceId}`;
}

/** FR-M4-11: duplicate a space as a draft copy (rate card and seasons included, photos not). */
export async function duplicateSpace(actor: Actor, spaceId: string): Promise<string> {
  await spaceOfVenue(actor, spaceId);
  const at = await now();
  return db().begin(async (sql) => {
    const [copy] = await sql`
      insert into spaces (property_id, name, type, level_text, area_m2, ceiling_height_m, capacities, power_kva, environment, wifi,
        accessibility_notes, permitted_activities, prohibited_categories, min_days, max_days, video_url, enquiry_questions,
        cancellation_policy, buffer_hours, status, created_at, updated_at)
      select property_id, name || ' (salinan)', type, level_text, area_m2, ceiling_height_m, capacities, power_kva, environment, wifi,
        accessibility_notes, permitted_activities, prohibited_categories, min_days, max_days, video_url, enquiry_questions,
        cancellation_policy, buffer_hours, 'draft', ${at}, ${at}
      from spaces where id = ${spaceId}
      returning id`;
    const id = String(copy!.id);
    await sql`insert into rate_cards select ${id}::uuid, unit, weekday_price, weekend_price, min_units, min_spend, show_full_rate_card, from_price from rate_cards where space_id = ${spaceId}`;
    await sql`insert into rate_seasons (space_id, name, start_date, end_date, price) select ${id}::uuid, name, start_date, end_date, price from rate_seasons where space_id = ${spaceId}`;
    return id;
  });
}

/** FR-M4-04: up to 15 photos, WebP, one cover, captions. */
export async function addSpacePhotos(actor: Actor, spaceId: string, files: { name: string; bytes: Buffer }[]): Promise<void> {
  const { space } = await spaceOfVenue(actor, spaceId);
  const media = (space.media as { fileId: string; caption?: string; cover?: boolean }[]) ?? [];
  if (media.length + files.length > MAX_PHOTOS) throw new AppError("listings.tooManyPhotos", { max: MAX_PHOTOS });
  for (const f of files) {
    const stored = await storeUpload(actor.userId, "space_photo", f);
    media.push({ fileId: stored.id, caption: "", cover: media.length === 0 });
  }
  await db()`update spaces set media = ${db().json(media as never)}, updated_at = ${await now()} where id = ${spaceId}`;
}

export async function updateSpacePhotos(
  actor: Actor,
  spaceId: string,
  input: { coverFileId?: string; captions?: Record<string, string>; removeFileIds?: string[] },
): Promise<void> {
  const { space } = await spaceOfVenue(actor, spaceId);
  let media = (space.media as { fileId: string; caption?: string; cover?: boolean }[]) ?? [];
  media = media.filter((p) => !input.removeFileIds?.includes(p.fileId));
  for (const p of media) {
    if (input.captions?.[p.fileId] !== undefined) p.caption = input.captions[p.fileId]!.slice(0, 140);
    if (input.coverFileId) p.cover = p.fileId === input.coverFileId;
  }
  if (media.length && !media.some((p) => p.cover)) media[0]!.cover = true;
  await db()`update spaces set media = ${db().json(media as never)}, updated_at = ${await now()} where id = ${spaceId}`;
}

// ---------------------------------------------------------------------------
// Rate cards, seasons, add-ons, tax (FR-M5-01..06)
// ---------------------------------------------------------------------------
export async function setRateCard(
  actor: Actor,
  spaceId: string,
  input: { unit: "hour" | "half_day" | "day"; weekdayPrice: number; weekendPrice?: number | null; minUnits?: number; minSpend?: number | null; showFullRateCard: boolean; fromPrice?: number | null },
): Promise<void> {
  await spaceOfVenue(actor, spaceId);
  if (!["hour", "half_day", "day"].includes(input.unit)) throw new AppError("errors.invalidValue");
  for (const v of [input.weekdayPrice, input.weekendPrice, input.minSpend, input.fromPrice]) {
    if (v != null && (!Number.isSafeInteger(v) || v < 0)) throw new AppError("errors.amountInvalid");
  }
  const from = input.fromPrice ?? Math.min(input.weekdayPrice, input.weekendPrice ?? input.weekdayPrice);
  await db()`
    insert into rate_cards (space_id, unit, weekday_price, weekend_price, min_units, min_spend, show_full_rate_card, from_price)
    values (${spaceId}, ${input.unit}, ${input.weekdayPrice}, ${input.weekendPrice ?? null}, ${Math.max(1, input.minUnits ?? 1)},
      ${input.minSpend ?? null}, ${input.showFullRateCard}, ${from})
    on conflict (space_id) do update set unit = excluded.unit, weekday_price = excluded.weekday_price, weekend_price = excluded.weekend_price,
      min_units = excluded.min_units, min_spend = excluded.min_spend, show_full_rate_card = excluded.show_full_rate_card, from_price = excluded.from_price`;
}

export async function addSeason(actor: Actor, spaceId: string, input: { name: string; startDate: string; endDate: string; price: number }): Promise<void> {
  await spaceOfVenue(actor, spaceId);
  if (!input.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate) || input.endDate < input.startDate) {
    throw new AppError("errors.invalidValue");
  }
  if (!Number.isSafeInteger(input.price) || input.price < 0) throw new AppError("errors.amountInvalid");
  await db()`insert into rate_seasons (space_id, name, start_date, end_date, price) values (${spaceId}, ${input.name.trim()}, ${input.startDate}, ${input.endDate}, ${input.price})`;
}

export async function removeSeason(actor: Actor, spaceId: string, seasonId: string): Promise<void> {
  await spaceOfVenue(actor, spaceId);
  await db()`delete from rate_seasons where id = ${seasonId} and space_id = ${spaceId}`;
}

export async function saveAddOn(
  actor: Actor,
  input: { id?: string; name: string; unit: string; price: number; taxable: boolean; mandatory: boolean },
): Promise<void> {
  const { propertyId } = await venueOf(actor);
  if (!propertyId) throw new AppError("listings.propertyFirst");
  if (!input.name.trim() || !["per_day", "per_kva_day", "per_person", "per_item"].includes(input.unit)) throw new AppError("errors.invalidValue");
  if (!Number.isSafeInteger(input.price) || input.price < 0) throw new AppError("errors.amountInvalid");
  if (input.id) {
    await db()`
      update add_ons set name = ${input.name.trim()}, unit = ${input.unit}, price = ${input.price}, taxable = ${input.taxable}, mandatory = ${input.mandatory}
      where id = ${input.id} and property_id = ${propertyId}`;
  } else {
    await db()`
      insert into add_ons (property_id, name, unit, price, taxable, mandatory)
      values (${propertyId}, ${input.name.trim()}, ${input.unit}, ${input.price}, ${input.taxable}, ${input.mandatory})`;
  }
}

export async function removeAddOn(actor: Actor, addOnId: string): Promise<void> {
  const { propertyId } = await venueOf(actor);
  await db()`delete from add_ons where id = ${addOnId} and property_id = ${propertyId}`;
}

/** FR-M5-05: PKP status and service charge per operator. PPN rate and DPP come from admin settings. */
export async function setTaxSettings(actor: Actor, input: { isPkp: boolean; serviceChargeBps: number }): Promise<void> {
  const { m } = await venueOf(actor, "venue.threshold");
  if (!Number.isSafeInteger(input.serviceChargeBps) || input.serviceChargeBps < 0 || input.serviceChargeBps > 3000) throw new AppError("errors.invalidValue");
  await db()`
    insert into tax_settings (operator_id, is_pkp, service_charge_bps) values (${m.orgId}, ${input.isPkp}, ${input.serviceChargeBps})
    on conflict (operator_id) do update set is_pkp = excluded.is_pkp, service_charge_bps = excluded.service_charge_bps`;
  await audit({ scope: "user", actorId: actor.userId, action: "tax_settings.changed", entity: "organization", entityId: m.orgId, after: input, at: await now() });
}

// ---------------------------------------------------------------------------
// Status flow (FR-M4-10, FR-M3-03)
// ---------------------------------------------------------------------------
export async function submitSpace(actor: Actor, spaceId: string): Promise<void> {
  const { m, space } = await spaceOfVenue(actor, spaceId);
  if (space.status !== "draft") throw new AppError(space.status === "unpublished" ? "listings.usePublish" : "listings.wrongStatus");
  const [p] = await db()`select geo is not null as has_pin from properties where id = ${space.property_id as string}`;
  if (!p?.has_pin) throw new AppError("listings.pinRequired");
  const [rc] = await db()`select 1 from rate_cards where space_id = ${spaceId}`;
  if (!rc) throw new AppError("listings.rateCardRequired");
  if (!((space.media as unknown[]) ?? []).length) throw new AppError("listings.photoRequired");
  const at = await now();
  await db()`update spaces set status = 'in_review', submitted_at = ${at}, review_reason = null, updated_at = ${at} where id = ${spaceId}`;
  const [o] = await db()`select verification_status from organizations where id = ${m.orgId}`;
  if (o && (o.verification_status === "unsubmitted" || o.verification_status === "rejected")) {
    const owner = await db()`select user_id from memberships where org_id = ${m.orgId} and role = 'owner' limit 1`;
    await submitForVerification({ userId: m.role === "owner" ? actor.userId : String(owner[0]!.user_id) }, m.orgId);
  }
  await notify({ userIds: await adminIds(), event: "admin_space_submitted", values: { space: String(space.name) }, link: "/admin/ruang", emailOnly: true });
}

export async function setPublished(actor: Actor, spaceId: string, publish: boolean): Promise<void> {
  const { m, space } = await spaceOfVenue(actor, spaceId);
  const at = await now();
  if (publish) {
    if (space.status !== "unpublished" || !space.published_at) throw new AppError("listings.wrongStatus");
    if (!m.verified) throw new AppError("listings.operatorNotVerified");
    await db()`update spaces set status = 'published', updated_at = ${at} where id = ${spaceId}`;
  } else {
    if (space.status !== "published") throw new AppError("listings.wrongStatus");
    await db()`update spaces set status = 'unpublished', updated_at = ${at} where id = ${spaceId}`;
    await declineOpenEnquiriesForSpaces([spaceId], "space_unpublished");
  }
}

export async function venueSpaces(actor: Actor) {
  const { m, propertyId } = await venueOf(actor, "enquiry.view");
  if (!propertyId) return { membership: m, spaces: [] };
  const spaces = await db()`
    select s.id, s.name, s.type, s.status, s.review_reason, s.media, r.from_price
    from spaces s left join rate_cards r on r.space_id = s.id where s.property_id = ${propertyId} order by s.created_at`;
  return { membership: m, spaces };
}

export async function spaceForVenue(actor: Actor, spaceId: string) {
  const { m, space } = await spaceOfVenue(actor, spaceId, "enquiry.view");
  const [rateCard] = await db()`select * from rate_cards where space_id = ${spaceId}`;
  const seasons = await db()`select * from rate_seasons where space_id = ${spaceId} order by start_date`;
  return { membership: m, space, rateCard: rateCard ?? null, seasons };
}

export async function venueAddOnsAndTax(actor: Actor) {
  const { m, propertyId } = await venueOf(actor, "enquiry.view");
  const addOns = propertyId ? await db()`select * from add_ons where property_id = ${propertyId} order by name` : [];
  const [tax] = await db()`select * from tax_settings where operator_id = ${m.orgId}`;
  const [org] = await db()`select approval_threshold from organizations where id = ${m.orgId}`;
  return { membership: m, addOns, tax: tax ?? { is_pkp: false, service_charge_bps: 0 }, threshold: org?.approval_threshold ?? null };
}

// ---------------------------------------------------------------------------
// Quick estimate (FR-M5-07) — non-binding, shared pricing logic with the quote builder.
// ---------------------------------------------------------------------------
export async function loadPricing(spaceId: string, sql: Tx = db()) {
  const [row] = await sql`
    select r.*, p.id as property_id, p.operator_id, t.is_pkp, t.service_charge_bps
    from rate_cards r join spaces s on s.id = r.space_id join properties p on p.id = s.property_id
    left join tax_settings t on t.operator_id = p.operator_id where r.space_id = ${spaceId}`;
  if (!row) return null;
  const seasons = await sql`select name, to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(end_date, 'YYYY-MM-DD') as end_date, price from rate_seasons where space_id = ${spaceId}`;
  const addOns = await sql`select * from add_ons where property_id = ${row.property_id as string} order by name`;
  const card: RateCard = {
    unit: row.unit as RateCard["unit"],
    weekdayPrice: num(row.weekday_price),
    weekendPrice: row.weekend_price == null ? null : num(row.weekend_price),
    minUnits: Number(row.min_units),
    minSpend: row.min_spend == null ? null : num(row.min_spend),
  };
  return {
    card,
    fromPrice: num(row.from_price),
    showFull: !!row.show_full_rate_card,
    isPkp: !!row.is_pkp,
    serviceChargeBps: Number(row.service_charge_bps ?? 0),
    seasons: seasons.map((s): Season => ({ name: String(s.name), startDate: String(s.start_date), endDate: String(s.end_date), price: num(s.price) })),
    addOns: addOns.map((a): AddOn => ({ id: String(a.id), name: String(a.name), unit: a.unit as AddOn["unit"], price: num(a.price), taxable: !!a.taxable, mandatory: !!a.mandatory })),
  };
}

export async function quickEstimate(spaceId: string, input: { days: EventDay[]; addOnIds: string[]; quantities?: Record<string, number> }) {
  const p = await loadPricing(spaceId);
  if (!p) throw new AppError("listings.noRateCard");
  if (!input.days.length) throw new AppError("events.datesRequired");
  const s = await getSettings();
  return estimate({
    days: input.days,
    card: p.card,
    seasons: p.seasons,
    addOns: p.addOns,
    selectedAddOnIds: input.addOnIds,
    quantities: input.quantities,
    tax: { isPkp: p.isPkp, serviceChargeBps: p.serviceChargeBps, ppnRateBps: s.ppn_rate_bps, dppNumerator: s.ppn_dpp_numerator, dppDenominator: s.ppn_dpp_denominator },
    fee: { bps: s.organizer_fee_bps, min: s.organizer_fee_min, max: s.organizer_fee_max },
  });
}
