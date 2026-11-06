import { beforeEach, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { resetData, setNow } from "./helpers";
import { makeAdmin, makeVenue, makeOrganizer, makeUser, lastLink, tokenFrom, pngBytes } from "./factories";
import { inviteMember, acceptOrgInvite, setApprovalThreshold } from "@/server/orgs";
import { saveProperty, saveAddOn, setTaxSettings } from "@/server/listings";
import { createEvent, sendEnquiries } from "@/server/enquiries";
import { publicAvailability } from "@/server/calendar";
import { draftQuote, updateDraft, submitQuote } from "@/server/quotes";
import { acceptQuote, acceptAgreement, startPayment, simulatePayment, bookingWorkspace } from "@/server/bookings";
import { reconcile, balances } from "@/server/ledger";
import { advanceDemoClock, decideReport } from "@/server/admin";
import { consumeMagicLink, deletionBlockers } from "@/server/accounts";
import {
  checklist, uploadDocument, reviewDocument, setAtRisk, organizerCancellationFigures, cancelByOrganizer, cancelByVenue, recordNoShow,
  reportProblem, resolveProblem, statementCsv, statementPdf,
} from "@/server/lifecycle";
import {
  saveEventPage, publishEventPage, register, confirmRegistration, cancelOwnRegistration, attendees, organizerCancelRegistration, attendeesCsv,
  passView, checkIn, undoCheckIn, setRegistrationOpen, report, publicPage, validateQuestions, type PageInput,
} from "@/server/event-pages";
import { venuePipeline, venueThisWeek, venueCounts, organizerEventDashboard } from "@/server/dashboards";
import { contactUs } from "@/server/contact";
import type { QuoteLine } from "@/lib/quote-math";
import type { Actor } from "@/server/accounts";

// Fri 11 – Sun 13 Dec 2026, so the event ends on Sunday 22:00 (AC-M15/M16-4).
const DAYS = [
  { date: "2026-12-11", start: "10:00", end: "22:00" },
  { date: "2026-12-12", start: "10:00", end: "22:00" },
  { date: "2026-12-13", start: "10:00", end: "22:00" },
];
const LINES: QuoteLine[] = [
  { id: "00000000-0000-4000-8000-000000000001", kind: "rental", label: "Sewa ruang", quantity: 3, unitPrice: 25_000_000, discount: 0, taxable: true },
  { id: "00000000-0000-4000-8000-000000000002", kind: "add_on", label: "Listrik 40 kVA", quantity: 120, unitPrice: 50_000, discount: 0, taxable: true },
];
const SPLIT = { mode: "split" as const, depositBps: 5000, depositDays: 3, balanceDaysBefore: 14 };
const DAY = 86_400_000;

async function setup(days = DAYS) {
  const admin = await makeAdmin();
  const v = await makeVenue(admin, "budi@venue.id", { price: 25_000_000 });
  await setTaxSettings(v.owner, { isPkp: true, serviceChargeBps: 0 });
  await saveAddOn(v.owner, { name: "Listrik", unit: "per_kva_day", price: 50_000, taxable: true, mandatory: false });
  const o = await makeOrganizer(admin, "rina@eo.id", "Rina EO");
  const ev = await createEvent(o.owner, { name: "Tech Expo", type: "exhibition", category: "tech", expectedAttendance: 300, days });
  const [enquiryId] = await sendEnquiries(o.owner, ev, [v.spaceId]);
  return { admin, v, o, ev, enquiryId: enquiryId! };
}

async function confirmed(c: Awaited<ReturnType<typeof setup>>, lines = LINES) {
  const id = await draftQuote(c.v.owner, c.enquiryId);
  await updateDraft(c.v.owner, id, { lines, schedule: SPLIT, validityDays: 7, cancellationPolicy: "moderate" });
  await submitQuote(c.v.owner, id);
  const bookingId = await acceptQuote(c.o.owner, id, { acceptPilotTerms: true });
  await acceptAgreement(c.o.owner, bookingId, { checked: true, typedName: "rina" });
  await acceptAgreement(c.v.owner, bookingId, { checked: true, typedName: "budi" });
  await pay(c.o.owner, bookingId, "deposit");
  return bookingId;
}

async function pay(organizer: Actor, bookingId: string, kind: string) {
  const [r] = await db()`select id from payment_requests where booking_id = ${bookingId} and kind = ${kind}`;
  const payId = await startPayment(organizer, String(r!.id), "test_va");
  await simulatePayment(organizer, payId, "paid");
}

async function status(bookingId: string) {
  return String((await db()`select status from bookings where id = ${bookingId}`)[0]!.status);
}

function pageInput(days: { date: string; start: string; end: string }[], capacity = 100, extra: Partial<PageInput> = {}): PageInput {
  return {
    title: "Tech Expo Desember",
    summary: "Pameran gadget tiga hari.",
    description: "Detail acara.",
    category: "tech",
    questions: [],
    closeMode: "session_start",
    sessions: days.map((d) => ({ day: d.date, start: d.start, end: d.end, capacity })),
    ...extra,
  };
}

async function livePage(c: Awaited<ReturnType<typeof setup>>, capacity = 100, extra: Partial<PageInput> = {}, days = DAYS) {
  const { pageId } = await saveEventPage(c.o.owner, c.ev, pageInput(days, capacity, extra), { coverFile: { name: "cover.png", bytes: await pngBytes() } });
  await publishEventPage(c.o.owner, pageId);
  const [p] = await db()`select slug from event_pages where id = ${pageId}`;
  const sessions = await db()`select id, day from event_sessions where page_id = ${pageId} order by day`;
  return { pageId, slug: String(p!.slug), sessions: sessions.map((s) => String(s.id)) };
}

/** Registers and confirms through the emailed link, as an attendee would (FR-M1-10). */
async function registerConfirmed(slug: string, sessionId: string, email: string, name = "Maya Anggraini", ip: string | null = null) {
  const r = await register({ slug, sessionId, name, email, answers: {}, ageConfirmed: true, acceptedPilotNotice: true, ip });
  const { userId, data } = await consumeMagicLink(tokenFrom(await lastLink(email)));
  const token = await confirmRegistration(String(data.registrationId), userId);
  return { registrationId: r.registrationId, userId, token };
}

beforeEach(async () => {
  await resetData();
  await setNow(new Date("2026-11-05T03:00:00Z")); // Thu 5 Nov 2026, 10:00 WIB
});

describe("M17 documents and readiness", () => {
  it("AC-M17-1 / AC-M4/M5-3: checklist from the property's 3 documents with due dates; versions; review; 7-day warning; At risk", async () => {
    const c = await setup();
    const [prop] = await db()`select id from properties where operator_id = ${c.v.orgId}`;
    await saveProperty(c.v.owner, {
      id: String(prop!.id), name: "Mall A", type: "mall", addressText: "Jl. Sudirman 1", city: "Jakarta Selatan", area: "Kebayoran Baru", lat: -6.2297, lon: 106.8,
      requiredDocs: [
        { name: "Layout final", mandatory: true, dueOffsetDays: 7 },
        { name: "Asuransi", mandatory: true, dueOffsetDays: 5 },
        { name: "Daftar vendor", mandatory: false, dueOffsetDays: 3 },
      ],
    } as never);
    const bookingId = await confirmed(c);
    const items = await checklist(c.o.owner, bookingId);
    expect(items.map((d) => [d.name, (d.due_at as Date).toISOString()])).toEqual([
      ["Layout final", "2026-12-04T03:00:00.000Z"],
      ["Asuransi", "2026-12-06T03:00:00.000Z"],
      ["Daftar vendor", "2026-12-08T03:00:00.000Z"],
    ]);
    const pdf = Buffer.from("%PDF-1.4\n% layout\n");
    await uploadDocument(c.o.owner, String(items[0]!.id), { name: "layout.pdf", bytes: pdf });
    await expect(reviewDocument(c.v.owner, String(items[0]!.id), "changes", " ")).rejects.toMatchObject({ key: "documents.commentRequired" });
    await reviewDocument(c.v.owner, String(items[0]!.id), "changes", "Jalur evakuasi belum ada");
    await uploadDocument(c.o.owner, String(items[0]!.id), { name: "layout-v2.pdf", bytes: pdf });
    await expect(reviewDocument(c.o.owner, String(items[0]!.id), "approve", "")).rejects.toThrow("permission_denied");
    await reviewDocument(c.v.owner, String(items[0]!.id), "approve", "");
    const after = await checklist(c.v.owner, bookingId);
    expect(after[0]!.status).toBe("approved");
    expect(after[0]!.versions.map((v) => v.version)).toEqual([2, 1]);

    // 7 days before: "Asuransi" is still missing → warnings to both sides
    await db()`delete from email_outbox`;
    await advanceDemoClock(c.admin, new Date("2026-12-04T03:30:00Z").getTime() - (await now()).getTime());
    const warned = await db()`select to_email from email_outbox where category = 'readiness_warning'`;
    expect(warned.map((w) => w.to_email).sort()).toEqual(["budi@venue.id", "rina@eo.id"]);
    await setAtRisk(c.v.owner, bookingId, true, "Asuransi belum ada");
    expect((await db()`select at_risk from bookings where id = ${bookingId}`)[0]!.at_risk).toBe(true);
  });
});

describe("M18 cancellations", () => {
  it("AC-M18-1 / AC-M14-3: Moderate, deposit only, 35 days before → refund 44.955.000, fee kept; reconciles; refund shows as simulated", async () => {
    const c = await setup();
    const bookingId = await confirmed(c);
    await setNow(new Date("2026-11-06T04:00:00Z")); // 35 days before 11 Dec, > 24 h after confirmation
    const f = await organizerCancellationFigures(bookingId);
    expect(f).toMatchObject({ daysBefore: 35, tierBps: 10000, venuePaid: 44_955_000, refundVenue: 44_955_000, venueKeeps: 0, feePaid: 2_430_000, feeRefunded: 0, refundTotal: 44_955_000 });
    await expect(cancelByOrganizer(c.o.owner, bookingId, { reason: "Acara ditunda", expectedRefund: 1 })).rejects.toMatchObject({ key: "cancel.figuresChanged" });
    await cancelByOrganizer(c.o.owner, bookingId, { reason: "Acara ditunda", expectedRefund: f.refundTotal });
    expect(await status(bookingId)).toBe("cancelled_by_organizer");
    const credit = await db()`select amount, lines from receipts where booking_id = ${bookingId} and kind = 'credit_note'`;
    expect(credit.map((x) => Number(x.amount))).toEqual([44_955_000]);
    expect(JSON.stringify(credit[0]!.lines)).toContain("Pengembalian (simulasi)");
    expect((await reconcile(bookingId)).ok).toBe(true);
    const b = await balances(bookingId);
    expect(b.held).toBe(0);
    expect(b.spotin_fee).toBe(2_430_000);
    expect(await statementCsv(c.o.owner, bookingId)).toContain("Pengembalian (simulasi)");
  });

  it("AC-M18-1: 20 days before → refund 0 and the venue keeps 44.955.000", async () => {
    const c = await setup();
    const bookingId = await confirmed(c);
    await setNow(new Date("2026-11-21T04:00:00Z"));
    const f = await organizerCancellationFigures(bookingId);
    expect(f).toMatchObject({ daysBefore: 20, tierBps: 5000, refundTotal: 0, venueKeeps: 44_955_000, feeRefunded: 0 });
    await cancelByOrganizer(c.o.owner, bookingId, { reason: "Batal", expectedRefund: 0 });
    const b = await balances(bookingId);
    expect(b.venue_payable + b.spotin_commission).toBe(44_955_000);
    expect(b.spotin_commission).toBe(4_050_000); // 10% of the ex-PPN share of 44.955.000
    expect((await reconcile(bookingId)).ok).toBe(true);
  });

  it("FR-M18-05: the fee is refunded within 24 h of confirmation and ≥ 14 days before", async () => {
    const c = await setup();
    const bookingId = await confirmed(c);
    const f = await organizerCancellationFigures(bookingId);
    expect(f.feeRefunded).toBe(2_430_000);
  });

  it("AC-M18-2 / AC-M2-1: venue cancellation is Owner-only, needs a reason and refunds everything including the fee; dates become available (AC-M6-4)", async () => {
    const c = await setup();
    const bookingId = await confirmed(c);
    const staff = await makeUser(c.admin, "staff@venue.id");
    await inviteMember(c.v.owner, c.v.orgId, "staff@venue.id", "staff");
    await acceptOrgInvite(staff, tokenFrom(await lastLink("staff@venue.id")));
    await expect(cancelByVenue(staff, bookingId, "x")).rejects.toThrow("permission_denied");
    await expect(setApprovalThreshold(staff, c.v.orgId, 1_000_000)).rejects.toThrow("permission_denied");
    await expect(inviteMember(staff, c.v.orgId, "x@venue.id", "staff")).rejects.toThrow("permission_denied");
    expect((await db()`select kind from calendar_entries where booking_id = ${bookingId} and released_at is null`).map((r) => r.kind)).toEqual(["booked", "booked", "booked"]);
    let cal = await publicAvailability(c.v.spaceId, "2026-12-11", "2026-12-13");
    expect(cal.map((d) => d.state)).toEqual(["unavailable", "unavailable", "unavailable"]);
    await expect(cancelByVenue(c.v.owner, bookingId, " ")).rejects.toMatchObject({ key: "errors.reasonRequired" });
    await cancelByVenue(c.v.owner, bookingId, "Renovasi mendadak");
    expect(await status(bookingId)).toBe("cancelled_by_venue");
    const [r] = await db()`select coalesce(sum(amount), 0)::bigint as v from receipts where booking_id = ${bookingId} and kind = 'credit_note'`;
    expect(Number(r!.v)).toBe(47_385_000);
    expect((await reconcile(bookingId)).ok).toBe(true);
    cal = await publicAvailability(c.v.spaceId, "2026-12-11", "2026-12-13");
    expect(cal.map((d) => d.state)).toEqual(["available", "available", "available"]);
  });

  it("AC-M18-3: a no-show on the event day cancels the booking; the event page shows Cancelled, passes are voided, registrants emailed", async () => {
    const c = await setup();
    const bookingId = await confirmed(c);
    await pay(c.o.owner, bookingId, "deposit").catch(() => {});
    const { slug, sessions, pageId } = await livePage(c);
    const a = await registerConfirmed(slug, sessions[0]!, "maya@mail.id");
    await expect(recordNoShow(c.v.owner, bookingId)).rejects.toMatchObject({ key: "cancel.noShowEventDayOnly" });
    await advanceDemoClock(c.admin, new Date("2026-12-11T05:00:00Z").getTime() - (await now()).getTime());
    await recordNoShow(c.v.owner, bookingId);
    expect(await status(bookingId)).toBe("cancelled_by_organizer");
    expect((await db()`select status from event_pages where id = ${pageId}`)[0]!.status).toBe("cancelled");
    expect((await db()`select status from passes where token = ${a.token}`)[0]!.status).toBe("voided");
    expect((await db()`select 1 from email_outbox where to_email = 'maya@mail.id' and category = 'event_cancelled'`).length).toBe(1);
    expect((await reconcile(bookingId)).ok).toBe(true);
  });
});

describe("M16 post-event window and release", () => {
  it("AC-M15/M16-2 + AC-M15/M16-4: balance requested 21 days before; event ends Sun 22:00 → release Thu 10:00 with the §11.2 figures", async () => {
    const c = await setup();
    const bookingId = await confirmed(c);
    await advanceDemoClock(c.admin, new Date("2026-11-20T03:00:00Z").getTime() - (await now()).getTime());
    const [bal] = await db()`select issued_at, due_at, amount from payment_requests where booking_id = ${bookingId} and kind = 'balance'`;
    expect((bal!.issued_at as Date).toISOString()).toBe("2026-11-19T17:00:00.000Z"); // 20 Nov 00:00 WIB = 21 days before 11 Dec
    expect(Number(bal!.amount)).toBe(44_955_000);
    const reminders = await db()`select run_at from jobs where unique_key like ${`booking:${bookingId}:remind:balance:%`} order by run_at`;
    expect(reminders.length).toBe(3);
    await pay(c.o.owner, bookingId, "balance");
    expect(await status(bookingId)).toBe("fully_paid");

    await advanceDemoClock(c.admin, new Date("2026-12-13T15:30:00Z").getTime() - (await now()).getTime()); // Sun 13 Dec 22:30 WIB
    expect(await status(bookingId)).toBe("post_event_window");
    const [b] = await db()`select release_scheduled_at from bookings where id = ${bookingId}`;
    expect((b!.release_scheduled_at as Date).toISOString()).toBe("2026-12-17T03:00:00.000Z"); // Thu 17 Dec 10:00 WIB
    await advanceDemoClock(c.admin, 4 * DAY);
    expect(await status(bookingId)).toBe("settled");
    const ws = await bookingWorkspace(c.v.owner, bookingId);
    expect(ws.booking.settlement).toMatchObject({ venuePayable: 81_810_000, spotinRevenue: 10_530_000, commission: 8_100_000 });
    const bl = await balances(bookingId);
    expect(bl).toMatchObject({ held: 0, venue_payable: 81_810_000, spotin_commission: 8_100_000, spotin_fee: 2_430_000 });
    expect((await reconcile(bookingId)).ok).toBe(true);
    const doc = await PDFDocument.load(await statementPdf(bookingId));
    expect(doc.getKeywords()).toContain("PILOT");
    expect(await statementCsv(c.o.owner, bookingId)).toContain("81810000");
  });

  it("AC-M15/M16-5: a problem reported in the window holds release until an Admin resolves it", async () => {
    const c = await setup();
    const bookingId = await confirmed(c);
    await advanceDemoClock(c.admin, new Date("2026-11-20T03:00:00Z").getTime() - (await now()).getTime());
    await pay(c.o.owner, bookingId, "balance");
    await expect(reportProblem(c.o.owner, bookingId, "AC mati", [])).rejects.toMatchObject({ key: "problems.windowClosed" });
    await advanceDemoClock(c.admin, new Date("2026-12-14T01:00:00Z").getTime() - (await now()).getTime());
    await reportProblem(c.o.owner, bookingId, "AC mati sepanjang hari kedua", [{ name: "foto.png", bytes: await pngBytes() }]);
    await advanceDemoClock(c.admin, 4 * DAY); // past Thu 10:00
    expect(await status(bookingId)).toBe("on_hold");
    const [p] = await db()`select id from booking_problems where booking_id = ${bookingId}`;
    await expect(resolveProblem(c.o.owner, String(p!.id), { outcome: "release_as_is", note: "x" })).rejects.toThrow();
    await resolveProblem(c.admin, String(p!.id), { outcome: "adjusted", adjustment: 5_000_000, note: "Kompensasi AC" });
    expect(await status(bookingId)).toBe("settled");
    const bl = await balances(bookingId);
    expect(bl.held).toBe(0);
    expect(bl.refunds).toBe(5_000_000);
    expect((await reconcile(bookingId)).ok).toBe(true);
  });
});

describe("M28/M30/M31/M32/M36 event pages", () => {
  it("AC-1: one session per booked day with the booked times; capacity limited by the space; page needs a confirmed booking", async () => {
    const c = await setup(DAYS.slice(1));
    await expect(saveEventPage(c.o.owner, c.ev, pageInput(DAYS.slice(1)))).rejects.toMatchObject({ key: "eventPages.needsConfirmedBooking" });
    await confirmed(c, [{ ...LINES[0]!, quantity: 2 }]);
    await expect(saveEventPage(c.o.owner, c.ev, pageInput(DAYS.slice(1), 501))).rejects.toMatchObject({ key: "eventPages.capacityTooHigh" });
    await expect(saveEventPage(c.o.owner, c.ev, pageInput(DAYS.slice(1), 100, { sessions: [{ day: "2026-12-12", start: "08:00", end: "22:00", capacity: 100 }, { day: "2026-12-13", start: "10:00", end: "22:00", capacity: 100 }] }))).rejects.toMatchObject({ key: "eventPages.sessionOutsideBooking" });
    const { pageId } = await saveEventPage(c.o.owner, c.ev, pageInput(DAYS.slice(1)));
    await expect(publishEventPage(c.o.owner, pageId)).rejects.toMatchObject({ key: "eventPages.coverRequired" });
    const sessions = await db()`select day, starts_at, ends_at from event_sessions where page_id = ${pageId} order by day`;
    expect(sessions.map((s) => [(s.starts_at as Date).toISOString(), (s.ends_at as Date).toISOString()])).toEqual([
      ["2026-12-12T03:00:00.000Z", "2026-12-12T15:00:00.000Z"],
      ["2026-12-13T03:00:00.000Z", "2026-12-13T15:00:00.000Z"],
    ]);
    const [p] = await db()`select slug, status from event_pages where id = ${pageId}`;
    expect(await publicPage(String(p!.slug))).toBeNull(); // drafts aren't reachable
  });

  it("AC-4: capacity is atomic; one per email; 18+; IP limit; no ID questions; cancel frees; close and reopen", async () => {
    const c = await setup();
    await confirmed(c);
    expect(() => validateQuestions([{ id: "q1", kind: "text", label: "Nomor KTP Anda" }])).toThrow();
    await expect(saveEventPage(c.o.owner, c.ev, pageInput(DAYS, 100, { questions: [{ id: "q1", kind: "text", label: "NIK" }] }))).rejects.toMatchObject({ key: "eventPages.sensitiveQuestion" });
    const { slug, sessions, pageId } = await livePage(c, 2);
    await registerConfirmed(slug, sessions[0]!, "a@mail.id");
    const results = await Promise.allSettled([
      register({ slug, sessionId: sessions[0]!, name: "B", email: "b@mail.id", answers: {}, ageConfirmed: true, acceptedPilotNotice: true }),
      register({ slug, sessionId: sessions[0]!, name: "C", email: "c@mail.id", answers: {}, ageConfirmed: true, acceptedPilotNotice: true }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { key: "registration.full" } });
    await expect(register({ slug, sessionId: sessions[1]!, name: "A", email: "a@mail.id", answers: {}, ageConfirmed: false, acceptedPilotNotice: true })).rejects.toMatchObject({ key: "errors.ageRequired" });
    await register({ slug, sessionId: sessions[1]!, name: "A", email: "a@mail.id", answers: {}, ageConfirmed: true, acceptedPilotNotice: true });
    await expect(register({ slug, sessionId: sessions[1]!, name: "A", email: "A@mail.id", answers: {}, ageConfirmed: true, acceptedPilotNotice: true })).rejects.toMatchObject({ key: "registration.duplicate" });
    await db()`update event_sessions set capacity = 50 where id = ${sessions[2]!}`;
    for (let i = 0; i < 10; i++) await register({ slug, sessionId: sessions[2]!, name: `X${i}`, email: `x${i}@mail.id`, answers: {}, ageConfirmed: true, acceptedPilotNotice: true, ip: "9.9.9.9" }).catch(() => {});
    await expect(register({ slug, sessionId: sessions[2]!, name: "Y", email: "y@mail.id", answers: {}, ageConfirmed: true, acceptedPilotNotice: true, ip: "9.9.9.9" })).rejects.toMatchObject({ key: "errors.rateLimited" });

    // the attendee cancels and the spot is freed
    const [a] = await db()`select r.id, r.user_id from registrations r where email = 'a@mail.id' and session_id = ${sessions[0]!}`;
    await cancelOwnRegistration({ userId: String(a!.user_id) }, String(a!.id));
    expect(Number((await db()`select taken from event_sessions where id = ${sessions[0]!}`)[0]!.taken)).toBe(1);

    await setRegistrationOpen(c.o.owner, pageId, false);
    await expect(register({ slug, sessionId: sessions[0]!, name: "Z", email: "z@mail.id", answers: {}, ageConfirmed: true, acceptedPilotNotice: true })).rejects.toMatchObject({ key: "registration.closed" });
    await setRegistrationOpen(c.o.owner, pageId, true);
    await register({ slug, sessionId: sessions[0]!, name: "Z", email: "z@mail.id", answers: {}, ageConfirmed: true, acceptedPilotNotice: true });
  });

  it("AC-3: a time change with registrants asks for confirmation with the count and emails all; Live → Registration closed → Ended", async () => {
    const c = await setup();
    await confirmed(c);
    const { slug, sessions, pageId } = await livePage(c);
    for (let i = 0; i < 4; i++) await registerConfirmed(slug, sessions[0]!, `p${i}@mail.id`, `P ${i}`);
    const changed = pageInput(DAYS, 100, { sessions: DAYS.map((d) => ({ day: d.date, start: d.date === "2026-12-11" ? "12:00" : d.start, end: d.end, capacity: 100 })) });
    const first = await saveEventPage(c.o.owner, c.ev, changed);
    expect(first.needsConfirm).toBe(4);
    await db()`delete from email_outbox`;
    await saveEventPage(c.o.owner, c.ev, changed, { confirmNotify: true });
    expect((await db()`select count(*)::int as n from email_outbox where category = 'event_changed'`)[0]!.n).toBe(4);
    await advanceDemoClock(c.admin, new Date("2026-12-13T03:30:00Z").getTime() - (await now()).getTime());
    expect((await db()`select status from event_pages where id = ${pageId}`)[0]!.status).toBe("registration_closed");
    await advanceDemoClock(c.admin, DAY);
    expect((await db()`select status from event_pages where id = ${pageId}`)[0]!.status).toBe("ended");
  });

  it("AC-5/6/7: CSV Owner-only and logged; pass emailed and private; check-in, already used, undo within 5 minutes; cancelled pass", async () => {
    const c = await setup();
    await confirmed(c);
    const member = await makeUser(c.admin, "member@eo.id");
    await inviteMember(c.o.owner, c.o.orgId, "member@eo.id", "member");
    await acceptOrgInvite(member, tokenFrom(await lastLink("member@eo.id")));
    const { slug, sessions, pageId } = await livePage(c);
    const maya = await registerConfirmed(slug, sessions[0]!, "maya@mail.id", "Maya Anggraini");
    const joko = await registerConfirmed(slug, sessions[0]!, "joko@mail.id", "Joko Susilo");
    expect((await db()`select 1 from email_outbox where to_email = 'maya@mail.id' and category = 'pass_issued'`).length).toBe(1);
    expect(maya.token.length).toBeGreaterThanOrEqual(22);

    expect(await passView(maya.token, null)).toEqual({ role: "public", firstName: "Maya", title: "Tech Expo Desember" });
    expect((await passView(maya.token, maya.userId))!.role).toBe("holder");
    expect((await passView(maya.token, member.userId))!.role).toBe("organizer");

    await expect(attendeesCsv(member, pageId)).rejects.toThrow("permission_denied");
    await expect(cancelByOrganizer(member, String((await db()`select booking_id from event_pages where id = ${pageId}`)[0]!.booking_id), { reason: "x", expectedRefund: 0 })).rejects.toThrow("permission_denied");
    const csv = await attendeesCsv(c.o.owner, pageId);
    expect(csv).toContain("maya@mail.id");
    expect((await db()`select 1 from org_audit_log where action = 'attendees_exported'`).length).toBe(1);

    const [mp] = await db()`select id from passes where token = ${maya.token}`;
    await checkIn(member, String(mp!.id));
    await expect(checkIn(c.o.owner, String(mp!.id))).rejects.toMatchObject({ key: "checkin.already", values: { member: "member" } });
    await undoCheckIn(member, String(mp!.id));
    await checkIn(member, String(mp!.id));
    await setNow(new Date((await now()).getTime() + 6 * 60_000));
    await expect(undoCheckIn(member, String(mp!.id))).rejects.toMatchObject({ key: "checkin.undoExpired" });
    expect((await db()`select action from check_in_log order by id`).map((r) => r.action)).toEqual(["check_in", "undo", "check_in"]);

    const [jr] = await db()`select id from registrations where email = 'joko@mail.id'`;
    await organizerCancelRegistration(c.o.owner, String(jr!.id), "Sesi penuh, maaf");
    const [jp] = await db()`select id, status from passes where token = ${joko.token}`;
    expect(jp!.status).toBe("cancelled");
    await expect(checkIn(member, String(jp!.id))).rejects.toMatchObject({ key: "checkin.notValid" });
    const list = await attendees(c.o.owner, pageId, { q: "maya" });
    expect(list.rows.map((r) => r.pass_status)).toEqual(["checked_in"]);
  });

  it("AC-8: a reported page appears in the Admin queue; removing it emails registrants and makes it unavailable", async () => {
    const c = await setup();
    await confirmed(c);
    const { slug, sessions, pageId } = await livePage(c);
    await registerConfirmed(slug, sessions[0]!, "maya@mail.id");
    await report({ subjectType: "event_page", subjectId: pageId, reason: "spam", text: "Halaman palsu" });
    const [r] = await db()`select id from reports where subject_id = ${pageId} and status = 'open'`;
    await decideReport(c.admin, String(r!.id), "suspend_subject", "Konten melanggar");
    expect((await db()`select status from event_pages where id = ${pageId}`)[0]!.status).toBe("removed");
    expect((await db()`select 1 from email_outbox where to_email = 'maya@mail.id' and category = 'event_removed'`).length).toBe(1);
  });
});

describe("M22 dashboards, M26 help, M24 ledger, M1 deletion", () => {
  it("AC-M21/M22-3: pipeline columns and overdue badges; this week; counts match the rows; organizer next action", async () => {
    const c = await setup();
    const sari = await makeOrganizer(c.admin, "sari@k.id", "Sari");
    const evS = await createEvent(sari.owner, { name: "Bazar", type: "bazaar", category: "food", expectedAttendance: 100, days: [{ date: "2026-12-20", start: "10:00", end: "20:00" }] });
    await sendEnquiries(sari.owner, evS, [c.v.spaceId]);
    const bookingId = await confirmed(c);
    await setNow(new Date("2026-11-10T03:00:00Z")); // Sari's enquiry is now overdue
    const pipe = await venuePipeline(c.v.owner);
    expect(pipe.map((p) => [p.eventName, p.column, p.overdue])).toEqual([
      ["Bazar", "new", true],
      ["Tech Expo", "confirmed", false],
    ]);
    const counts = await venueCounts(c.v.owner, "2026-11-01", "2026-11-30");
    expect(counts).toMatchObject({ enquiries: 2, quotes: 1, bookings: 1, conversionPct: 50, revenue: 89_910_000 });
    expect(counts.rows.length).toBe(counts.enquiries);
    await advanceDemoClock(c.admin, new Date("2026-12-07T03:00:00Z").getTime() - (await now()).getTime());
    const week = await venueThisWeek(c.v.owner);
    expect(week.events.map((e) => String(e.id))).toEqual([bookingId]);
    expect(week.balances.length).toBe(1);
    const evs = await organizerEventDashboard(c.o.owner);
    expect(evs[0]!.nextAction).toBe("payBalance");
  });

  it("AC-M24/M25/M26-3 / -5: an altered ledger is flagged; Hubungi kami reaches the Admins with the booking linked", async () => {
    const c = await setup();
    const bookingId = await confirmed(c);
    expect((await reconcile(bookingId)).ok).toBe(true);
    await db().unsafe(`alter table ledger_entries disable trigger user`);
    await db()`update ledger_entries set amount = amount - 1 where booking_id = ${bookingId}`;
    await db().unsafe(`alter table ledger_entries enable trigger user`);
    expect((await reconcile(bookingId)).ok).toBe(false);
    await contactUs(c.o.owner, { subjectType: "booking", subjectId: bookingId, text: "Bagaimana cara membatalkan?" });
    const [m] = await db()`select text_body from email_outbox where to_email = 'admin@spot-in.test' and category = 'contact_message'`;
    expect(String(m!.text_body)).toContain(bookingId);
    const other = await makeOrganizer(c.admin, "other@eo.id", "Other");
    await expect(contactUs(other.owner, { subjectType: "booking", subjectId: bookingId, text: "hi" })).rejects.toThrow("permission_denied");
  });

  it("AC-M1-6: the only Owner of an organization with an active booking can't delete their account", async () => {
    const c = await setup();
    await confirmed(c);
    expect(await deletionBlockers(c.o.owner.userId)).toEqual(["Rina EO"]);
  });
});

describe("M6 buffer, M21 notifications, M14 adapter", () => {
  it("AC-M6-5: with a 4-hour buffer, quoting an hourly booking 2 hours after another ends is blocked", async () => {
    const c = await setup([{ date: "2026-12-12", start: "16:00", end: "20:00" }]);
    await db()`update spaces set buffer_hours = 4 where id = ${c.v.spaceId}`;
    await db()`update rate_cards set unit = 'hour' where space_id = ${c.v.spaceId}`;
    const sari = await makeOrganizer(c.admin, "sari@k.id", "Sari");
    const evS = await createEvent(sari.owner, { name: "Pagi", type: "workshop", category: "tech", expectedAttendance: 50, days: [{ date: "2026-12-12", start: "10:00", end: "14:00" }] });
    const [eqS] = await sendEnquiries(sari.owner, evS, [c.v.spaceId]);
    const qS = await draftQuote(c.v.owner, eqS!);
    await updateDraft(c.v.owner, qS, { lines: [{ ...LINES[0]!, quantity: 4, unitPrice: 1_000_000 }], schedule: SPLIT, validityDays: 7, cancellationPolicy: "moderate" });
    await submitQuote(c.v.owner, qS);
    await acceptQuote(sari.owner, qS, { acceptPilotTerms: true });
    const q = await draftQuote(c.v.owner, c.enquiryId);
    await updateDraft(c.v.owner, q, { lines: [{ ...LINES[0]!, quantity: 4, unitPrice: 1_000_000 }], schedule: SPLIT, validityDays: 7, cancellationPolicy: "moderate" });
    await expect(submitQuote(c.v.owner, q)).rejects.toMatchObject({ key: "quotes.bufferViolated" });
  });

  it("AC-M21/M22-1: a new enquiry notifies venue members in-app and by email with a link; 'payment due' ignores the email opt-out", async () => {
    const c = await setup();
    const [n] = await db()`select link from notifications n join users u on u.id = n.user_id where u.email = 'budi@venue.id' and n.event = 'enquiry_new'`;
    expect(String(n!.link)).toContain(c.enquiryId);
    expect((await db()`select 1 from email_outbox where to_email = 'budi@venue.id' and category = 'enquiry_new'`).length).toBe(1);
    await db()`update users set notification_prefs = '{"emailOptional": false}' where email = 'rina@eo.id'`;
    const bookingId = await confirmed(c);
    await db()`delete from email_outbox`;
    await advanceDemoClock(c.admin, new Date("2026-11-20T03:00:00Z").getTime() - (await now()).getTime());
    expect((await db()`select 1 from email_outbox where to_email = 'rina@eo.id' and category = 'payment_due'`).length).toBeGreaterThan(0);
    void bookingId;
  });

  it("AC-M14-4: the simulator produces pending, paid, expired and failed through the adapter interface", async () => {
    const c = await setup();
    const id = await draftQuote(c.v.owner, c.enquiryId);
    await updateDraft(c.v.owner, id, { lines: LINES, schedule: SPLIT, validityDays: 7, cancellationPolicy: "moderate" });
    await submitQuote(c.v.owner, id);
    const bookingId = await acceptQuote(c.o.owner, id, { acceptPilotTerms: true });
    const [r] = await db()`select id from payment_requests where booking_id = ${bookingId}`;
    const states: string[] = [];
    for (const outcome of ["failed", "expired", "paid"] as const) {
      const pid = await startPayment(c.o.owner, String(r!.id), outcome === "expired" ? "test_qris" : outcome === "failed" ? "test_card" : "test_va");
      states.push(String((await db()`select status from payments where id = ${pid}`)[0]!.status));
      await simulatePayment(c.o.owner, pid, outcome);
      states.push(String((await db()`select status from payments where id = ${pid}`)[0]!.status));
    }
    expect(states).toEqual(["pending", "failed", "pending", "expired", "pending", "paid"]);
  });
});
