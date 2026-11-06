import { beforeEach, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { sha256 } from "@/lib/tokens";
import { resetData, setNow } from "./helpers";
import { makeAdmin, makeVenue, makeOrganizer, makeUser, lastLink, tokenFrom } from "./factories";
import { inviteMember, acceptOrgInvite, setApprovalThreshold } from "@/server/orgs";
import { saveAddOn, setTaxSettings } from "@/server/listings";
import { createEvent, sendEnquiries, updateEvent } from "@/server/enquiries";
import { placeTentativeHold, publicAvailability } from "@/server/calendar";
import { postMessage, listMessages } from "@/server/messaging";
import { draftQuote, updateDraft, submitQuote, approveQuote, requestRevision, declineQuote, quotesForEnquiry, diffQuotes, acceptBlocker, compareQuotes } from "@/server/quotes";
import { acceptQuote, acceptAgreement, startPayment, simulatePayment, handleCallback, bookingWorkspace, extendBalance } from "@/server/bookings";
import { reconcile } from "@/server/ledger";
import { quotePdf, agreementPdf, receiptPdf } from "@/server/documents";
import { advanceDemoClock, updateSetting } from "@/server/admin";
import { simulatedCallback } from "@/adapters/payments";
import { storage } from "@/adapters/storage";
import type { QuoteLine } from "@/lib/quote-math";
import type { Actor } from "@/server/accounts";

/** The PRD §11.2 worked example: 3 days × Rp 25.000.000 + 40 kVA × 3 days × Rp 50.000, PKP venue. */
const DAYS = [
  { date: "2026-12-12", start: "10:00", end: "22:00" },
  { date: "2026-12-13", start: "10:00", end: "22:00" },
  { date: "2026-12-14", start: "10:00", end: "22:00" },
];
const LINES: QuoteLine[] = [
  { id: "00000000-0000-4000-8000-000000000001", kind: "rental", label: "Sewa ruang", quantity: 3, unitPrice: 25_000_000, discount: 0, taxable: true },
  { id: "00000000-0000-4000-8000-000000000002", kind: "add_on", label: "Listrik 40 kVA", quantity: 120, unitPrice: 50_000, discount: 0, taxable: true },
];
const SPLIT = { mode: "split" as const, depositBps: 5000, depositDays: 3, balanceDaysBefore: 14 };

async function setup() {
  const admin = await makeAdmin();
  const v = await makeVenue(admin, "budi@venue.id", { price: 25_000_000 });
  await setTaxSettings(v.owner, { isPkp: true, serviceChargeBps: 0 });
  await saveAddOn(v.owner, { name: "Listrik", unit: "per_kva_day", price: 50_000, taxable: true, mandatory: false });
  const o = await makeOrganizer(admin, "rina@eo.id", "Rina EO");
  const ev = await createEvent(o.owner, { name: "Tech Expo", type: "exhibition", category: "tech", expectedAttendance: 300, days: DAYS });
  const [enquiryId] = await sendEnquiries(o.owner, ev, [v.spaceId]);
  return { admin, v, o, ev, enquiryId: enquiryId! };
}

async function sendWorkedQuote(venue: Actor, enquiryId: string, lines = LINES) {
  const id = await draftQuote(venue, enquiryId);
  await updateDraft(venue, id, { lines, schedule: SPLIT, validityDays: 7, cancellationPolicy: "moderate" });
  const r = await submitQuote(venue, id);
  return { id, r };
}

async function confirmBooking(ctx: Awaited<ReturnType<typeof setup>>) {
  const { id } = await sendWorkedQuote(ctx.v.owner, ctx.enquiryId);
  const bookingId = await acceptQuote(ctx.o.owner, id, { acceptPilotTerms: true });
  await acceptAgreement(ctx.o.owner, bookingId, { checked: true, typedName: "rina" });
  await acceptAgreement(ctx.v.owner, bookingId, { checked: true, typedName: "budi" });
  const [dep] = await db()`select id from payment_requests where booking_id = ${bookingId} and kind = 'deposit'`;
  const payId = await startPayment(ctx.o.owner, String(dep!.id), "test_va");
  await simulatePayment(ctx.o.owner, payId, "paid");
  return { bookingId, quoteId: id, payId };
}

beforeEach(async () => {
  await resetData();
  await setNow(new Date("2026-11-13T03:00:00Z")); // Fri 13 Nov 2026, 10:00 WIB
});

describe("M12 quotes", () => {
  it("AC-M12-1: worked example totals, deposit and balance; the PDF has the watermark", async () => {
    const c = await setup();
    const { id, r } = await sendWorkedQuote(c.v.owner, c.enquiryId);
    expect(r).toBe("sent");
    const [q] = await db()`select totals, status from quotes where id = ${id}`;
    expect(q!.totals).toEqual({ rentalAndAddOns: 81_000_000, serviceCharge: 0, ppn: 8_910_000, venueTotal: 89_910_000, organizerFee: 2_430_000, organizerTotal: 92_340_000 });
    const bookingId = await acceptQuote(c.o.owner, id, { acceptPilotTerms: true });
    const reqs = await db()`select kind, amount from payment_requests where booking_id = ${bookingId}`;
    expect(reqs.map((x) => [x.kind, Number(x.amount)])).toEqual([["deposit", 47_385_000]]);
    const [b] = await db()`select balance_request_at, balance_due_at from bookings where id = ${bookingId}`;
    expect((b!.balance_due_at as Date).toISOString()).toBe("2026-11-28T16:59:00.000Z"); // 28 Nov 23:59 WIB
    const pdf = await quotePdf(id);
    const doc = await PDFDocument.load(pdf);
    expect(doc.getTitle()).toContain("PILOT");
    expect(doc.getKeywords()).toContain("PILOT");
  });

  it("AC-M2-4: at or above the threshold a Staff quote waits for the Owner; the organizer doesn't see it until approved", async () => {
    const c = await setup();
    const staff = await makeUser(c.admin, "staff@venue.id");
    await inviteMember(c.v.owner, c.v.orgId, "staff@venue.id", "staff");
    await acceptOrgInvite(staff, tokenFrom(await lastLink("staff@venue.id")));
    await setApprovalThreshold(c.v.owner, c.v.orgId, 50_000_000);
    const { id, r } = await sendWorkedQuote(staff, c.enquiryId);
    expect(r).toBe("pending_approval");
    expect((await quotesForEnquiry(c.o.owner, c.enquiryId)).quotes.length).toBe(0);
    await expect(approveQuote(staff, id)).rejects.toThrow("permission_denied");
    await approveQuote(c.v.owner, id);
    expect((await quotesForEnquiry(c.o.owner, c.enquiryId)).quotes.map((q) => q.status)).toEqual(["sent"]);
  });

  it("AC-M12-2: revision with per-line comments, diff, only the latest version can be accepted; decline needs a reason", async () => {
    const c = await setup();
    const v1 = await sendWorkedQuote(c.v.owner, c.enquiryId, [{ ...LINES[0]!, unitPrice: 27_000_000 }, LINES[1]!]);
    await requestRevision(c.o.owner, v1.id, { general: "Bisa lebih murah?", lines: { [LINES[0]!.id]: "Harga per hari terlalu tinggi" } });
    const v2 = await sendWorkedQuote(c.v.owner, c.enquiryId);
    const { quotes } = await quotesForEnquiry(c.o.owner, c.enquiryId);
    expect(quotes.map((q) => [q.version, q.status])).toEqual([[2, "sent"], [1, "superseded"]]);
    const diff = diffQuotes(quotes[1], quotes[0]!);
    expect(diff.find((d) => d.label === "Sewa ruang")).toMatchObject({ before: 81_000_000, after: 75_000_000, change: "changed" });
    expect(await acceptBlocker(quotes[1]!)).toBe("quotes.superseded");
    await expect(acceptQuote(c.o.owner, v1.id, { acceptPilotTerms: true })).rejects.toMatchObject({ key: "quotes.superseded" });
    await expect(declineQuote(c.o.owner, v2.id, " ")).rejects.toMatchObject({ key: "errors.reasonRequired" });
  });

  it("AC-M12-3: expired quotes can't be accepted; acceptance needs pilot terms; balance can't be < 3 days before the event", async () => {
    const c = await setup();
    const draft = await draftQuote(c.v.owner, c.enquiryId);
    await expect(updateDraft(c.v.owner, draft, { lines: LINES, schedule: { ...SPLIT, balanceDaysBefore: 2 }, validityDays: 7, cancellationPolicy: "moderate" })).rejects.toMatchObject({ key: "quotes.balanceTooClose" });
    await updateDraft(c.v.owner, draft, { lines: LINES, schedule: SPLIT, validityDays: 2, cancellationPolicy: "moderate" });
    await submitQuote(c.v.owner, draft);
    await expect(acceptQuote(c.o.owner, draft, { acceptPilotTerms: false })).rejects.toMatchObject({ key: "bookings.pilotTermsRequired" });
    await advanceDemoClock(c.admin, 3 * 86_400_000);
    expect((await db()`select status from quotes where id = ${draft}`)[0]!.status).toBe("expired");
    await expect(acceptQuote(c.o.owner, draft, { acceptPilotTerms: true })).rejects.toMatchObject({ key: "quotes.expired" });
  });

  it("AC-M12-4: a quote on held dates is a backup quote; it expires with 'dates booked' when the hold is confirmed", async () => {
    const c = await setup();
    const sari = await makeOrganizer(c.admin, "sari@k.id", "Sari");
    const evS = await createEvent(sari.owner, { name: "Bazar", type: "bazaar", category: "food", expectedAttendance: 100, days: [DAYS[1]!] });
    const [eqS] = await sendEnquiries(sari.owner, evS, [c.v.spaceId]);
    const rinaQ = await sendWorkedQuote(c.v.owner, c.enquiryId);
    const bookingId = await acceptQuote(c.o.owner, rinaQ.id, { acceptPilotTerms: true }); // booking hold on 12–14 Dec
    const sariQ = await sendWorkedQuote(c.v.owner, eqS!, [{ ...LINES[0]!, quantity: 1 }]);
    const [sq] = await db()`select is_backup from quotes where id = ${sariQ.id}`;
    expect(sq!.is_backup).toBe(true);
    const { quotes } = await quotesForEnquiry(sari.owner, eqS!);
    expect(await acceptBlocker(quotes[0]!)).toBe("quotes.datesHeld");
    await acceptAgreement(c.o.owner, bookingId, { checked: true, typedName: "rina" });
    await acceptAgreement(c.v.owner, bookingId, { checked: true, typedName: "budi" });
    const [dep] = await db()`select id from payment_requests where booking_id = ${bookingId}`;
    await simulatePayment(c.o.owner, await startPayment(c.o.owner, String(dep!.id), "test_qris"), "paid");
    expect((await db()`select status, expire_reason from quotes where id = ${sariQ.id}`)[0]).toMatchObject({ status: "expired", expire_reason: "dates_booked" });
  });

  it("AC-M12-5: on lapse both backup holders are told together; the first to accept wins; validity is extended", async () => {
    const c = await setup();
    const a = await makeOrganizer(c.admin, "a@k.id", "A");
    const b = await makeOrganizer(c.admin, "b@k.id", "B");
    const mk = async (o: typeof a) => (await sendEnquiries(o.owner, await createEvent(o.owner, { name: "Ev", type: "bazaar", category: "food", expectedAttendance: 50, days: [DAYS[0]!] }), [c.v.spaceId]))[0]!;
    const ea = await mk(a);
    const eb = await mk(b);
    const rinaQ = await sendWorkedQuote(c.v.owner, c.enquiryId);
    await acceptQuote(c.o.owner, rinaQ.id, { acceptPilotTerms: true });
    const qa = await sendWorkedQuote(c.v.owner, ea, [{ ...LINES[0]!, quantity: 1 }]);
    const qb = await sendWorkedQuote(c.v.owner, eb, [{ ...LINES[0]!, quantity: 1 }]);
    await db()`update quotes set validity_days = 1, valid_until = ${new Date((await now()).getTime() + 3.5 * 86_400_000)} where id in ${db()([qa.id, qb.id])}`;
    await advanceDemoClock(c.admin, 4 * 86_400_000); // deposit deadline (16 Nov 23:59) passes → lapse
    const told = await db()`select user_id from notifications where event = 'quote_backup_acceptable'`;
    expect(told.map((x) => x.user_id).sort()).toEqual([a.owner.userId, b.owner.userId].sort());
    const [va] = await db()`select valid_until from quotes where id = ${qa.id}`;
    expect(new Date(va!.valid_until as Date).getTime()).toBeGreaterThan((await now()).getTime() + 86_400_000);
    const results = await Promise.allSettled([acceptQuote(a.owner, qa.id, { acceptPilotTerms: true }), acceptQuote(b.owner, qb.id, { acceptPilotTerms: true })]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    const rej = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(["quotes.datesJustTaken", "quotes.datesHeld"]).toContain(rej.reason.key);
  });

  it("AC-M6-2: two acceptances for the same dates at the same moment — exactly one booking hold", async () => {
    const c = await setup();
    const sari = await makeOrganizer(c.admin, "sari@k.id", "Sari");
    const [eqS] = await sendEnquiries(sari.owner, await createEvent(sari.owner, { name: "Bazar", type: "bazaar", category: "food", expectedAttendance: 100, days: DAYS }), [c.v.spaceId]);
    const q1 = await sendWorkedQuote(c.v.owner, c.enquiryId);
    const q2 = await sendWorkedQuote(c.v.owner, eqS!);
    const r = await Promise.allSettled([acceptQuote(c.o.owner, q1.id, { acceptPilotTerms: true }), acceptQuote(sari.owner, q2.id, { acceptPilotTerms: true })]);
    expect(r.filter((x) => x.status === "fulfilled").length).toBe(1);
    expect((r.find((x) => x.status === "rejected") as PromiseRejectedResult).reason.key).toBe("quotes.datesJustTaken");
    const holds = await db()`select count(distinct booking_id)::int as n from calendar_entries where kind = 'booking_hold' and released_at is null`;
    expect(holds[0]!.n).toBe(1);
  });

  it("FR-M12-13 / §12.1: quotes can't be sent for Booked or Blocked dates", async () => {
    const c = await setup();
    await confirmBooking(c);
    const sari = await makeOrganizer(c.admin, "sari@k.id", "Sari");
    const [eqS] = await sendEnquiries(sari.owner, await createEvent(sari.owner, { name: "Bazar", type: "bazaar", category: "food", expectedAttendance: 100, days: [DAYS[2]!] }), [c.v.spaceId]);
    const d = await draftQuote(c.v.owner, eqS!);
    await updateDraft(c.v.owner, d, { lines: LINES, schedule: SPLIT, validityDays: 7, cancellationPolicy: "moderate" });
    await expect(submitQuote(c.v.owner, d)).rejects.toMatchObject({ key: "quotes.datesBooked" });
  });
});

describe("M13 agreement, M14 payments, M15/M16 documents and ledger", () => {
  it("AC-M13-1: generated from the accepted version; organizer first, then venue; acceptances on the last page; hash matches", async () => {
    const c = await setup();
    const { id } = await sendWorkedQuote(c.v.owner, c.enquiryId);
    const bookingId = await acceptQuote(c.o.owner, id, { acceptPilotTerms: true });
    const [a0] = await db()`select status, file_id, sha256 from agreements where booking_id = ${bookingId}`;
    expect(a0!.status).toBe("generated");
    await expect(acceptAgreement(c.v.owner, bookingId, { checked: true, typedName: "budi" })).rejects.toMatchObject({ key: "agreement.organizerFirst" });
    await expect(acceptAgreement(c.o.owner, bookingId, { checked: true, typedName: "Someone Else" })).rejects.toMatchObject({ key: "agreement.nameMismatch" });
    await acceptAgreement({ ...c.o.owner, ip: "10.1.1.1" }, bookingId, { checked: true, typedName: "rina" });
    await acceptAgreement(c.v.owner, bookingId, { checked: true, typedName: "budi" });
    const [a] = await db()`select a.status, a.sha256, f.storage_key, a.acceptances from agreements a join files f on f.id = a.file_id where a.booking_id = ${bookingId}`;
    expect(a!.status).toBe("accepted_by_both");
    const bytes = await storage().get(String(a!.storage_key));
    expect(sha256Hex(bytes)).toBe(a!.sha256);
    expect((a!.acceptances as { side: string; ip: string }[]).map((x) => x.side)).toEqual(["organizer", "venue"]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle()).toContain("PILOT");
    void agreementPdf;
  });

  it("AC-M14-1: test VA payment recorded once even with a duplicate callback; ledger held; Confirmed; receipt emailed", async () => {
    const c = await setup();
    const { id } = await sendWorkedQuote(c.v.owner, c.enquiryId);
    const bookingId = await acceptQuote(c.o.owner, id, { acceptPilotTerms: true });
    await acceptAgreement(c.o.owner, bookingId, { checked: true, typedName: "rina" });
    await acceptAgreement(c.v.owner, bookingId, { checked: true, typedName: "budi" });
    const [dep] = await db()`select id from payment_requests where booking_id = ${bookingId}`;
    const payId = await startPayment(c.o.owner, String(dep!.id), "test_va");
    const [p] = await db()`select provider_ref, amount, instructions from payments where id = ${payId}`;
    expect(String((p!.instructions as { vaNumber: string }).vaNumber)).toMatch(/^8808\d{10}$/);
    const cb = simulatedCallback(String(p!.provider_ref), Number(p!.amount), "paid", await now());
    expect(await handleCallback(cb.payload, cb.signature)).toBe("processed");
    expect(await handleCallback(cb.payload, cb.signature)).toBe("duplicate");
    expect(await handleCallback({ ...cb.payload, eventId: "forged" }, "bad")).toBe("rejected");
    expect((await db()`select count(*)::int as n from ledger_entries where booking_id = ${bookingId}`)[0]!.n).toBe(1);
    expect((await db()`select status from bookings where id = ${bookingId}`)[0]!.status).toBe("confirmed"); // balance_due once the balance is requested
    expect((await publicAvailability(c.v.spaceId, "2026-12-12", "2026-12-14")).every((d) => d.state === "unavailable")).toBe(true);
    expect((await db()`select 1 from email_outbox where to_email = 'rina@eo.id' and category = 'payment_received'`).length).toBe(1);
    expect((await reconcile(bookingId)).ok).toBe(true);
  });

  it("AC-M15/M16-1: receipt titled not a tax invoice, PILOT- number, venue lines and a separate Spot-In fee line", async () => {
    const c = await setup();
    const { bookingId } = await confirmBooking(c);
    const [r] = await db()`select id, number, lines, amount from receipts where booking_id = ${bookingId}`;
    expect(String(r!.number)).toMatch(/^PILOT-[0-9A-F]{4}-00001$/);
    expect((r!.lines as { label: string; amount: number }[]).map((l) => l.label)).toEqual(["Uang muka sewa ruang dan layanan tambahan", "PPN", "Biaya layanan Spot-In"]);
    expect((r!.lines as { amount: number }[]).reduce((s, l) => s + l.amount, 0)).toBe(47_385_000);
    const pdf = await receiptPdf(String(r!.id));
    expect((await PDFDocument.load(pdf)).getTitle()).toContain("bukan faktur pajak");
  });

  it("AC-M15/M16-2 + AC-M14-2: balance requested 21 days before, reminders 3d/1d/due; Owner may extend once", async () => {
    const c = await setup();
    const { bookingId } = await confirmBooking(c);
    await setNow(new Date("2026-11-20T16:00:00Z")); // 20 Nov 23:00 WIB
    await advanceDemoClock(c.admin, 2 * 3600_000); // 21 Nov 01:00 WIB → balance issued
    const [bal] = await db()`select amount, issued_at from payment_requests where booking_id = ${bookingId} and kind = 'balance'`;
    expect(Number(bal!.amount)).toBe(44_955_000);
    await advanceDemoClock(c.admin, 7 * 86_400_000); // 28 Nov 01:00: issue notice + 3-day and 1-day reminders
    const reminders = await db()`select count(*)::int as n from email_outbox where to_email = 'rina@eo.id' and category = 'payment_due'`;
    expect(reminders[0]!.n).toBeGreaterThanOrEqual(3);
    await advanceDemoClock(c.admin, 86_400_000); // balance missed
    expect((await db()`select 1 from notifications where event = 'balance_missed_venue'`).length).toBe(1);
    await expect(extendBalance(c.v.owner, bookingId, 4)).rejects.toMatchObject({ key: "bookings.extendDaysInvalid" });
    await extendBalance(c.v.owner, bookingId, 3);
    await expect(extendBalance(c.v.owner, bookingId, 1)).rejects.toMatchObject({ key: "bookings.alreadyExtended" });
  });

  it("AC-M14-2 (deposit): an unpaid deposit lapses the booking, releases the dates and refunds in the ledger", async () => {
    const c = await setup();
    const { id } = await sendWorkedQuote(c.v.owner, c.enquiryId);
    const bookingId = await acceptQuote(c.o.owner, id, { acceptPilotTerms: true });
    const [dep] = await db()`select id from payment_requests where booking_id = ${bookingId}`;
    await simulatePayment(c.o.owner, await startPayment(c.o.owner, String(dep!.id), "test_card"), "paid"); // paid, but agreement never accepted
    await advanceDemoClock(c.admin, 4 * 86_400_000);
    expect((await db()`select status from bookings where id = ${bookingId}`)[0]!.status).toBe("lapsed");
    expect((await db()`select status from agreements where booking_id = ${bookingId}`)[0]!.status).toBe("voided");
    expect((await publicAvailability(c.v.spaceId, "2026-12-12", "2026-12-12"))[0]!.state).toBe("available");
    const r = await reconcile(bookingId);
    expect(r.ok).toBe(true);
    expect(r.figures.refunded).toBe(47_385_000);
    expect((await db()`select count(*)::int as n from receipts where booking_id = ${bookingId} and kind = 'credit_note'`)[0]!.n).toBe(1);
    expect((await db()`select 1 from notifications where event = 'booking_lapsed'`).length).toBeGreaterThan(0);
  });

  it("AC-M14-1 (failure): a declined test card leaves the booking unchanged", async () => {
    const c = await setup();
    const { id } = await sendWorkedQuote(c.v.owner, c.enquiryId);
    const bookingId = await acceptQuote(c.o.owner, id, { acceptPilotTerms: true });
    const [dep] = await db()`select id from payment_requests where booking_id = ${bookingId}`;
    const pid = await startPayment(c.o.owner, String(dep!.id), "test_card");
    await simulatePayment(c.o.owner, pid, "failed");
    expect((await db()`select status from payments where id = ${pid}`)[0]!.status).toBe("failed");
    expect((await db()`select status from bookings where id = ${bookingId}`)[0]!.status).toBe("pending_agreement_and_deposit");
  });

  it("AC-M24/M25/M26-3: a ledger altered in the database is flagged by reconciliation", async () => {
    const c = await setup();
    const { bookingId } = await confirmBooking(c);
    expect((await reconcile(bookingId)).ok).toBe(true);
    await db().unsafe(`alter table ledger_entries disable trigger ledger_append_only`);
    await db()`update ledger_entries set amount = amount - 1000 where booking_id = ${bookingId}`;
    await db().unsafe(`alter table ledger_entries enable trigger ledger_append_only`);
    const r = await reconcile(bookingId);
    expect(r.ok).toBe(false);
    expect(r.problems).toContain("ledger_inflow_vs_payments");
  });

  it("AC-M24/M25/M26-2 (fee part): a fee change applies only to quotes created afterwards", async () => {
    const c = await setup();
    const first = await draftQuote(c.v.owner, c.enquiryId);
    await updateSetting(c.admin, "organizer_fee_bps", 400);
    await updateDraft(c.v.owner, first, { lines: LINES, schedule: SPLIT, validityDays: 7, cancellationPolicy: "moderate" });
    expect(Number(((await db()`select totals from quotes where id = ${first}`)[0]!.totals as { organizerFee: number }).organizerFee)).toBe(2_430_000);
    await submitQuote(c.v.owner, first);
    const second = await draftQuote(c.v.owner, c.enquiryId); // new version after the change
    await updateDraft(c.v.owner, second, { lines: LINES, schedule: SPLIT, validityDays: 7, cancellationPolicy: "moderate" });
    expect(Number(((await db()`select totals from quotes where id = ${second}`)[0]!.totals as { organizerFee: number }).organizerFee)).toBe(2_500_000); // 4% capped at the max
  });
});

describe("Build 1 criteria that needed bookings", () => {
  it("AC-M9/M10-4: editing the event marks open quotes 'Event changed'; they can't be accepted until re-sent", async () => {
    const c = await setup();
    const { id } = await sendWorkedQuote(c.v.owner, c.enquiryId);
    await updateEvent(c.o.owner, c.ev, { name: "Tech Expo", type: "exhibition", category: "tech", expectedAttendance: 400, days: DAYS });
    await expect(acceptQuote(c.o.owner, id, { acceptPilotTerms: true })).rejects.toMatchObject({ key: "quotes.eventChanged" });
    const resent = await sendWorkedQuote(c.v.owner, c.enquiryId);
    await expect(acceptQuote(c.o.owner, resent.id, { acceptPilotTerms: true })).resolves.toBeTruthy();
  });

  it("AC-M9/M10-5 (after confirmation) + AC-M1-4: nothing is masked and phones are visible once confirmed", async () => {
    const c = await setup();
    await db()`update users set phone = '0812 1111 2222' where id = ${c.v.owner.userId}`;
    const { quoteId } = await sendWorkedQuote(c.v.owner, c.enquiryId).then(async (q) => {
      const bookingId = await acceptQuote(c.o.owner, q.id, { acceptPilotTerms: true });
      const before = await bookingWorkspace(c.o.owner, bookingId);
      expect(before.contacts).toBeNull();
      await acceptAgreement(c.o.owner, bookingId, { checked: true, typedName: "rina" });
      await acceptAgreement(c.v.owner, bookingId, { checked: true, typedName: "budi" });
      const [dep] = await db()`select id from payment_requests where booking_id = ${bookingId}`;
      await simulatePayment(c.o.owner, await startPayment(c.o.owner, String(dep!.id), "test_va"), "paid");
      const after = await bookingWorkspace(c.o.owner, bookingId);
      expect(after.contacts!.venue.map((x) => x.phone)).toContain("0812 1111 2222");
      return { quoteId: q.id };
    });
    void quoteId;
    const r = await postMessage(c.o.owner, c.enquiryId, { body: "telp 0812-3456-7890" });
    expect(r.masked).toBe(false);
    expect((await listMessages(c.v.owner, c.enquiryId)).messages.at(-1)!.body).toBe("telp 0812-3456-7890");
  });

  it("AC-M7/M8-4: comparison table aligns the latest quotes of one event", async () => {
    const c = await setup();
    const v2 = await makeVenue(c.admin, "v2@venue.id", { name: "Mall B", spaceName: "Hall B" });
    const [e2] = await sendEnquiries(c.o.owner, c.ev, [v2.spaceId]);
    await sendWorkedQuote(c.v.owner, c.enquiryId);
    await sendWorkedQuote(v2.owner, e2!, [{ ...LINES[0]!, unitPrice: 20_000_000 }]);
    const cmp = await compareQuotes(c.o.owner, c.ev);
    expect(cmp.quotes.map((q) => Number(q.totals.organizerTotal)).sort()).toEqual([61_800_000, 92_340_000].sort());
  });

  it("AC-M6-1 (booked) + FR-M6-07: placing a hold on booked dates is refused", async () => {
    const c = await setup();
    await confirmBooking(c);
    const sari = await makeOrganizer(c.admin, "sari@k.id", "Sari");
    const [eqS] = await sendEnquiries(sari.owner, await createEvent(sari.owner, { name: "Bazar", type: "bazaar", category: "food", expectedAttendance: 100, days: [DAYS[0]!] }), [c.v.spaceId]);
    await expect(placeTentativeHold(c.v.owner, eqS!)).rejects.toMatchObject({ key: "calendar.holdConflict" });
  });
});

function sha256Hex(b: Buffer): string {
  return createHash("sha256").update(b).digest("hex");
}
void sha256;
