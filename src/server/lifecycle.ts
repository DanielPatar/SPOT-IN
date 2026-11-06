import { db, num, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { t } from "@/lib/i18n";
import { AppError, PermissionError } from "@/lib/permissions";
import { schedule, cancelJobs } from "@/lib/jobs";
import { audit } from "@/lib/audit";
import { daysBetween, formatDateTime, localDate, zonedInstant } from "@/lib/time";
import { formatRupiah, mulDivHalfUp } from "@/lib/money";
import { nextBusinessDayAt } from "@/lib/business-days";
import { loadHolidays } from "@/lib/holidays";
import { getSettings } from "@/lib/settings";
import { renderPdf, type DocBlock } from "@/lib/pdf";
import type { PricingSnapshot, QuoteTotals } from "@/lib/quote-math";
import { requirePermission, requireAdmin, isUuid } from "./access";
import { adminIds, notify, orgMemberIds } from "./notify";
import { bookingFor, creditNoteFor, refundAllPaid } from "./bookings";
import { post } from "./ledger";
import { storeGenerated } from "./documents";
import { storeUpload } from "./files";
import { onHoldsReleased } from "./quotes";
import type { Actor } from "./accounts";

/**
 * After confirmation (Build 3): required-documents checklist (M17), readiness warnings,
 * event start/end, post-event window, reported problems and simulated release (M16),
 * cancellations and no-show (M18). Every time comes from the application clock.
 */

type Booking = Record<string, unknown>;
const LIVE = ["confirmed", "balance_due", "fully_paid"];

async function bookingCtx(bookingId: string, sql: Tx = db()) {
  const [r] = await sql`
    select b.*, p.timezone, p.required_docs, e.name as event_name, s.name as space_name,
           q.totals, q.pricing_snapshot, q.policy_snapshot, q.cancellation_policy
    from bookings b join spaces s on s.id = b.space_id join properties p on p.id = s.property_id
    join events e on e.id = b.event_id join quotes q on q.id = b.quote_id where b.id = ${bookingId}`;
  if (!r) throw new PermissionError();
  return r as Booking & { timezone: string; totals: QuoteTotals; pricing_snapshot: PricingSnapshot; policy_snapshot: { minDays: number; refundBps: number }[]; days: { date: string; start: string; end: string }[] };
}

/** Actual event start and end from the booked days' times in the property's time zone. */
export function eventTimes(days: { date: string; start: string; end: string }[], tz: string): { start: Date; end: Date } {
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const start = zonedInstant(first.date, first.start, tz);
  let end = zonedInstant(last.date, last.end === "24:00" ? "23:59" : last.end, tz);
  if (end <= zonedInstant(last.date, last.start, tz)) end = new Date(end.getTime() + 86_400_000); // ends after midnight
  return { start, end };
}

function everyone(b: Booking) {
  return Promise.all([orgMemberIds(String(b.organizer_org_id)), orgMemberIds(String(b.operator_id), ["owner", "staff"])]).then(([a, c]) => [...a, ...c]);
}

// ---------------------------------------------------------------------------
// Confirmation hook: checklist + lifecycle jobs
// ---------------------------------------------------------------------------
export async function onBookingConfirmed(bookingId: string): Promise<void> {
  const b = await bookingCtx(bookingId);
  const at = await now();
  const docs = (b.required_docs ?? []) as { name: string; mandatory: boolean; dueOffsetDays: number }[];
  const existing = await db()`select 1 from booking_documents where booking_id = ${bookingId} limit 1`;
  if (!existing.length) {
    // FR-M17-02: due dates computed from the event start.
    for (const [i, d] of docs.entries()) {
      const due = new Date(eventTimes(b.days, b.timezone).start.getTime() - Number(d.dueOffsetDays ?? 0) * 86_400_000);
      await db()`
        insert into booking_documents (booking_id, name, mandatory, due_at, position, created_at, updated_at)
        values (${bookingId}, ${d.name}, ${d.mandatory !== false}, ${due}, ${i}, ${at}, ${at})`;
    }
  }
  const { start, end } = eventTimes(b.days, b.timezone);
  for (const days of [7, 3]) {
    await schedule("booking.readiness", new Date(start.getTime() - days * 86_400_000), { bookingId, days }, { uniqueKey: `booking:${bookingId}:readiness:${days}` });
  }
  await schedule("booking.event_start", start, { bookingId }, { uniqueKey: `booking:${bookingId}:event_start` });
  await schedule("booking.event_end", end, { bookingId }, { uniqueKey: `booking:${bookingId}:event_end` });
}

// ---------------------------------------------------------------------------
// M17 document checklist
// ---------------------------------------------------------------------------
export async function checklist(actor: Actor, bookingId: string) {
  await bookingFor(actor, bookingId);
  const docs = await db()`select * from booking_documents where booking_id = ${bookingId} order by position, created_at`;
  const versions = docs.length
    ? await db()`
        select v.document_id, v.version, v.file_id, v.created_at, f.filename, u.name as uploader
        from booking_document_versions v join files f on f.id = v.file_id left join users u on u.id = v.uploaded_by
        where v.document_id in ${db()(docs.map((d) => String(d.id)))} order by v.version desc`
    : [];
  return docs.map((d) => ({ ...(d as Record<string, unknown>), versions: versions.filter((v) => v.document_id === d.id) })) as (Record<string, unknown> & { id: string; name: string; status: string; due_at: Date; versions: Record<string, unknown>[] })[];
}

async function docFor(actor: Actor, documentId: string) {
  if (!isUuid(documentId)) throw new PermissionError();
  const [d] = await db()`select * from booking_documents where id = ${documentId}`;
  if (!d) throw new PermissionError();
  const { booking, side } = await bookingFor(actor, String(d.booking_id));
  return { doc: d, booking, side };
}

export async function uploadDocument(actor: Actor, documentId: string, file: { name: string; bytes: Buffer }): Promise<void> {
  const { doc, booking, side } = await docFor(actor, documentId);
  if (side !== "organizer") throw new PermissionError();
  await requirePermission(actor.userId, "organizer", "documents.upload");
  if (!LIVE.includes(String(booking.status)) && booking.status !== "in_progress") throw new AppError("bookings.closed");
  if (doc.status === "approved" || doc.status === "waived") throw new AppError("documents.closed");
  const stored = await storeUpload(actor.userId, "compliance_document", file);
  const at = await now();
  await db().begin(async (sql) => {
    const [v] = await sql`select coalesce(max(version), 0) + 1 as n from booking_document_versions where document_id = ${documentId}`;
    await sql`insert into booking_document_versions (document_id, version, file_id, uploaded_by, created_at) values (${documentId}, ${Number(v!.n)}, ${stored.id}, ${actor.userId}, ${at})`;
    await sql`update booking_documents set status = 'submitted', updated_at = ${at} where id = ${documentId}`;
    await audit({ scope: "user", actorId: actor.userId, action: "document.submitted", entity: "booking", entityId: String(booking.id), after: { name: doc.name, version: Number(v!.n) }, at }, sql);
  });
  await notify({ userIds: await orgMemberIds(String(booking.operator_id), ["owner", "staff"]), event: "document_submitted", values: { name: String(doc.name), ref: String(booking.reference) }, link: `/pemesanan/${booking.id}` });
}

export async function reviewDocument(actor: Actor, documentId: string, decision: "approve" | "changes" | "waive", comment: string): Promise<void> {
  const { doc, booking, side } = await docFor(actor, documentId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "documents.review");
  if (decision === "changes" && !comment.trim()) throw new AppError("documents.commentRequired");
  if (decision !== "waive" && doc.status !== "submitted") throw new AppError("documents.notSubmitted");
  const status = decision === "approve" ? "approved" : decision === "changes" ? "changes_requested" : "waived";
  const at = await now();
  await db()`update booking_documents set status = ${status}, reviewer_comment = ${comment.trim() || null}, reviewed_by = ${actor.userId}, reviewed_at = ${at}, updated_at = ${at} where id = ${documentId}`;
  await audit({ scope: "user", actorId: actor.userId, action: `document.${status}`, entity: "booking", entityId: String(booking.id), after: { name: doc.name, comment }, at });
  await notify({ userIds: await orgMemberIds(String(booking.organizer_org_id)), event: decision === "changes" ? "document_changes" : "document_approved", values: { name: String(doc.name), ref: String(booking.reference), comment }, link: `/pemesanan/${booking.id}` });
}

/** FR-M17-04: venue marks the booking At risk (or clears it). */
export async function setAtRisk(actor: Actor, bookingId: string, atRisk: boolean, reason: string): Promise<void> {
  const { booking, side } = await bookingFor(actor, bookingId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "documents.review");
  if (atRisk && !reason.trim()) throw new AppError("errors.reasonRequired");
  await db()`update bookings set at_risk = ${atRisk}, at_risk_reason = ${atRisk ? reason.trim() : null} where id = ${bookingId}`;
  await audit({ scope: "user", actorId: actor.userId, action: atRisk ? "booking.at_risk" : "booking.at_risk_cleared", entity: "booking", entityId: bookingId, after: { reason }, at: await now() });
  if (atRisk) await notify({ userIds: await orgMemberIds(String(booking.organizer_org_id)), event: "booking_at_risk", values: { ref: String(booking.reference), reason }, link: `/pemesanan/${bookingId}` });
}

/** Job: readiness warnings 7 and 3 days before the event (FR-M17-04). */
export async function readinessJob(bookingId: string, days: number): Promise<void> {
  const b = await bookingCtx(bookingId);
  if (!LIVE.includes(String(b.status))) return;
  const missing = await db()`select name from booking_documents where booking_id = ${bookingId} and mandatory and status not in ('approved', 'waived')`;
  const [balance] = await db()`select 1 from payment_requests where booking_id = ${bookingId} and kind = 'balance' and status = 'open'`;
  const unpaidBalance = !!balance || (b.status === "confirmed" && !!b.balance_due_at);
  if (!missing.length && !unpaidBalance) return;
  const parts = [
    ...(missing.length ? [t("notify.readiness.docs", { names: missing.map((m) => String(m.name)).join(", ") })] : []),
    ...(unpaidBalance ? [t("notify.readiness.balance")] : []),
  ];
  await notify({ userIds: await everyone(b), event: "readiness_warning", values: { ref: String(b.reference), days, issues: parts.join(" ") }, link: `/pemesanan/${bookingId}` });
}

// ---------------------------------------------------------------------------
// Event start / end, post-event window, problems, release (M16)
// ---------------------------------------------------------------------------
export async function eventStartJob(bookingId: string): Promise<void> {
  await db()`update bookings set status = 'in_progress', updated_at = ${await now()} where id = ${bookingId} and status in ('confirmed', 'balance_due', 'fully_paid')`;
}

/** FR-M16-08 / FR-M16-01: window of N hours from the end of the last day; release at 10:00 property time on the next business day after it. */
export async function eventEndJob(bookingId: string): Promise<void> {
  const b = await bookingCtx(bookingId);
  if (!["in_progress", "confirmed", "balance_due", "fully_paid"].includes(String(b.status))) return;
  const s = await getSettings();
  const windowEnds = new Date(eventTimes(b.days, b.timezone).end.getTime() + Number(s.post_event_window_hours) * 3600_000);
  const releaseAt = nextBusinessDayAt(windowEnds, "10:00", b.timezone, await loadHolidays());
  await db()`update bookings set status = 'post_event_window', post_event_window_ends_at = ${windowEnds}, release_scheduled_at = ${releaseAt}, updated_at = ${await now()} where id = ${bookingId}`;
  await schedule("booking.release", releaseAt, { bookingId }, { uniqueKey: `booking:${bookingId}:release` });
  await notify({ userIds: await everyone(b), event: "post_event_window", values: { ref: String(b.reference), until: formatDateTime(windowEnds, b.timezone), release: formatDateTime(releaseAt, b.timezone) }, link: `/pemesanan/${bookingId}` });
}

export async function reportProblem(actor: Actor, bookingId: string, description: string, photos: { name: string; bytes: Buffer }[]): Promise<void> {
  const { booking, side } = await bookingFor(actor, bookingId);
  const at = await now();
  if (booking.status !== "post_event_window" || (booking.post_event_window_ends_at && new Date(booking.post_event_window_ends_at as Date) <= at)) throw new AppError("problems.windowClosed");
  if (!description.trim()) throw new AppError("problems.descriptionRequired");
  if (photos.length > 5) throw new AppError("errors.invalidValue");
  const ids: string[] = [];
  for (const p of photos) ids.push((await storeUpload(actor.userId, "problem_photo", p)).id);
  await db()`
    insert into booking_problems (booking_id, reported_by, side, description, photos, created_at)
    values (${bookingId}, ${actor.userId}, ${side}, ${description.trim().slice(0, 4000)}, ${db().json(ids)}, ${at})`;
  await audit({ scope: "user", actorId: actor.userId, action: "problem.reported", entity: "booking", entityId: bookingId, after: { side }, at });
  await notify({ userIds: [...(await everyone(booking)), ...(await adminIds())], event: "problem_reported", values: { ref: String(booking.reference) }, link: `/pemesanan/${bookingId}` });
}

/** Admin closes a problem: release as is, or record a simulated adjustment with a reason. */
export async function resolveProblem(actor: Actor, problemId: string, input: { outcome: "release_as_is" | "adjusted"; adjustment?: number; note: string }): Promise<void> {
  await requireAdmin(actor.userId);
  if (!isUuid(problemId)) throw new PermissionError();
  if (!input.note.trim()) throw new AppError("errors.reasonRequired");
  const [p] = await db()`select * from booking_problems where id = ${problemId} and status = 'open'`;
  if (!p) throw new AppError("problems.notOpen");
  const adjustment = input.outcome === "adjusted" ? Math.round(Number(input.adjustment ?? 0)) : 0;
  if (input.outcome === "adjusted" && (!Number.isSafeInteger(adjustment) || adjustment <= 0)) throw new AppError("errors.amountInvalid");
  const at = await now();
  const [done] = await db()`
    update booking_problems set status = 'resolved', outcome = ${input.outcome}, adjustment = ${adjustment || null}, resolution_note = ${input.note.trim()},
      resolved_by = ${actor.userId}, resolved_at = ${at} where id = ${problemId} and status = 'open' returning id`;
  if (!done) throw new AppError("problems.notOpen");
  await audit({ scope: "admin", actorId: actor.userId, action: "problem.resolved", entity: "booking", entityId: String(p.booking_id), after: input, at });
  const bookingId = String(p.booking_id);
  const [b] = await db()`select * from bookings where id = ${bookingId}`;
  await notify({ userIds: await everyone(b!), event: "problem_resolved", values: { ref: String(b!.reference), note: input.note.trim() }, link: `/pemesanan/${bookingId}` });
  // If release was due and no other problem is open, it runs now.
  if (b!.release_scheduled_at && new Date(b!.release_scheduled_at as Date) <= at) await releaseJob(bookingId);
}

export async function problemsFor(bookingId: string) {
  return db()`select p.*, u.name as reporter from booking_problems p left join users u on u.id = p.reported_by where booking_id = ${bookingId} order by created_at`;
}

export async function openProblemsQueue() {
  return db()`
    select p.id, p.booking_id, p.side, p.description, p.created_at, b.reference, u.name as reporter
    from booking_problems p join bookings b on b.id = p.booking_id left join users u on u.id = p.reported_by
    where p.status = 'open' order by p.created_at`;
}

/** Figures for a settlement or a cancellation from what was actually paid (PRD §11.2, §11.3). */
async function paidParts(bookingId: string, sql: Tx = db()) {
  const [r] = await sql`
    select coalesce(sum(venue_part) filter (where status = 'paid'), 0)::bigint as venue,
           coalesce(sum(fee_part) filter (where status = 'paid'), 0)::bigint as fee
    from payment_requests where booking_id = ${bookingId}`;
  return { venuePaid: num(r!.venue), feePaid: num(r!.fee) };
}

function commissionOn(venueAmount: number, totals: QuoteTotals, snap: PricingSnapshot): number {
  const exPpn = totals.venueTotal ? venueAmount - mulDivHalfUp(venueAmount, totals.ppn, totals.venueTotal) : venueAmount;
  return mulDivHalfUp(exPpn, snap.commissionBps, 10_000);
}

/** Job: simulated release (FR-M16-01, -07, -09). Holds while a problem is open. */
export async function releaseJob(bookingId: string): Promise<void> {
  const b = await bookingCtx(bookingId);
  if (!["post_event_window", "on_hold"].includes(String(b.status))) return;
  const open = await db()`select 1 from booking_problems where booking_id = ${bookingId} and status = 'open'`;
  const at = await now();
  if (open.length) {
    await db()`update bookings set status = 'on_hold', updated_at = ${at} where id = ${bookingId}`;
    return;
  }
  const { venuePaid, feePaid } = await paidParts(bookingId);
  const [adj] = await db()`select coalesce(sum(adjustment), 0)::bigint as v from booking_problems where booking_id = ${bookingId} and outcome = 'adjusted'`;
  const adjustment = Math.min(num(adj!.v), venuePaid);
  const venueKept = venuePaid - adjustment;
  const commission = commissionOn(venueKept, b.totals, b.pricing_snapshot);
  const venuePayable = venueKept - commission;
  const settlement = { venuePaid, feePaid, adjustment, commission, venuePayable, spotinRevenue: commission + feePaid, releasedAt: at.toISOString() };
  const done = await db().begin(async (sql) => {
    const [row] = await sql`update bookings set status = 'settled', released_at = ${at}, settlement = ${sql.json(settlement)}, updated_at = ${at} where id = ${bookingId} and status in ('post_event_window', 'on_hold') returning id`;
    if (!row) return false;
    if (adjustment) await refundAmount(sql, bookingId, adjustment, "problem_adjustment");
    await post(bookingId, [
      { debit: "venue_payable", credit: "held", amount: venuePayable, refType: "release", memo: "venue payable (simulated)" },
      { debit: "spotin_commission", credit: "held", amount: commission, refType: "release", memo: "commission" },
      { debit: "spotin_fee", credit: "held", amount: feePaid, refType: "release", memo: "organizer fee" },
    ], sql);
    await audit({ scope: "system", actorId: null, action: "booking.released", entity: "booking", entityId: bookingId, after: settlement, at }, sql);
    return true;
  });
  if (!done) return;
  try {
    const bytes = await statementPdf(bookingId);
    const fileId = await storeGenerated(bytes, `penyelesaian-${String(b.reference)}.pdf`);
    await db()`update bookings set settlement_file_id = ${fileId} where id = ${bookingId}`;
  } catch (e) {
    console.error("[settlement pdf]", e);
  }
  await notify({ userIds: await everyone(b), event: "booking_released", values: { ref: String(b.reference), amount: formatRupiah(venuePayable) }, link: `/pemesanan/${bookingId}` });
}

// ---------------------------------------------------------------------------
// Statement (FR-M15-07): CSV and watermarked PDF
// ---------------------------------------------------------------------------
export async function statementRows(bookingId: string) {
  const rows = await db()`select created_at, debit_account, credit_account, amount, ref_type, memo from ledger_entries where booking_id = ${bookingId} order by id`;
  return rows.map((r) => ({ at: r.created_at as Date, debit: String(r.debit_account), credit: String(r.credit_account), amount: num(r.amount), type: String(r.ref_type), memo: String(r.memo ?? "") }));
}

export async function statementCsv(actor: Actor, bookingId: string): Promise<string> {
  const { booking } = await bookingFor(actor, bookingId);
  const [p] = await db()`select p.timezone from spaces s join properties p on p.id = s.property_id where s.id = ${booking.space_id as string}`;
  const tz = String(p!.timezone);
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = ["time", "type", "debit", "credit", "amount_idr", "memo"].map((k) => t(`statement.csv.${k}`));
  const lines = (await statementRows(bookingId)).map((r) => [formatDateTime(r.at, tz), t(`statement.types.${r.type}`), t(`statement.accounts.${r.debit}`), t(`statement.accounts.${r.credit}`), String(r.amount), r.memo].map(esc).join(","));
  return [head.join(","), ...lines].join("\n") + "\n";
}

export async function statementPdf(bookingId: string): Promise<Buffer> {
  const b = await bookingCtx(bookingId);
  const s = (b.settlement ?? null) as { venuePaid: number; feePaid: number; adjustment: number; commission: number; venuePayable: number; spotinRevenue: number } | null;
  const c = (b.cancellation ?? null) as Record<string, number> | null;
  const rows = await statementRows(bookingId);
  const blocks: DocBlock[] = [
    { type: "kv", rows: [[t("docs.event"), String(b.event_name)], [t("docs.space"), String(b.space_name)], [t("statement.status"), t(`bookingStatus.${String(b.status)}`)]] },
    { type: "heading", text: t("statement.summary") },
    {
      type: "money",
      rows: [
        { label: t("quoteBuilder.venueTotal"), value: formatRupiah(b.totals.venueTotal) },
        { label: t("statement.ppnIncluded"), value: formatRupiah(b.totals.ppn) },
        { label: t("quoteBuilder.spotinFee"), value: formatRupiah(b.totals.organizerFee) },
        ...(s
          ? [
              { label: t("statement.adjustment"), value: formatRupiah(s.adjustment) },
              { label: t("statement.commission"), value: formatRupiah(s.commission) },
              { label: t("statement.venuePayable"), value: formatRupiah(s.venuePayable), strong: true },
              { label: t("statement.spotinRevenue"), value: formatRupiah(s.spotinRevenue), strong: true },
            ]
          : []),
        ...(c
          ? [
              { label: t("cancel.refund"), value: formatRupiah(c.refundTotal ?? 0), strong: true },
              { label: t("cancel.venueKeeps"), value: formatRupiah(c.venueKeeps ?? 0) },
            ]
          : []),
      ],
    },
    { type: "heading", text: t("statement.entries") },
    {
      type: "table",
      columns: [t("statement.csv.time"), t("statement.csv.type"), t("statement.csv.debit"), t("statement.csv.credit"), t("statement.csv.amount_idr")],
      widths: [100, 80, 110, 110, 99],
      alignRight: [4],
      rows: rows.map((r) => [formatDateTime(r.at, b.timezone), t(`statement.types.${r.type}`), t(`statement.accounts.${r.debit}`), t(`statement.accounts.${r.credit}`), formatRupiah(r.amount)]),
    },
    { type: "text", text: t("statement.simulated"), muted: true },
  ];
  const { bytes } = await renderPdf({ title: t("statement.title"), number: String(b.reference), footerNote: t("docs.pilotFooter"), blocks });
  return bytes;
}

// ---------------------------------------------------------------------------
// M18 cancellations
// ---------------------------------------------------------------------------
export type CancellationFigures = {
  daysBefore: number;
  tierBps: number;
  venuePaid: number;
  retained: number;
  refundVenue: number;
  venueKeeps: number;
  feePaid: number;
  feeRefunded: number;
  commission: number;
  refundTotal: number;
};

/** PRD §11.3 for an organizer cancellation at `at`. Shown before confirming; executed identically (FR-M18-04). */
export async function organizerCancellationFigures(bookingId: string, at?: Date): Promise<CancellationFigures> {
  const b = await bookingCtx(bookingId);
  const when = at ?? (await now());
  const firstDay = b.days[0]!.date;
  const daysBefore = Math.max(0, daysBetween(localDate(when, b.timezone), firstDay));
  const tiers = [...b.policy_snapshot].sort((x, y) => y.minDays - x.minDays);
  const tierBps = (tiers.find((x) => daysBefore >= x.minDays) ?? tiers[tiers.length - 1] ?? { refundBps: 0 }).refundBps;
  const { venuePaid, feePaid } = await paidParts(bookingId);
  const retained = mulDivHalfUp(b.totals.venueTotal, 10_000 - tierBps, 10_000);
  const refundVenue = Math.max(0, venuePaid - retained);
  const venueKeeps = venuePaid - refundVenue;
  // FR-M18-05: fee refunded only within 24 h of confirmation and at least 14 days before the event.
  const confirmedAt = b.confirmed_at ? new Date(b.confirmed_at as Date) : null;
  const grace = !!confirmedAt && when.getTime() - confirmedAt.getTime() <= 24 * 3600_000 && daysBefore >= 14;
  const feeRefunded = grace ? feePaid : 0;
  const commission = commissionOn(venueKeeps, b.totals, b.pricing_snapshot);
  return { daysBefore, tierBps, venuePaid, retained, refundVenue, venueKeeps, feePaid, feeRefunded, commission, refundTotal: refundVenue + feeRefunded };
}

/** Partial simulated refund spread over paid payments, with credit notes (FR-M14-09). */
async function refundAmount(sql: Tx, bookingId: string, amount: number, reason: string): Promise<void> {
  let left = amount;
  const paid = await sql`select * from payments where booking_id = ${bookingId} and status = 'paid' order by paid_at desc`;
  for (const p of paid) {
    if (left <= 0) break;
    const available = num(p.amount) - num(p.refunded_amount);
    const part = Math.min(available, left);
    if (part <= 0) continue;
    await sql`update payments set refunded_amount = refunded_amount + ${part}, status = case when refunded_amount + ${part} >= amount then 'refunded' else status end where id = ${p.id as string}`;
    await post(bookingId, [{ debit: "refunds", credit: "held", amount: part, refType: "refund", refId: String(p.id), memo: reason }], sql);
    await creditNoteFor(sql, bookingId, String(p.id), part);
    left -= part;
  }
}

async function closeBooking(sql: Tx, b: Booking, status: "cancelled_by_organizer" | "cancelled_by_venue", actorId: string, reason: string, cancellation: object, at: Date, allowed: string[]) {
  // Guarded update: a double submit or a race finds the booking already closed and changes nothing.
  const [row] = await sql`
    update bookings set status = ${status}, cancelled_at = ${at}, cancelled_by = ${actorId}, cancel_reason = ${reason}, cancellation = ${sql.json(cancellation as never)}, updated_at = ${at}
    where id = ${b.id as string} and status in ${sql(allowed)} returning id`;
  if (!row) throw new AppError("cancel.notAllowed");
  await sql`update calendar_entries set released_at = ${at}, release_reason = 'cancelled' where booking_id = ${b.id as string} and released_at is null`;
  await sql`update payment_requests set status = 'cancelled' where booking_id = ${b.id as string} and status = 'open'`;
  await sql`update payments set status = 'expired' where booking_id = ${b.id as string} and status = 'pending'`;
}

async function afterCancel(b: Booking, actorId: string, reason: string) {
  const bookingId = String(b.id);
  await cancelJobs(`booking:${bookingId}:`);
  const { cancelPagesForBooking } = await import("./event-pages");
  await cancelPagesForBooking(bookingId, actorId);
  await notify({ userIds: await everyone(b), event: "booking_cancelled", values: { ref: String(b.reference), reason }, link: `/pemesanan/${bookingId}` });
  const rows = await db()`select lower(during) as s, upper(during) as e from calendar_entries where booking_id = ${bookingId}`;
  await onHoldsReleased(String(b.space_id), rows.map((r) => ({ start: r.s as Date, end: r.e as Date })));
}

/** Organizer cancellation (Owner) with the figures shown on screen; `expectedRefund` guards against a tier change in between. */
export async function cancelByOrganizer(actor: Actor, bookingId: string, input: { reason: string; expectedRefund: number; noShow?: boolean }): Promise<CancellationFigures> {
  const { booking, side } = await bookingFor(actor, bookingId);
  if (side !== "organizer") throw new PermissionError();
  await requirePermission(actor.userId, "organizer", "booking.cancel");
  return executeOrganizerCancellation(booking, actor.userId, input);
}

async function executeOrganizerCancellation(booking: Booking, actorId: string, input: { reason: string; expectedRefund: number; noShow?: boolean }) {
  const bookingId = String(booking.id);
  if (![...LIVE, ...(input.noShow ? ["in_progress"] : [])].includes(String(booking.status))) throw new AppError("cancel.notAllowed");
  if (!input.reason.trim()) throw new AppError("errors.reasonRequired");
  const at = await now();
  const f = await organizerCancellationFigures(bookingId, at);
  if (!input.noShow && f.refundTotal !== input.expectedRefund) throw new AppError("cancel.figuresChanged");
  const feeKept = f.feePaid - f.feeRefunded;
  await db().begin(async (sql) => {
    await closeBooking(sql, booking, "cancelled_by_organizer", actorId, input.reason.trim(), { ...f, by: "organizer", noShow: !!input.noShow }, at, [...LIVE, ...(input.noShow ? ["in_progress"] : [])]);
    if (input.noShow) await sql`update bookings set no_show = true where id = ${bookingId}`;
    if (f.refundTotal) await refundAmount(sql, bookingId, f.refundTotal, input.noShow ? "no_show" : "organizer_cancellation");
    await post(bookingId, [
      { debit: "venue_payable", credit: "held", amount: f.venueKeeps - f.commission, refType: "cancellation", memo: "venue keeps (simulated)" },
      { debit: "spotin_commission", credit: "held", amount: f.commission, refType: "cancellation", memo: "commission" },
      { debit: "spotin_fee", credit: "held", amount: feeKept, refType: "cancellation", memo: "organizer fee kept" },
    ], sql);
    await audit({ scope: "user", actorId, action: input.noShow ? "booking.no_show" : "booking.cancelled_by_organizer", entity: "booking", entityId: bookingId, after: f, at }, sql);
  });
  await afterCancel(booking, actorId, input.reason.trim());
  return f;
}

/** FR-M18-06: venue cancellation, Owner only, reason required, everything refunded including the fee; no penalty. */
export async function cancelByVenue(actor: Actor, bookingId: string, reason: string): Promise<void> {
  const { booking, side } = await bookingFor(actor, bookingId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "booking.cancel");
  if (![...LIVE, "pending_agreement_and_deposit"].includes(String(booking.status))) throw new AppError("cancel.notAllowed");
  if (!reason.trim()) throw new AppError("errors.reasonRequired");
  const at = await now();
  await db().begin(async (sql) => {
    const { venuePaid, feePaid } = await paidParts(bookingId, sql);
    await closeBooking(sql, booking, "cancelled_by_venue", actor.userId, reason.trim(), { by: "venue", venuePaid, feePaid, refundTotal: venuePaid + feePaid, venueKeeps: 0 }, at, [...LIVE, "pending_agreement_and_deposit"]);
    await sql`update agreements set status = 'voided' where booking_id = ${bookingId} and status <> 'accepted_by_both'`;
    await refundAllPaid(sql, bookingId, "venue_cancellation");
    await audit({ scope: "user", actorId: actor.userId, action: "booking.cancelled_by_venue", entity: "booking", entityId: bookingId, after: { reason }, at }, sql);
  });
  await afterCancel(booking, actor.userId, reason.trim());
}

/** FR-M18-08: the venue records an organizer no-show on an event day; treated as an organizer cancellation that day. */
export async function recordNoShow(actor: Actor, bookingId: string): Promise<void> {
  const { booking, side } = await bookingFor(actor, bookingId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "booking.cancel");
  const b = await bookingCtx(bookingId);
  const today = localDate(await now(), b.timezone);
  if (!b.days.some((d) => d.date === today)) throw new AppError("cancel.noShowEventDayOnly");
  await executeOrganizerCancellation(booking, actor.userId, { reason: t("cancel.noShowReason"), expectedRefund: 0, noShow: true });
}
