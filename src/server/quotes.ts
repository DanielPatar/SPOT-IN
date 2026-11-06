import { randomUUID } from "node:crypto";
import { db, num, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { AppError, PermissionError } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { loadHolidays } from "@/lib/holidays";
import { businessDayDeadline } from "@/lib/business-days";
import { schedule, cancelJobs } from "@/lib/jobs";
import { formatDateTime } from "@/lib/time";
import { formatRupiah } from "@/lib/money";
import { quoteTotals, validateSchedule, type PaymentSchedule, type PricingSnapshot, type QuoteLine } from "@/lib/quote-math";
import { priceForDate, unitsForDay } from "@/lib/pricing";
import { requirePermission, requireVerified, isUuid } from "./access";
import { notify, orgMemberIds } from "./notify";
import { enquiryForActor, recordVenueResponse, OPEN_STATUSES } from "./enquiries";
import { loadPricing } from "./listings";
import { rangesForDays, bufferConflict, releaseExpiredHolds, type DayRange } from "./calendar";
import type { Actor } from "./accounts";

/** Quotes and approval (M12), including backup quotes on held dates (FR-M12-13). */

export type QuoteRow = Record<string, unknown> & { id: string; status: string; version: number; lines: QuoteLine[]; totals: ReturnType<typeof quoteTotals> };

async function enquiryContext(enquiryId: string, sql: Tx = db()) {
  const [q] = await sql`
    select q.id, q.status, q.space_id, q.event_id, e.days, e.name as event_name, e.organizer_org_id, s.name as space_name,
           s.cancellation_policy, s.buffer_hours, p.operator_id, p.timezone, coalesce(r.unit, 'day') as unit, o.verification_status,
           o.approval_threshold
    from enquiries q join events e on e.id = q.event_id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    join organizations o on o.id = p.operator_id left join rate_cards r on r.space_id = s.id where q.id = ${enquiryId}`;
  if (!q) throw new PermissionError();
  return q;
}

export function enquiryRanges(ctx: Record<string, unknown>): DayRange[] {
  return rangesForDays(ctx.days as { date: string; start: string; end: string }[], String(ctx.unit), String(ctx.timezone));
}

/** Other parties' active entries overlapping the given ranges, by kind. */
export async function conflicts(spaceId: string, ranges: DayRange[], ownEnquiryId: string, sql: Tx = db()) {
  await releaseExpiredHolds(sql, spaceId);
  const out: { kind: string; bookingId: string | null; enquiryId: string | null }[] = [];
  for (const r of ranges) {
    const rows = await sql`
      select kind, booking_id, enquiry_id from calendar_entries
      where space_id = ${spaceId} and released_at is null and during && tstzrange(${r.start}, ${r.end})
        and (enquiry_id is null or enquiry_id <> ${ownEnquiryId})`;
    for (const x of rows) out.push({ kind: String(x.kind), bookingId: (x.booking_id as string | null) ?? null, enquiryId: (x.enquiry_id as string | null) ?? null });
  }
  return out;
}

async function pricingSnapshot(operatorId: string, sql: Tx = db()): Promise<PricingSnapshot> {
  const s = await getSettings(sql);
  const [tax] = await sql`select is_pkp, service_charge_bps from tax_settings where operator_id = ${operatorId}`;
  return {
    isPkp: !!tax?.is_pkp,
    serviceChargeBps: Number(tax?.service_charge_bps ?? 0),
    ppnRateBps: s.ppn_rate_bps,
    dppNumerator: s.ppn_dpp_numerator,
    dppDenominator: s.ppn_dpp_denominator,
    feeBps: s.organizer_fee_bps,
    feeMin: s.organizer_fee_min,
    feeMax: s.organizer_fee_max,
    commissionBps: s.commission_bps,
  };
}

/** Prefill from the rate card for the enquiry's dates (FR-M12-01): one rental line per price, mandatory add-ons. */
async function prefillLines(spaceId: string, days: { date: string; start: string; end: string }[]): Promise<QuoteLine[]> {
  const p = await loadPricing(spaceId);
  if (!p) return [];
  const groups = new Map<string, { label: string; price: number; qty: number }>();
  for (const d of days) {
    const { price, season } = priceForDate(d.date, p.card, p.seasons);
    const key = `${season ?? ""}:${price}`;
    const g = groups.get(key) ?? { label: season ? `Sewa ruang (${season})` : "Sewa ruang", price, qty: 0 };
    g.qty += unitsForDay(d, p.card);
    groups.set(key, g);
  }
  const lines: QuoteLine[] = [...groups.values()].map((g) => ({ id: randomUUID(), kind: "rental", label: g.label, quantity: g.qty, unitPrice: g.price, discount: 0, taxable: true }));
  for (const a of p.addOns.filter((x) => x.mandatory)) {
    lines.push({ id: randomUUID(), kind: "add_on", label: a.name, quantity: a.unit === "per_day" ? days.length : 1, unitPrice: a.price, discount: 0, taxable: a.taxable });
  }
  return lines;
}

function cleanLines(lines: QuoteLine[]): QuoteLine[] {
  if (!Array.isArray(lines) || lines.length === 0) throw new AppError("quotes.linesRequired");
  if (lines.length > 40) throw new AppError("errors.invalidValue");
  return lines.map((l) => {
    if (!l.label?.trim()) throw new AppError("quotes.lineLabelRequired");
    const quantity = Number(l.quantity);
    const unitPrice = Math.round(Number(l.unitPrice));
    const discount = Math.round(Number(l.discount || 0));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) throw new AppError("quotes.quantityInvalid");
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || !Number.isSafeInteger(discount) || discount < 0) throw new AppError("errors.amountInvalid");
    return { id: l.id && isUuid(l.id) ? l.id : randomUUID(), kind: ["rental", "add_on", "custom"].includes(l.kind) ? l.kind : "custom", label: l.label.trim().slice(0, 160), quantity: Math.round(quantity * 100) / 100, unitPrice, discount, taxable: !!l.taxable };
  });
}

async function quoteForVenue(actor: Actor, quoteId: string, permission: string, sql: Tx = db()) {
  if (!isUuid(quoteId)) throw new PermissionError();
  const m = await requirePermission(actor.userId, "venue_operator", permission, sql);
  const [qt] = await sql`
    select qt.*, p.operator_id from quotes qt join enquiries q on q.id = qt.enquiry_id join spaces s on s.id = q.space_id
    join properties p on p.id = s.property_id where qt.id = ${quoteId}`;
  if (!qt || qt.operator_id !== m.orgId) throw new PermissionError();
  return { m, quote: qt as unknown as QuoteRow };
}

/** Creates (or returns) the working draft for an enquiry. A revision starts from the latest sent version. */
export async function draftQuote(actor: Actor, enquiryId: string): Promise<string> {
  const { enquiry, side } = await enquiryForActor(actor, enquiryId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "quote.send");
  if (!(OPEN_STATUSES as readonly string[]).includes(String(enquiry.status))) throw new AppError("enquiries.closed");
  const [existing] = await db()`select id from quotes where enquiry_id = ${enquiryId} and status in ('draft', 'pending_approval') order by version desc limit 1`;
  if (existing) return String(existing.id);
  const ctx = await enquiryContext(enquiryId);
  const [last] = await db()`select * from quotes where enquiry_id = ${enquiryId} order by version desc limit 1`;
  const at = await now();
  const s = await getSettings();
  const snapshot = await pricingSnapshot(String(ctx.operator_id));
  const lines = last ? (last.lines as QuoteLine[]).map((l) => ({ ...l, id: randomUUID() })) : await prefillLines(String(ctx.space_id), ctx.days as never);
  const sched: PaymentSchedule = last ? (last.payment_schedule as PaymentSchedule) : { mode: "split", depositBps: 5000, depositDays: 3, balanceDaysBefore: 14 };
  const policy = last ? String(last.cancellation_policy) : String(ctx.cancellation_policy);
  const [qt] = await db()`
    insert into quotes (enquiry_id, version, status, lines, totals, pricing_snapshot, payment_schedule, cancellation_policy, policy_snapshot,
      validity_days, inclusions, exclusions, special_terms, created_by, created_at, updated_at)
    values (${enquiryId}, ${last ? Number(last.version) + 1 : 1}, 'draft', ${db().json(lines as never)}, ${db().json(quoteTotals(lines, snapshot) as never)},
      ${db().json(snapshot as never)}, ${db().json(sched as never)}, ${policy},
      ${db().json(s.cancellation_policies[policy as "moderate"] as never)}, ${last ? Number(last.validity_days) : 7},
      ${last?.inclusions ?? null}, ${last?.exclusions ?? null}, ${last?.special_terms ?? null}, ${actor.userId}, ${at}, ${at})
    returning id`;
  return String(qt!.id);
}

export async function updateDraft(
  actor: Actor,
  quoteId: string,
  input: { lines: QuoteLine[]; schedule: PaymentSchedule; validityDays: number; cancellationPolicy: string; inclusions?: string; exclusions?: string; specialTerms?: string },
): Promise<void> {
  const { quote } = await quoteForVenue(actor, quoteId, "quote.send");
  if (quote.status !== "draft") throw new AppError("quotes.notDraft");
  const s = await getSettings();
  const lines = cleanLines(input.lines);
  const err = validateSchedule(input.schedule, s.min_deposit_bps);
  if (err) throw new AppError(err, { min: s.min_deposit_bps / 100 });
  if (!["flexible", "moderate", "strict"].includes(input.cancellationPolicy)) throw new AppError("errors.invalidValue");
  if (!Number.isInteger(input.validityDays) || input.validityDays < 1 || input.validityDays > 60) throw new AppError("quotes.validityInvalid");
  const totals = quoteTotals(lines, quote.pricing_snapshot as unknown as PricingSnapshot);
  await db()`
    update quotes set lines = ${db().json(lines as never)}, totals = ${db().json(totals as never)}, payment_schedule = ${db().json(input.schedule as never)},
      validity_days = ${input.validityDays}, cancellation_policy = ${input.cancellationPolicy},
      policy_snapshot = ${db().json(s.cancellation_policies[input.cancellationPolicy as "moderate"] as never)},
      inclusions = ${input.inclusions?.trim() || null}, exclusions = ${input.exclusions?.trim() || null}, special_terms = ${input.specialTerms?.trim() || null},
      updated_at = ${await now()}
    where id = ${quoteId}`;
}

/** Checks dates before a quote can go out: Booked/Blocked refuse; others' holds make it a backup quote. */
async function sendChecks(quote: QuoteRow, sql: Tx = db()) {
  const ctx = await enquiryContext(String(quote.enquiry_id), sql);
  if (ctx.verification_status !== "verified") throw new AppError("listings.operatorNotVerified");
  if (!(OPEN_STATUSES as readonly string[]).includes(String(ctx.status))) throw new AppError("enquiries.closed");
  const ranges = enquiryRanges(ctx);
  const c = await conflicts(String(ctx.space_id), ranges, String(quote.enquiry_id), sql);
  const hard = c.find((x) => x.kind === "booked" || x.kind === "block");
  if (hard) {
    const [b] = hard.bookingId ? await sql`select reference from bookings where id = ${hard.bookingId}` : [];
    throw new AppError(hard.kind === "block" ? "quotes.datesBlocked" : "quotes.datesBooked", { ref: String(b?.reference ?? "") });
  }
  const buffer = await bufferConflict(String(ctx.space_id), ranges, Number(ctx.buffer_hours), sql, String(quote.enquiry_id));
  if (buffer) throw new AppError("quotes.bufferViolated", { end: formatDateTime(new Date(buffer.endsAt), String(ctx.timezone)) });
  const sched = quote.payment_schedule as unknown as PaymentSchedule;
  const firstDay = (ctx.days as { date: string }[])[0]!.date;
  if (sched.mode === "split") {
    const s = await getSettings(sql);
    const err = validateSchedule(sched, s.min_deposit_bps);
    if (err) throw new AppError(err, { min: s.min_deposit_bps / 100 });
  }
  return { ctx, isBackup: c.some((x) => x.kind === "tentative_hold" || x.kind === "booking_hold"), firstDay };
}

/** FR-M12-05, FR-M2-06: at or above the Owner's threshold a Staff quote waits for Owner approval. */
export async function submitQuote(actor: Actor, quoteId: string): Promise<"sent" | "pending_approval"> {
  const { m, quote } = await quoteForVenue(actor, quoteId, "quote.send");
  if (quote.status !== "draft") throw new AppError("quotes.notDraft");
  const { ctx } = await sendChecks(quote);
  const threshold = ctx.approval_threshold == null ? null : num(ctx.approval_threshold);
  const at = await now();
  if (threshold !== null && quote.totals.venueTotal >= threshold && m.role !== "owner") {
    await db()`update quotes set status = 'pending_approval', updated_at = ${at} where id = ${quoteId}`;
    await notify({
      userIds: await orgMemberIds(m.orgId, ["owner"]),
      event: "quote_approval_needed",
      values: { event: String(ctx.event_name), total: formatRupiah(quote.totals.venueTotal) },
      link: `/venue/enquiry/${quote.enquiry_id}/penawaran`,
    });
    return "pending_approval";
  }
  if (threshold !== null && quote.totals.venueTotal >= threshold) {
    await db()`update quotes set approval_by = ${actor.userId}, approval_at = ${at} where id = ${quoteId}`;
  }
  await sendQuote(quoteId, actor.userId);
  return "sent";
}

export async function approveQuote(actor: Actor, quoteId: string): Promise<void> {
  const { quote } = await quoteForVenue(actor, quoteId, "quote.approve");
  if (quote.status !== "pending_approval") throw new AppError("quotes.notPending");
  await db()`update quotes set status = 'approved', approval_by = ${actor.userId}, approval_at = ${await now()} where id = ${quoteId}`;
  await sendQuote(quoteId, actor.userId);
}

/** The Owner returns a pending quote with a comment; it becomes a draft again. */
export async function returnQuote(actor: Actor, quoteId: string, comment: string): Promise<void> {
  const { quote } = await quoteForVenue(actor, quoteId, "quote.approve");
  if (quote.status !== "pending_approval") throw new AppError("quotes.notPending");
  if (!comment.trim()) throw new AppError("errors.reasonRequired");
  await db()`update quotes set status = 'draft', approval_comment = ${comment.trim()}, updated_at = ${await now()} where id = ${quoteId}`;
  if (quote.created_by) await notify({ userIds: [String(quote.created_by)], event: "quote_returned", values: { comment }, link: `/venue/enquiry/${quote.enquiry_id}/penawaran` });
}

async function sendQuote(quoteId: string, actorId: string): Promise<void> {
  const at = await now();
  const holidays = await loadHolidays();
  const result = await db().begin(async (sql) => {
    const [qt] = await sql`select * from quotes where id = ${quoteId} for update`;
    const { ctx, isBackup } = await sendChecks(qt as unknown as QuoteRow, sql);
    const validUntil = new Date(at.getTime() + Number(qt!.validity_days) * 86_400_000);
    await sql`update quotes set status = 'superseded', updated_at = ${at} where enquiry_id = ${qt!.enquiry_id as string} and status = 'sent' and id <> ${quoteId}`;
    await sql`
      update quotes set status = 'sent', is_backup = ${isBackup}, sent_at = ${at}, valid_until = ${validUntil}, event_changed = false, updated_at = ${at}
      where id = ${quoteId}`;
    await sql`update enquiries set status = 'quoted', updated_at = ${at} where id = ${qt!.enquiry_id as string}`;
    await recordVenueResponse(String(qt!.enquiry_id), at, sql);
    return { ctx, isBackup, version: Number(qt!.version), enquiryId: String(qt!.enquiry_id), validUntil, totals: qt!.totals as QuoteRow["totals"] };
  });
  await schedule("quote.expire", result.validUntil, { quoteId }, { uniqueKey: `quote:${quoteId}:expire` });
  await notify({
    userIds: await orgMemberIds(String(result.ctx.organizer_org_id)),
    event: result.isBackup ? "quote_backup" : result.version > 1 ? "quote_revised" : "quote_sent",
    values: { space: String(result.ctx.space_name), total: formatRupiah(result.totals.organizerTotal), until: formatDateTime(result.validUntil, String(result.ctx.timezone)) },
    link: `/enquiry/${result.enquiryId}`,
  });
}

/** Organizer asks for a revision with general and per-line comments (FR-M12-06). */
export async function requestRevision(actor: Actor, quoteId: string, input: { general: string; lines: Record<string, string> }): Promise<void> {
  const { quote, ctx } = await quoteForOrganizer(actor, quoteId, "quote.accept");
  if (quote.status !== "sent") throw new AppError("quotes.notOpen");
  const lineComments = Object.fromEntries(Object.entries(input.lines).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim().slice(0, 500)]));
  if (!input.general.trim() && !Object.keys(lineComments).length) throw new AppError("quotes.revisionEmpty");
  const at = await now();
  await db()`update quotes set revision_comments = ${db().json({ general: input.general.trim(), lines: lineComments, at: at.toISOString(), by: actor.userId } as never)} where id = ${quoteId}`;
  await notify({ userIds: await orgMemberIds(String(ctx.operator_id), ["owner", "staff"]), event: "quote_revision_requested", values: { event: String(ctx.event_name) }, link: `/venue/enquiry/${quote.enquiry_id}/penawaran` });
}

export async function declineQuote(actor: Actor, quoteId: string, reason: string): Promise<void> {
  const { quote, ctx } = await quoteForOrganizer(actor, quoteId, "quote.accept");
  if (quote.status !== "sent") throw new AppError("quotes.notOpen");
  if (!reason.trim()) throw new AppError("errors.reasonRequired");
  const at = await now();
  await db()`update quotes set status = 'declined', decline_reason = ${reason.trim()}, decided_at = ${at}, updated_at = ${at} where id = ${quoteId}`;
  await cancelJobs(`quote:${quoteId}:`);
  await notify({ userIds: await orgMemberIds(String(ctx.operator_id), ["owner", "staff"]), event: "quote_declined", values: { event: String(ctx.event_name), reason }, link: `/venue/enquiry/${quote.enquiry_id}` });
}

export async function quoteForOrganizer(actor: Actor, quoteId: string, permission = "enquiry.view", sql: Tx = db()) {
  if (!isUuid(quoteId)) throw new PermissionError();
  const m = await requirePermission(actor.userId, "organizer", permission, sql);
  const [qt] = await sql`select * from quotes where id = ${quoteId}`;
  if (!qt) throw new PermissionError();
  const ctx = await enquiryContext(String(qt.enquiry_id), sql);
  if (ctx.organizer_org_id !== m.orgId || ["draft", "pending_approval", "approved"].includes(String(qt.status))) throw new PermissionError();
  return { m, quote: qt as unknown as QuoteRow, ctx };
}

/** Job: quote.expire at validity end (FR-M12-08). Backup quotes may have been extended meanwhile. */
export async function expireQuoteJob(quoteId: string, at: Date): Promise<void> {
  const rows = await db()`
    update quotes set status = 'expired', expire_reason = 'validity', decided_at = ${at}, updated_at = ${at}
    where id = ${quoteId} and status = 'sent' and valid_until <= ${at} returning enquiry_id`;
  if (!rows[0]) return;
  const ctx = await enquiryContext(String(rows[0].enquiry_id));
  await notify({ userIds: await orgMemberIds(String(ctx.organizer_org_id)), event: "quote_expired", values: { space: String(ctx.space_name) }, link: `/enquiry/${rows[0].enquiry_id}` });
}

// ---------------------------------------------------------------------------
// Backup quotes (FR-M12-13)
// ---------------------------------------------------------------------------

/** When holds on a space are released, every backup-quote holder for those dates is told at once. */
export async function onHoldsReleased(spaceId: string, ranges: DayRange[]): Promise<void> {
  const at = await now();
  const holidays = await loadHolidays();
  const backups = await db()`
    select qt.id, qt.enquiry_id, qt.valid_until from quotes qt join enquiries q on q.id = qt.enquiry_id
    where q.space_id = ${spaceId} and qt.status = 'sent' and qt.is_backup`;
  for (const b of backups) {
    const ctx = await enquiryContext(String(b.enquiry_id));
    const mine = enquiryRanges(ctx);
    if (!mine.some((r) => ranges.some((x) => r.start < x.end && x.start < r.end))) continue;
    const still = await conflicts(spaceId, mine, String(b.enquiry_id));
    if (still.length) continue;
    const minValid = businessDayDeadline(at, 2, String(ctx.timezone), holidays);
    if (new Date(b.valid_until as Date) < minValid) {
      await db()`update quotes set valid_until = ${minValid} where id = ${b.id as string}`;
      await schedule("quote.expire", minValid, { quoteId: String(b.id) }, { uniqueKey: `quote:${b.id}:expire` });
    }
    await notify({ userIds: await orgMemberIds(String(ctx.organizer_org_id)), event: "quote_backup_acceptable", values: { space: String(ctx.space_name) }, link: `/enquiry/${b.enquiry_id}` });
  }
}

/** When a booking on the dates is confirmed, backup quotes for those dates expire ("Dates booked"). */
export async function expireBackupsForBooking(spaceId: string, ranges: DayRange[], exceptEnquiryId: string): Promise<void> {
  const at = await now();
  const backups = await db()`
    select qt.id, qt.enquiry_id from quotes qt join enquiries q on q.id = qt.enquiry_id
    where q.space_id = ${spaceId} and qt.status = 'sent' and q.id <> ${exceptEnquiryId}`;
  for (const b of backups) {
    const ctx = await enquiryContext(String(b.enquiry_id));
    if (!enquiryRanges(ctx).some((r) => ranges.some((x) => r.start < x.end && x.start < r.end))) continue;
    await db()`update quotes set status = 'expired', expire_reason = 'dates_booked', decided_at = ${at}, updated_at = ${at} where id = ${b.id as string}`;
    await cancelJobs(`quote:${b.id}:`);
    await notify({ userIds: await orgMemberIds(String(ctx.organizer_org_id)), event: "quote_dates_booked", values: { space: String(ctx.space_name) }, link: `/enquiry/${b.enquiry_id}` });
  }
}

/** FR-M9-09: editing the event marks open quotes "Event changed – review". */
export async function flagQuotesForEventChange(eventId: string, sql: Tx = db()): Promise<void> {
  await sql`
    update quotes set event_changed = true where status = 'sent' and enquiry_id in (select id from enquiries where event_id = ${eventId})`;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function quotesForEnquiry(actor: Actor, enquiryId: string) {
  const { side } = await enquiryForActor(actor, enquiryId);
  const rows = side === "venue"
    ? await db()`select * from quotes where enquiry_id = ${enquiryId} order by version desc`
    : await db()`select * from quotes where enquiry_id = ${enquiryId} and status not in ('draft', 'pending_approval', 'approved') order by version desc`;
  return { side, quotes: rows as unknown as QuoteRow[] };
}

export type LineDiff = { label: string; before?: number; after?: number; change: "added" | "removed" | "changed" | "same" };

/** Diff between two versions for the organizer (FR-M12-07). Lines are matched by label. */
export function diffQuotes(prev: QuoteRow | undefined, curr: QuoteRow): LineDiff[] {
  const amt = (l: QuoteLine) => Math.max(0, Math.round((l.unitPrice * Math.round(l.quantity * 100)) / 100) - (l.discount || 0));
  const before = new Map((prev?.lines ?? []).map((l) => [l.label, amt(l)]));
  const out: LineDiff[] = [];
  for (const l of curr.lines) {
    const a = amt(l);
    const b = before.get(l.label);
    out.push({ label: l.label, before: b, after: a, change: b === undefined ? (prev ? "added" : "same") : b === a ? "same" : "changed" });
    before.delete(l.label);
  }
  for (const [label, b] of before) out.push({ label, before: b, change: "removed" });
  return out;
}

/** Can the organizer accept this quote right now, and if not, why (shown instead of the button). */
export async function acceptBlocker(quote: QuoteRow): Promise<string | null> {
  const at = await now();
  if (quote.status !== "sent") return quote.status === "superseded" ? "quotes.superseded" : quote.status === "expired" ? "quotes.expired" : "quotes.notOpen";
  if (quote.valid_until && new Date(quote.valid_until as Date) <= at) return "quotes.expired";
  if (quote.event_changed) return "quotes.eventChanged";
  const ctx = await enquiryContext(String(quote.enquiry_id));
  const c = await conflicts(String(ctx.space_id), enquiryRanges(ctx), String(quote.enquiry_id));
  if (c.some((x) => x.kind === "booked" || x.kind === "block")) return "quotes.datesBookedOrganizer";
  if (c.length) return "quotes.datesHeld";
  return null;
}

export async function compareQuotes(actor: Actor, eventId: string) {
  const m = await requirePermission(actor.userId, "organizer", "enquiry.view");
  const [e] = await db()`select id, name, days from events where id = ${eventId} and organizer_org_id = ${m.orgId}`;
  if (!e) throw new PermissionError();
  const rows = await db()`
    select distinct on (q.id) qt.*, s.name as space_name, p.name as property_name, p.timezone, q.created_at as enquiry_at, q.first_response_at
    from enquiries q join quotes qt on qt.enquiry_id = q.id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    where q.event_id = ${eventId} and qt.status in ('sent', 'accepted', 'expired')
    order by q.id, qt.version desc`;
  return { event: e, quotes: rows as unknown as (QuoteRow & { space_name: string; property_name: string; timezone: string; enquiry_at: Date; first_response_at: Date | null })[] };
}

export { requireVerified };
