import { db, num, type Tx } from "@/lib/db";
import { now } from "@/lib/clock";
import { t } from "@/lib/i18n";
import { AppError, PermissionError } from "@/lib/permissions";
import { schedule, cancelJobs } from "@/lib/jobs";
import { formatDateTime } from "@/lib/time";
import { formatRupiah, mulDivHalfUp } from "@/lib/money";
import { paymentPlan, type PaymentSchedule, type QuoteTotals } from "@/lib/quote-math";
import { audit } from "@/lib/audit";
import { requirePermission, requireVerified, membershipOf, isUuid } from "./access";
import { adminIds, notify, orgMemberIds } from "./notify";
import { isOverlapError, type DayRange } from "./calendar";
import { acceptBlocker, enquiryRanges, expireBackupsForBooking, onHoldsReleased, quoteForOrganizer } from "./quotes";
import { post, reconcile } from "./ledger";
import { agreementPdf, receiptPdf, storeGenerated } from "./documents";
import { payments, simulatedCallback, verifyCallback, type CallbackPayload, type Method } from "@/adapters/payments";
import type { Actor } from "./accounts";

/**
 * Booking from acceptance to confirmation (M12 acceptance, M13 pilot agreement, M14 sandbox
 * payments, M15 receipts, M16 ledger). Booking statuses follow PRD §9.2.
 */
const ACTIVE = ["pending_agreement_and_deposit", "confirmed", "balance_due", "fully_paid", "in_progress", "post_event_window", "on_hold"];

async function nextReference(sql: Tx): Promise<string> {
  const [r] = await sql`
    insert into receipt_counters (issuer_key, last_number) values ('booking', 1)
    on conflict (issuer_key) do update set last_number = receipt_counters.last_number + 1 returning last_number`;
  return `BK-${String(r!.last_number).padStart(4, "0")}`;
}

/**
 * FR-M12-10, -11, FR-M6-05, -07: accepting re-validates availability atomically. The booking
 * hold insert is guarded by the exclusion constraint, so of two simultaneous acceptances
 * exactly one commits; the other gets "dates just taken".
 */
export async function acceptQuote(actor: Actor, quoteId: string, input: { acceptPilotTerms: boolean }): Promise<string> {
  await requireVerified(actor.userId);
  const { quote, ctx } = await quoteForOrganizer(actor, quoteId, "quote.accept");
  if (!input.acceptPilotTerms) throw new AppError("bookings.pilotTermsRequired");
  const blocker = await acceptBlocker(quote);
  // A regular (non-backup) quote whose dates were free when it was sent was just taken by someone else.
  if (blocker && ["quotes.datesHeld", "quotes.datesBookedOrganizer"].includes(blocker) && !quote.is_backup) throw new AppError("quotes.datesJustTaken");
  if (blocker) throw new AppError(blocker);
  const at = await now();
  const tz = String(ctx.timezone);
  const days = ctx.days as { date: string; start: string; end: string }[];
  const ranges = enquiryRanges(ctx);
  const plan = paymentPlan({ totals: quote.totals as QuoteTotals, schedule: quote.payment_schedule as unknown as PaymentSchedule, acceptedAt: at, firstEventDate: days[0]!.date, tz });
  const first = plan[0]!;
  const balance = plan.find((p) => p.kind === "balance");
  const eventStart = ranges.reduce((m, r) => (r.start < m ? r.start : m), ranges[0]!.start);
  const eventEnd = ranges.reduce((m, r) => (r.end > m ? r.end : m), ranges[0]!.end);
  let bookingId: string;
  try {
    bookingId = await db().begin(async (sql) => {
      const [locked] = await sql`select status from quotes where id = ${quoteId} for update`;
      if (locked?.status !== "sent") throw new AppError("quotes.notOpen");
      // This enquiry's own tentative hold becomes the booking hold.
      await sql`update calendar_entries set released_at = ${at}, release_reason = 'converted_to_booking_hold'
                where enquiry_id = ${quote.enquiry_id as string} and kind = 'tentative_hold' and released_at is null`;
      const reference = await nextReference(sql);
      const [b] = await sql`
        insert into bookings (reference, quote_id, enquiry_id, event_id, space_id, organizer_org_id, operator_id, days, deposit_due_at,
          balance_due_at, balance_request_at, pilot_terms_accepted_at, accepted_by, event_start_at, event_end_at, created_at, updated_at)
        values (${reference}, ${quoteId}, ${quote.enquiry_id as string}, ${ctx.event_id as string}, ${ctx.space_id as string}, ${ctx.organizer_org_id as string},
          ${ctx.operator_id as string}, ${sql.json(days as never)}, ${first.dueAt}, ${balance?.dueAt ?? null}, ${balance?.issueAt ?? null}, ${at},
          ${actor.userId}, ${eventStart}, ${eventEnd}, ${at}, ${at})
        returning id`;
      const id = String(b!.id);
      for (const r of ranges) {
        await sql`
          insert into calendar_entries (space_id, during, kind, enquiry_id, booking_id, expires_at, created_by, created_at)
          values (${ctx.space_id as string}, tstzrange(${r.start}, ${r.end}), 'booking_hold', ${quote.enquiry_id as string}, ${id}, ${first.dueAt}, ${actor.userId}, ${at})`;
      }
      await sql`update quotes set status = 'accepted', decided_at = ${at}, updated_at = ${at} where id = ${quoteId}`;
      await sql`update enquiries set status = 'accepted', closed_at = ${at}, updated_at = ${at} where id = ${quote.enquiry_id as string}`;
      await sql`update threads set booking_id = ${id} where enquiry_id = ${quote.enquiry_id as string}`;
      for (const p of plan) {
        if (p.kind === "balance") continue;
        await sql`
          insert into payment_requests (booking_id, kind, amount, venue_part, fee_part, due_at, issued_at, created_at)
          values (${id}, ${p.kind}, ${p.amount}, ${p.venuePart}, ${p.feePart}, ${p.dueAt}, ${at}, ${at})`;
      }
      await sql`insert into agreements (booking_id, status, created_at) values (${id}, 'generating', ${at})`;
      await audit({ scope: "user", actorId: actor.userId, action: "quote.accepted", entity: "booking", entityId: id, after: { quoteId, reference }, at }, sql);
      return id;
    });
  } catch (e) {
    if (isOverlapError(e)) {
      await notify({ userIds: await orgMemberIds(String(ctx.operator_id), ["owner", "staff"]), event: "quote_accept_conflict", values: { event: String(ctx.event_name) }, link: `/venue/enquiry/${quote.enquiry_id}` });
      throw new AppError("quotes.datesJustTaken");
    }
    throw e;
  }
  await cancelJobs(`quote:${quoteId}:`);
  await cancelJobs(`hold:${quote.enquiry_id}:`);
  await schedule("booking.deposit_deadline", first.dueAt, { bookingId }, { uniqueKey: `booking:${bookingId}:deposit_deadline` });
  await schedulePaymentReminders(bookingId, first.kind, first.dueAt);
  if (balance) await schedule("booking.balance_issue", balance.issueAt, { bookingId }, { uniqueKey: `booking:${bookingId}:balance_issue` });
  await notify({ userIds: await orgMemberIds(String(ctx.operator_id), ["owner", "staff"]), event: "quote_accepted", values: { event: String(ctx.event_name), space: String(ctx.space_name) }, link: `/pemesanan/${bookingId}` });
  await generateAgreement(bookingId);
  return bookingId;
}

async function schedulePaymentReminders(bookingId: string, kind: string, dueAt: Date) {
  for (const [label, ms] of [["d3", 3 * 86_400_000], ["d1", 86_400_000], ["d0", 0]] as const) {
    const run = new Date(dueAt.getTime() - ms - (label === "d0" ? 12 * 3600_000 : 0));
    await schedule("booking.payment_reminder", run, { bookingId, kind }, { uniqueKey: `booking:${bookingId}:remind:${kind}:${label}` });
  }
}

// ---------------------------------------------------------------------------
// Pilot agreement (M13)
// ---------------------------------------------------------------------------
export async function generateAgreement(bookingId: string): Promise<void> {
  const at = await now();
  try {
    const { bytes, sha256 } = await agreementPdf(bookingId);
    const [b] = await db()`select reference from bookings where id = ${bookingId}`;
    const fileId = await storeGenerated(bytes, `perjanjian-${String(b!.reference)}.pdf`);
    const [a] = await db()`
      update agreements set file_id = ${fileId}, sha256 = ${sha256}, generated_at = ${at},
        status = case when status = 'generating' then 'generated' else status end, attempts = attempts + 1, last_error = null
      where booking_id = ${bookingId} returning status`;
    if (a?.status === "generated" && (await db()`select 1 from agreements where booking_id = ${bookingId} and acceptances = '[]'`).length) {
      const [bk] = await db()`select organizer_org_id, operator_id, reference from bookings where id = ${bookingId}`;
      await notify({ userIds: [...(await orgMemberIds(String(bk!.organizer_org_id))), ...(await orgMemberIds(String(bk!.operator_id), ["owner", "staff"]))], event: "agreement_ready", values: { ref: String(bk!.reference) }, link: `/pemesanan/${bookingId}` });
    }
  } catch (e) {
    const [a] = await db()`update agreements set attempts = attempts + 1, last_error = ${String(e)} where booking_id = ${bookingId} returning attempts`;
    if (Number(a?.attempts) >= 3) await notify({ userIds: await adminIds(), event: "admin_alert_agreement_failed", values: { booking: bookingId }, emailOnly: true });
    else await schedule("agreement.generate", new Date(at.getTime() + 60_000), { bookingId }, { uniqueKey: `agreement:${bookingId}:retry` });
  }
}

export async function bookingFor(actor: Actor, bookingId: string, sql: Tx = db()) {
  if (!isUuid(bookingId)) throw new PermissionError();
  const [b] = await sql`select * from bookings where id = ${bookingId}`;
  if (!b) throw new PermissionError();
  const venue = await membershipOf(actor.userId, "venue_operator", sql);
  const organizer = await membershipOf(actor.userId, "organizer", sql);
  const side = venue?.orgId === b.operator_id ? "venue" : organizer?.orgId === b.organizer_org_id ? "organizer" : null;
  if (!side) throw new PermissionError();
  return { booking: b, side: side as "venue" | "organizer", membership: side === "venue" ? venue! : organizer! };
}

/** FR-M13-09: organizer accepts first, then the venue (Owner or Staff); tick + typed full name. */
export async function acceptAgreement(actor: Actor, bookingId: string, input: { checked: boolean; typedName: string }): Promise<void> {
  const { booking, side, membership } = await bookingFor(actor, bookingId);
  await requirePermission(actor.userId, side === "venue" ? "venue_operator" : "organizer", side === "venue" ? "quote.send" : "quote.accept");
  if (booking.status !== "pending_agreement_and_deposit") throw new AppError("bookings.notPending");
  if (!input.checked) throw new AppError("agreement.tickRequired");
  const [u] = await db()`select name from users where id = ${actor.userId}`;
  const typed = input.typedName.trim().replace(/\s+/g, " ");
  if (!typed || typed.toLowerCase() !== String(u!.name).trim().replace(/\s+/g, " ").toLowerCase()) throw new AppError("agreement.nameMismatch", { name: String(u!.name) });
  const at = await now();
  // The row lock only holds inside a transaction: two simultaneous acceptances can't both pass the status check.
  await db().begin(async (sql) => {
    const [a] = await sql`select status, acceptances from agreements where booking_id = ${bookingId} for update`;
    if (!a || a.status === "generating") throw new AppError("agreement.generating");
    const expected = side === "organizer" ? "generated" : "accepted_by_organizer";
    if (a.status !== expected) throw new AppError(side === "venue" ? "agreement.organizerFirst" : "agreement.alreadyAccepted");
    const acceptances = [...((a.acceptances ?? []) as unknown[]), { side, userId: actor.userId, typedName: typed, at: at.toISOString(), ip: actor.ip ?? null }];
    await sql`
      update agreements set acceptances = ${sql.json(acceptances as never)}, status = ${side === "organizer" ? "accepted_by_organizer" : "accepted_by_both"}
      where booking_id = ${bookingId}`;
  });
  await audit({ scope: "user", actorId: actor.userId, action: `agreement.accepted_by_${side}`, entity: "booking", entityId: bookingId, after: { typedName: typed }, ip: actor.ip, at });
  await generateAgreement(bookingId); // the last page now lists the acceptance (FR-M13-07)
  const otherOrg = side === "organizer" ? String(booking.operator_id) : String(booking.organizer_org_id);
  await notify({ userIds: await orgMemberIds(otherOrg, side === "organizer" ? ["owner", "staff"] : undefined), event: side === "organizer" ? "agreement_venue_turn" : "agreement_accepted", values: { ref: String(booking.reference), by: membership.displayName }, link: `/pemesanan/${bookingId}` });
  await maybeConfirm(bookingId);
}

// ---------------------------------------------------------------------------
// Sandbox payments (M14)
// ---------------------------------------------------------------------------
export async function startPayment(actor: Actor, requestId: string, method: Method): Promise<string> {
  await requireVerified(actor.userId);
  if (!isUuid(requestId)) throw new PermissionError();
  const [r] = await db()`select * from payment_requests where id = ${requestId}`;
  if (!r) throw new PermissionError();
  const { booking, side } = await bookingFor(actor, String(r.booking_id));
  if (side !== "organizer") throw new PermissionError();
  await requirePermission(actor.userId, "organizer", "quote.accept");
  if (r.status !== "open") throw new AppError("payments.notOpen");
  if (["lapsed", "cancelled_by_organizer", "cancelled_by_venue"].includes(String(booking.status))) throw new AppError("bookings.closed");
  if (!["test_va", "test_qris", "test_ewallet", "test_card"].includes(method)) throw new AppError("errors.invalidValue");
  const at = await now();
  const [pending] = await db()`select id from payments where request_id = ${requestId} and status = 'pending' and expires_at > ${at} and method = ${method}`;
  if (pending) return String(pending.id);
  // Only one open charge per request: switching method expires the previous instructions.
  await db()`update payments set status = 'expired' where request_id = ${requestId} and status = 'pending'`;
  const expiresAt = new Date(Math.min(at.getTime() + 24 * 3600_000, new Date(r.due_at as Date).getTime()));
  const charge = await payments().createCharge({ reference: `${String(booking.reference)}-${String(r.kind)}`, amount: num(r.amount), method, expiresAt, description: String(r.kind) });
  const [p] = await db()`
    insert into payments (request_id, booking_id, provider, provider_ref, method, amount, status, instructions, expires_at, created_by, created_at)
    values (${requestId}, ${r.booking_id as string}, ${charge.provider}, ${charge.providerRef}, ${method}, ${num(r.amount)}, 'pending',
            ${db().json(charge.instructions)}, ${expiresAt}, ${actor.userId}, ${at}) returning id`;
  return String(p!.id);
}

/** Test-mode only: the tester completes, fails or expires a sandbox payment; the simulator sends a signed callback. */
export async function simulatePayment(actor: Actor, paymentId: string, outcome: "paid" | "failed" | "expired"): Promise<void> {
  if (!isUuid(paymentId)) throw new PermissionError();
  const [p] = await db()`select * from payments where id = ${paymentId}`;
  if (!p) throw new PermissionError();
  await bookingFor(actor, String(p.booking_id));
  const at = await now();
  const { payload, signature } = simulatedCallback(String(p.provider_ref), num(p.amount), outcome, at, outcome === "failed" ? "card_declined" : undefined);
  await handleCallback(payload, signature);
}

/** Webhook handler: signature verified, stored raw, processed once per event id (§10, §12.4). */
export async function handleCallback(payload: CallbackPayload, signature: string): Promise<"processed" | "duplicate" | "rejected"> {
  const ok = verifyCallback(payload, signature);
  const at = await now();
  const ins = await db()`
    insert into payment_webhooks (provider, event_id, payload, signature_ok, received_at)
    values ('simulator', ${payload.eventId}, ${db().json(payload as never)}, ${ok}, ${at})
    on conflict (provider, event_id) do nothing returning id`;
  if (!ok) return "rejected";
  if (!ins.length) {
    // Processed once already → duplicate. Stored but not processed (we failed mid-way) → process it now.
    const [prev] = await db()`select processed_at, signature_ok from payment_webhooks where provider = 'simulator' and event_id = ${payload.eventId}`;
    if (prev?.processed_at || !prev?.signature_ok) return "duplicate";
  }
  const [p] = await db()`select * from payments where provider_ref = ${payload.providerRef}`;
  if (!p) return "rejected";
  if (payload.status === "paid") await paymentSucceeded(String(p.id));
  else {
    await db()`update payments set status = ${payload.status}, failure_reason = ${payload.failureReason ?? null} where id = ${p.id as string} and status = 'pending'`;
    if (payload.status === "failed") {
      const [b] = await db()`select organizer_org_id, reference from bookings where id = ${p.booking_id as string}`;
      await notify({ userIds: await orgMemberIds(String(b!.organizer_org_id)), event: "payment_failed", values: { ref: String(b!.reference) }, link: `/pemesanan/${p.booking_id}` });
    }
  }
  await db()`update payment_webhooks set processed_at = ${at} where provider = 'simulator' and event_id = ${payload.eventId}`;
  return "processed";
}

async function paymentSucceeded(paymentId: string): Promise<void> {
  const at = await now();
  const result = await db().begin(async (sql) => {
    const [p] = await sql`update payments set status = 'paid', paid_at = ${at} where id = ${paymentId} and status in ('pending', 'expired') returning *`;
    if (!p) return null;
    if (num(p.amount) !== num((await sql`select amount from payment_requests where id = ${p.request_id as string}`)[0]!.amount)) throw new Error("payment amount does not match its request");
    const [r] = await sql`update payment_requests set status = 'paid', paid_at = ${at} where id = ${p.request_id as string} and status <> 'paid' returning *`;
    const [b] = await sql`select * from bookings where id = ${p.booking_id as string}`;
    if (!r) {
      // The request was already paid by another charge: record this one and refund it at once.
      const [req] = await sql`select * from payment_requests where id = ${p.request_id as string}`;
      await post(String(b!.id), [{ debit: "held", credit: "organizer_paid", amount: num(p.amount), refType: "payment", refId: paymentId, memo: "duplicate" }], sql);
      await issueReceipt(sql, b!, req!, p);
      await sql`update payments set status = 'refunded', refunded_amount = amount where id = ${paymentId}`;
      await post(String(b!.id), [{ debit: "refunds", credit: "held", amount: num(p.amount), refType: "refund", refId: paymentId, memo: "duplicate_payment" }], sql);
      await creditNoteFor(sql, String(b!.id), paymentId, num(p.amount));
      return null;
    }
    await post(String(b!.id), [{ debit: "held", credit: "organizer_paid", amount: num(p.amount), refType: "payment", refId: paymentId, memo: String(r!.kind) }], sql);
    const receiptId = await issueReceipt(sql, b!, r!, p);
    return { booking: b!, request: r!, receiptId };
  });
  if (!result) return;
  const { booking, request, receiptId } = result;
  try {
    const bytes = await receiptPdf(receiptId);
    const fileId = await storeGenerated(bytes, `kuitansi-${receiptId.slice(0, 8)}.pdf`);
    await db()`update receipts set file_id = ${fileId} where id = ${receiptId}`;
  } catch (e) {
    console.error("[receipt pdf]", e);
  }
  await cancelJobs(`booking:${booking.id}:remind:${request.kind}:`);
  await notify({ userIds: [...(await orgMemberIds(String(booking.organizer_org_id))), ...(await orgMemberIds(String(booking.operator_id), ["owner", "staff"]))], event: "payment_received", values: { ref: String(booking.reference), amount: formatRupiah(num(request.amount)) }, link: `/pemesanan/${booking.id}` });
  if (booking.status === "lapsed") return lateDeposit(String(booking.id), paymentId);
  if (request.kind === "balance") {
    await db()`update bookings set status = 'fully_paid', updated_at = ${at} where id = ${booking.id as string} and status in ('confirmed', 'balance_due')`;
    await cancelJobs(`booking:${booking.id}:balance_missed`);
  }
  await maybeConfirm(String(booking.id));
}

/** FR-M15-01, -02: sequential PILOT- receipt per issuer; venue lines with PPN plus a separate Spot-In fee line. */
async function issueReceipt(sql: Tx, booking: Record<string, unknown>, request: Record<string, unknown>, payment: Record<string, unknown>): Promise<string> {
  const [q] = await sql`select totals from quotes where id = ${booking.quote_id as string}`;
  const totals = q!.totals as QuoteTotals;
  const venuePart = num(request.venue_part);
  const ppnPart = totals.venueTotal ? mulDivHalfUp(venuePart, totals.ppn, totals.venueTotal) : 0;
  const lines = [
    { label: t(`receipts.venueLine.${String(request.kind)}`), amount: venuePart - ppnPart },
    ...(ppnPart ? [{ label: t("receipts.ppn"), amount: ppnPart }] : []),
    ...(num(request.fee_part) ? [{ label: t("receipts.fee"), amount: num(request.fee_part) }] : []),
  ];
  const issuer = String(booking.operator_id);
  const [c] = await sql`
    insert into receipt_counters (issuer_key, last_number) values (${`receipt:${issuer}`}, 1)
    on conflict (issuer_key) do update set last_number = receipt_counters.last_number + 1 returning last_number`;
  const number = `PILOT-${issuer.slice(0, 4).toUpperCase()}-${String(c!.last_number).padStart(5, "0")}`;
  const [r] = await sql`
    insert into receipts (number, kind, issuer_org_id, booking_id, payment_id, lines, amount, created_at)
    values (${number}, 'receipt', ${issuer}, ${booking.id as string}, ${payment.id as string}, ${sql.json(lines)}, ${num(payment.amount)}, ${await now()})
    returning id`;
  return String(r!.id);
}

/** Confirmed = agreement accepted by both AND deposit (or full payment) paid (PRD §11.2). */
export async function maybeConfirm(bookingId: string): Promise<boolean> {
  const at = await now();
  const done = await db().begin(async (sql) => {
    const [b] = await sql`select * from bookings where id = ${bookingId} for update`;
    if (b?.status !== "pending_agreement_and_deposit") return null;
    const [a] = await sql`select status from agreements where booking_id = ${bookingId}`;
    const [paid] = await sql`select 1 from payment_requests where booking_id = ${bookingId} and kind in ('deposit', 'full') and status = 'paid'`;
    if (a?.status !== "accepted_by_both" || !paid) return null;
    const hasOpenBalance = (await sql`select 1 from payment_requests where booking_id = ${bookingId} and kind = 'balance'`).length > 0;
    await sql`update bookings set status = ${hasOpenBalance ? "balance_due" : "confirmed"}, confirmed_at = ${at}, updated_at = ${at} where id = ${bookingId}`;
    const full = (await sql`select 1 from payment_requests where booking_id = ${bookingId} and kind = 'full' and status = 'paid'`).length > 0;
    if (full) await sql`update bookings set status = 'fully_paid' where id = ${bookingId}`;
    await sql`update calendar_entries set kind = 'booked', expires_at = null where booking_id = ${bookingId} and kind = 'booking_hold' and released_at is null`;
    await audit({ scope: "system", actorId: null, action: "booking.confirmed", entity: "booking", entityId: bookingId, at }, sql);
    return b;
  });
  if (!done) return false;
  await cancelJobs(`booking:${bookingId}:deposit_deadline`);
  const ranges = await bookingRanges(bookingId);
  await expireBackupsForBooking(String(done.space_id), ranges, String(done.enquiry_id));
  await notifyCompetitors(String(done.space_id), ranges, String(done.enquiry_id));
  await notify({ userIds: [...(await orgMemberIds(String(done.organizer_org_id))), ...(await orgMemberIds(String(done.operator_id)))], event: "booking_confirmed", values: { ref: String(done.reference) }, link: `/pemesanan/${bookingId}` });
  const { onBookingConfirmed } = await import("./lifecycle");
  await onBookingConfirmed(bookingId);
  return true;
}

async function bookingRanges(bookingId: string): Promise<DayRange[]> {
  const rows = await db()`select lower(during) as s, upper(during) as e from calendar_entries where booking_id = ${bookingId}`;
  return rows.map((r) => ({ start: r.s as Date, end: r.e as Date }));
}

/** Competing open enquiries for overlapping dates are told the dates are booked (§6.5.4). */
async function notifyCompetitors(spaceId: string, ranges: DayRange[], exceptEnquiryId: string) {
  const rows = await db()`
    select q.id, e.organizer_org_id, e.days, p.timezone, coalesce(r.unit, 'day') as unit, s.name as space_name
    from enquiries q join events e on e.id = q.event_id join spaces s on s.id = q.space_id join properties p on p.id = s.property_id
    left join rate_cards r on r.space_id = s.id
    where q.space_id = ${spaceId} and q.id <> ${exceptEnquiryId} and q.status in ('submitted', 'viewed', 'info_requested', 'responded', 'quoted')`;
  for (const q of rows) {
    if (!enquiryRanges(q).some((r) => ranges.some((x) => r.start < x.end && x.start < r.end))) continue;
    await notify({ userIds: await orgMemberIds(String(q.organizer_org_id)), event: "enquiry_dates_booked", values: { space: String(q.space_name) }, link: `/enquiry/${q.id}` });
  }
}

// ---------------------------------------------------------------------------
// Lapse, late deposit, balance (FR-M14-05, -06, FR-M15-09, §6.5.5, §12.4)
// ---------------------------------------------------------------------------
export async function depositDeadlineJob(bookingId: string, at: Date): Promise<void> {
  const [b] = await db()`select status, deposit_due_at from bookings where id = ${bookingId}`;
  if (b?.status !== "pending_agreement_and_deposit" || new Date(b.deposit_due_at as Date) > at) return;
  await lapse(bookingId, "deposit_or_agreement_missed");
}

export async function lapse(bookingId: string, reason: string): Promise<void> {
  const at = await now();
  const b = await db().begin(async (sql) => {
    const [bk] = await sql`update bookings set status = 'lapsed', lapsed_at = ${at}, updated_at = ${at} where id = ${bookingId} and status = 'pending_agreement_and_deposit' returning *`;
    if (!bk) return null;
    await sql`update calendar_entries set released_at = ${at}, release_reason = 'lapsed' where booking_id = ${bookingId} and released_at is null`;
    await sql`update agreements set status = 'voided' where booking_id = ${bookingId}`;
    await sql`update payment_requests set status = 'cancelled' where booking_id = ${bookingId} and status = 'open'`;
    await sql`update payments set status = 'expired' where booking_id = ${bookingId} and status = 'pending'`;
    await refundAllPaid(sql, bookingId, "lapse");
    await audit({ scope: "system", actorId: null, action: "booking.lapsed", entity: "booking", entityId: bookingId, after: { reason }, at }, sql);
    return bk;
  });
  if (!b) return;
  await cancelJobs(`booking:${bookingId}:`);
  await notify({ userIds: [...(await orgMemberIds(String(b.organizer_org_id))), ...(await orgMemberIds(String(b.operator_id), ["owner", "staff"]))], event: "booking_lapsed", values: { ref: String(b.reference) }, link: `/pemesanan/${bookingId}` });
  const rows = await db()`select lower(during) as s, upper(during) as e from calendar_entries where booking_id = ${bookingId}`;
  await onHoldsReleased(String(b.space_id), rows.map((r) => ({ start: r.s as Date, end: r.e as Date })));
}

/** Records a full simulated refund of every paid payment, with credit notes (FR-M14-09, FR-M15-02). */
export async function refundAllPaid(sql: Tx, bookingId: string, reason: string): Promise<number> {
  const paid = await sql`select * from payments where booking_id = ${bookingId} and status = 'paid'`;
  let total = 0;
  for (const p of paid) {
    const amount = num(p.amount) - num(p.refunded_amount);
    if (amount <= 0) continue;
    await sql`update payments set status = 'refunded', refunded_amount = amount where id = ${p.id as string}`;
    await post(bookingId, [{ debit: "refunds", credit: "held", amount, refType: "refund", refId: String(p.id), memo: reason }], sql);
    await creditNoteFor(sql, bookingId, String(p.id), amount);
    total += amount;
  }
  return total;
}

/** Credit note for a (partial) simulated refund of one payment, referring to its receipt (FR-M15-02). */
export async function creditNoteFor(sql: Tx, bookingId: string, paymentId: string, amount: number): Promise<void> {
  const [orig] = await sql`select * from receipts where payment_id = ${paymentId} and kind = 'receipt'`;
  if (!orig) return;
  const [c] = await sql`
    insert into receipt_counters (issuer_key, last_number) values (${`receipt:${orig.issuer_org_id}`}, 1)
    on conflict (issuer_key) do update set last_number = receipt_counters.last_number + 1 returning last_number`;
  await sql`
    insert into receipts (number, kind, issuer_org_id, booking_id, payment_id, refers_to, lines, amount, created_at)
    values (${`PILOT-${String(orig.issuer_org_id).slice(0, 4).toUpperCase()}-${String(c!.last_number).padStart(5, "0")}`}, 'credit_note', ${orig.issuer_org_id as string},
      ${bookingId}, ${paymentId}, ${orig.id as string}, ${sql.json([{ label: t("receipts.refundLine", { number: String(orig.number) }), amount }])}, ${amount}, ${await now()})`;
}

/** §12.1: a deposit arriving after the deadline confirms the booking if the dates are still free; otherwise it is refunded. */
async function lateDeposit(bookingId: string, paymentId: string): Promise<void> {
  const at = await now();
  const [b] = await db()`select * from bookings where id = ${bookingId}`;
  const rows = await db()`select lower(during) as s, upper(during) as e from calendar_entries where booking_id = ${bookingId}`;
  try {
    await db().begin(async (sql) => {
      for (const r of rows) {
        await sql`insert into calendar_entries (space_id, during, kind, enquiry_id, booking_id, created_at) values (${b!.space_id as string}, tstzrange(${r.s as Date}, ${r.e as Date}), 'booked', ${b!.enquiry_id as string}, ${bookingId}, ${at})`;
      }
      await sql`update bookings set status = 'balance_due', lapsed_at = null, confirmed_at = ${at} where id = ${bookingId}`;
    });
    const { onBookingConfirmed } = await import("./lifecycle");
    await onBookingConfirmed(bookingId);
    await notify({ userIds: [...(await orgMemberIds(String(b!.organizer_org_id))), ...(await orgMemberIds(String(b!.operator_id)))], event: "booking_confirmed", values: { ref: String(b!.reference) }, link: `/pemesanan/${bookingId}` });
  } catch (e) {
    if (!isOverlapError(e)) throw e;
    await db().begin(async (sql) => refundAllPaid(sql, bookingId, `late_deposit_dates_taken:${paymentId}`));
    await notify({ userIds: [...(await orgMemberIds(String(b!.organizer_org_id))), ...(await orgMemberIds(String(b!.operator_id), ["owner", "staff"]))], event: "payment_late_refunded", values: { ref: String(b!.reference) }, link: `/pemesanan/${bookingId}` });
  }
}

/** Job: issue the balance request (FR-M15-09). */
export async function balanceIssueJob(bookingId: string, at: Date): Promise<void> {
  const [b] = await db()`select * from bookings where id = ${bookingId}`;
  if (!b || !b.balance_due_at || !ACTIVE.includes(String(b.status)) || b.status === "pending_agreement_and_deposit") {
    if (b?.status === "pending_agreement_and_deposit") await schedule("booking.balance_issue", new Date(at.getTime() + 3600_000), { bookingId }, { uniqueKey: `booking:${bookingId}:balance_issue` });
    return;
  }
  const [q] = await db()`select totals, payment_schedule from quotes where id = ${b.quote_id as string}`;
  const totals = q!.totals as QuoteTotals;
  const [dep] = await db()`select venue_part from payment_requests where booking_id = ${bookingId} and kind = 'deposit'`;
  const amount = totals.venueTotal - num(dep?.venue_part);
  const ins = await db()`
    insert into payment_requests (booking_id, kind, amount, venue_part, fee_part, due_at, issued_at, created_at)
    values (${bookingId}, 'balance', ${amount}, ${amount}, 0, ${b.balance_due_at as Date}, ${(b.balance_request_at as Date | null) ?? at}, ${at})
    on conflict (booking_id, kind) do nothing returning id`;
  if (!ins.length) return;
  await db()`update bookings set status = 'balance_due' where id = ${bookingId} and status = 'confirmed'`;
  await schedulePaymentReminders(bookingId, "balance", new Date(b.balance_due_at as Date));
  await schedule("booking.balance_missed", new Date(b.balance_due_at as Date), { bookingId }, { uniqueKey: `booking:${bookingId}:balance_missed` });
  await notify({ userIds: await orgMemberIds(String(b.organizer_org_id)), event: "payment_due", values: { ref: String(b.reference), amount: formatRupiah(amount), due: formatDateTime(b.balance_due_at as Date, "Asia/Jakarta") }, link: `/pemesanan/${bookingId}` });
}

export async function paymentReminderJob(bookingId: string, kind: string): Promise<void> {
  const [r] = await db()`
    select r.amount, r.due_at, b.reference, b.organizer_org_id from payment_requests r join bookings b on b.id = r.booking_id
    where r.booking_id = ${bookingId} and r.kind = ${kind} and r.status = 'open'`;
  if (!r) return;
  await notify({ userIds: await orgMemberIds(String(r.organizer_org_id)), event: "payment_due", values: { ref: String(r.reference), amount: formatRupiah(num(r.amount)), due: formatDateTime(r.due_at as Date, "Asia/Jakarta") }, link: `/pemesanan/${bookingId}` });
}

/** FR-M14-06: a missed balance lets the venue Owner extend once (up to 3 days) or cancel under the organizer policy. */
export async function balanceMissedJob(bookingId: string, at: Date): Promise<void> {
  const [r] = await db()`select r.id, r.due_at, b.operator_id, b.organizer_org_id, b.reference from payment_requests r join bookings b on b.id = r.booking_id where r.booking_id = ${bookingId} and r.kind = 'balance' and r.status = 'open'`;
  if (!r || new Date(r.due_at as Date) > at) return;
  await notify({ userIds: await orgMemberIds(String(r.operator_id), ["owner"]), event: "balance_missed_venue", values: { ref: String(r.reference) }, link: `/pemesanan/${bookingId}` });
  await notify({ userIds: await orgMemberIds(String(r.organizer_org_id)), event: "balance_missed_organizer", values: { ref: String(r.reference) }, link: `/pemesanan/${bookingId}` });
}

export async function extendBalance(actor: Actor, bookingId: string, days: number): Promise<void> {
  const { booking, side } = await bookingFor(actor, bookingId);
  if (side !== "venue") throw new PermissionError();
  await requirePermission(actor.userId, "venue_operator", "booking.cancel"); // Owner only
  if (booking.balance_extended) throw new AppError("bookings.alreadyExtended");
  if (!Number.isInteger(days) || days < 1 || days > 3) throw new AppError("bookings.extendDaysInvalid");
  const [r] = await db()`select id, due_at from payment_requests where booking_id = ${bookingId} and kind = 'balance' and status = 'open'`;
  if (!r) throw new AppError("payments.notOpen");
  const due = new Date(new Date(r.due_at as Date).getTime() + days * 86_400_000);
  await db()`update payment_requests set due_at = ${due} where id = ${r.id as string}`;
  await db()`update bookings set balance_due_at = ${due}, balance_extended = true where id = ${bookingId}`;
  await schedulePaymentReminders(bookingId, "balance", due);
  await schedule("booking.balance_missed", due, { bookingId }, { uniqueKey: `booking:${bookingId}:balance_missed` });
  await notify({ userIds: await orgMemberIds(String(booking.organizer_org_id)), event: "balance_extended", values: { ref: String(booking.reference), due: formatDateTime(due, "Asia/Jakarta") }, link: `/pemesanan/${bookingId}` });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------
export async function bookingWorkspace(actor: Actor, bookingId: string) {
  const { booking, side, membership } = await bookingFor(actor, bookingId);
  const [ctx] = await db()`
    select e.name as event_name, e.days, s.name as space_name, p.name as property_name, p.address_text, p.timezone,
           ov.display_name as venue_name, ov.contact_phone as venue_phone, ov.contact_email as venue_email,
           oo.display_name as organizer_name, oo.contact_email as organizer_email
    from bookings b join events e on e.id = b.event_id join spaces s on s.id = b.space_id join properties p on p.id = s.property_id
    join organizations ov on ov.id = b.operator_id join organizations oo on oo.id = b.organizer_org_id where b.id = ${bookingId}`;
  const [quote] = await db()`select * from quotes where id = ${booking.quote_id as string}`;
  const [agreement] = await db()`select * from agreements where booking_id = ${bookingId}`;
  const requests = await db()`select * from payment_requests where booking_id = ${bookingId} order by due_at`;
  const pays = await db()`select * from payments where booking_id = ${bookingId} order by created_at desc`;
  const receipts = await db()`select id, number, kind, amount, file_id, created_at from receipts where booking_id = ${bookingId} order by created_at`;
  const confirmed = !["pending_agreement_and_deposit", "lapsed"].includes(String(booking.status));
  // FR-M1-05: contact phones become visible to the other party only after confirmation.
  const contacts = confirmed
    ? {
        venue: await db()`select u.name, u.phone, u.email from memberships m join users u on u.id = m.user_id where m.org_id = ${booking.operator_id as string} and m.role in ('owner', 'staff')`,
        organizer: await db()`select u.name, u.phone, u.email from memberships m join users u on u.id = m.user_id where m.org_id = ${booking.organizer_org_id as string}`,
      }
    : null;
  const timeline = await db()`select action, at from audit_log where entity = 'booking' and entity_id = ${bookingId} order by id`;
  return { booking, side, membership, ctx: ctx!, quote: quote!, agreement: agreement ?? null, requests, payments: pays, receipts, contacts, timeline, ledger: side === "venue" || side === "organizer" ? await reconcile(bookingId) : null };
}

export async function listBookings(actor: Actor) {
  const venue = await membershipOf(actor.userId, "venue_operator");
  const organizer = await membershipOf(actor.userId, "organizer");
  const ids = [venue?.orgId, organizer?.orgId].filter(Boolean) as string[];
  if (!ids.length) return [];
  return db()`
    select b.id, b.reference, b.status, b.days, b.deposit_due_at, e.name as event_name, s.name as space_name, b.operator_id, b.organizer_org_id
    from bookings b join events e on e.id = b.event_id join spaces s on s.id = b.space_id
    where b.operator_id in ${db()(ids)} or b.organizer_org_id in ${db()(ids)} order by b.created_at desc`;
}

export async function paymentForActor(actor: Actor, paymentId: string) {
  if (!isUuid(paymentId)) throw new PermissionError();
  const [p] = await db()`select * from payments where id = ${paymentId}`;
  if (!p) throw new PermissionError();
  const { booking, side } = await bookingFor(actor, String(p.booking_id));
  if (side !== "organizer") throw new PermissionError();
  return { payment: p, booking };
}

export async function requestForActor(actor: Actor, requestId: string) {
  if (!isUuid(requestId)) throw new PermissionError();
  const [r] = await db()`select * from payment_requests where id = ${requestId}`;
  if (!r) throw new PermissionError();
  const { booking, side } = await bookingFor(actor, String(r.booking_id));
  return { request: r, booking, side };
}

export async function canDownload(actor: Actor, bookingId: string): Promise<boolean> {
  try {
    await bookingFor(actor, bookingId);
    return true;
  } catch {
    return false;
  }
}

