import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetData, setNow } from "./helpers";
import { makeAdmin, makeUser, makeVenue, makeOrganizer, pngBytes, addElectricity } from "./factories";
import { createOrganization } from "@/server/orgs";
import {
  saveProperty, createSpace, setRateCard, addSpacePhotos, submitSpace, propertyOfVenue, duplicateSpace, quickEstimate, addSeason,
  saveAddOn, setTaxSettings, updateSpace, setPublished,
} from "@/server/listings";
import { approveSpace, verifyOrganization, spaceReviewQueue, verificationQueue, setSuspended, adminSearch, adminAuditLog, rejectSpace, updateSetting, overdueReviewItems, advanceDemoClock, addHoliday } from "@/server/admin";
import { blockDates, venueCalendar, publicAvailability, placeTentativeHold, releaseTentativeHold } from "@/server/calendar";
import { createEvent, sendEnquiries } from "@/server/enquiries";
import { searchSpaces } from "@/server/search";
import { tick } from "@/lib/jobs";
import { getSettings } from "@/lib/settings";

beforeEach(async () => {
  await resetData();
  await setNow(new Date("2026-11-09T02:00:00Z"));
});

describe("M3/M4/M5 listings and verification", () => {
  it("AC-M4/M5-1: pin required to submit; time zone prefilled from the pin; one level of spaces", async () => {
    const admin = await makeAdmin();
    const u = await makeUser(admin, "made@bali.id");
    await createOrganization(u, { kind: "venue_operator", displayName: "Bali Hall" });
    await saveProperty(u, { name: "Bali Hall", type: "hall", addressText: "Jl. Raya", city: "Denpasar", lat: -8.65, lon: 115.21 });
    const { property } = await propertyOfVenue(u);
    expect(property!.timezone).toBe("Asia/Makassar");
    const id = await createSpace(u, { name: "Hall", type: "event_hall" });
    await setRateCard(u, id, { unit: "day", weekdayPrice: 5_000_000, showFullRateCard: true });
    await addSpacePhotos(u, id, [{ name: "a.png", bytes: await pngBytes() }]);
    await db()`update properties set geo = null`;
    await expect(submitSpace(u, id)).rejects.toMatchObject({ key: "listings.pinRequired" });
    const cols = (await db()`select column_name from information_schema.columns where table_name = 'spaces'`).map((c) => String(c.column_name));
    expect(cols.some((c) => /parent|setup|dismantle/.test(c))).toBe(false);
  });

  it("AC-M4/M5-2: the 16th photo is refused; photos are stored as WebP", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const many = await Promise.all(Array.from({ length: 14 }, (_, i) => pngBytes(i % 2 ? "#ff0000" : "#00ff00")));
    await addSpacePhotos(v.owner, v.spaceId, many.map((bytes, i) => ({ name: `p${i}.png`, bytes })));
    await expect(addSpacePhotos(v.owner, v.spaceId, [{ name: "p16.png", bytes: await pngBytes() }])).rejects.toMatchObject({ key: "listings.tooManyPhotos" });
    const mimes = await db()`select distinct mime from files where purpose = 'space_photo'`;
    expect(mimes.map((m) => m.mime)).toEqual(["image/webp"]);
  });

  it("AC-M3-1: an unverified operator can't publish; verification records method and date, no documents", async () => {
    const admin = await makeAdmin();
    const u = await makeUser(admin, "budi@venue.id");
    const orgId = await createOrganization(u, { kind: "venue_operator", displayName: "Mall A" });
    await saveProperty(u, { name: "Mall A", type: "mall", addressText: "Jl. 1", city: "Jakarta Selatan", lat: -6.23, lon: 106.8 });
    const id = await createSpace(u, { name: "Atrium", type: "atrium" });
    await setRateCard(u, id, { unit: "day", weekdayPrice: 10_000_000, showFullRateCard: true });
    await addSpacePhotos(u, id, [{ name: "a.png", bytes: await pngBytes() }]);
    await submitSpace(u, id);
    expect((await verificationQueue()).map((o) => o.id)).toContain(orgId);
    expect((await spaceReviewQueue()).map((s) => s.id)).toContain(id);
    await expect(approveSpace(admin, id)).rejects.toMatchObject({ key: "listings.operatorNotVerified" });
    await verifyOrganization(admin, orgId, { method: "call", note: "Telepon dengan Budi" });
    const [o] = await db()`select verification_status, verified_by_spotin_at, verification_method from organizations where id = ${orgId}`;
    expect(o).toMatchObject({ verification_status: "verified", verification_method: "call" });
    expect(o!.verified_by_spotin_at).not.toBeNull();
    await approveSpace(admin, id);
    const res = await searchSpaces({ city: "Jakarta Selatan" });
    expect(res.rows.find((r) => r.id === id)!.verified).toBe(true);
  });

  it("AC-M4/M5-4: draft → in review (not searchable) → published; price changes live; duplicate is a draft", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const copy = await duplicateSpace(v.owner, v.spaceId);
    expect((await db()`select status from spaces where id = ${copy}`)[0]!.status).toBe("draft");
    await addSpacePhotos(v.owner, copy, [{ name: "a.png", bytes: await pngBytes() }]);
    await submitSpace(v.owner, copy);
    expect((await searchSpaces({})).rows.map((r) => r.id)).not.toContain(copy);
    await approveSpace(admin, copy);
    expect((await searchSpaces({})).rows.map((r) => r.id)).toContain(copy);
    await setRateCard(v.owner, copy, { unit: "day", weekdayPrice: 30_000_000, showFullRateCard: false, fromPrice: 28_000_000 });
    expect(Number((await searchSpaces({})).rows.find((r) => r.id === copy)!.from_price)).toBe(28_000_000);
    await setPublished(v.owner, copy, false);
    expect((await searchSpaces({})).rows.map((r) => r.id)).not.toContain(copy);
    await setPublished(v.owner, copy, true);
    expect((await searchSpaces({})).rows.map((r) => r.id)).toContain(copy);
  });

  it("AC-M4/M5-5: estimate uses weekday/weekend/season rates, mandatory add-ons, PPN only for PKP", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    await setRateCard(v.owner, v.spaceId, { unit: "day", weekdayPrice: 20_000_000, weekendPrice: 25_000_000, showFullRateCard: true });
    await addSeason(v.owner, v.spaceId, { name: "Akhir tahun", startDate: "2026-12-27", endDate: "2026-12-31", price: 30_000_000 });
    await saveAddOn(v.owner, { name: "Kebersihan", unit: "per_day", price: 1_000_000, taxable: true, mandatory: true });
    const days = ["2026-12-25", "2026-12-26", "2026-12-27", "2026-12-28"].map((date) => ({ date, start: "10:00", end: "21:00" })); // Fri, Sat, Sun(season), Mon(season)
    let r = await quickEstimate(v.spaceId, { days, addOnIds: [] });
    expect(r.lines.filter((l) => l.kind === "rental").map((l) => l.unitPrice)).toEqual([20_000_000, 25_000_000, 30_000_000, 30_000_000]);
    expect(r.lines.find((l) => l.label === "Kebersihan")!.amount).toBe(4_000_000);
    expect(r.ppn).toBe(0);
    await setTaxSettings(v.owner, { isPkp: true, serviceChargeBps: 0 });
    r = await quickEstimate(v.spaceId, { days, addOnIds: [] });
    expect(r.ppn).toBe(Math.round((105_000_000 + 4_000_000) * 0.11));
  });

  it("AC-M4/M5-3 (enquiry part): the enquiry requires answers to the space's questions", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    await updateSpace(v.owner, v.spaceId, { name: "Grand Hall", type: "event_hall", capacities: { standing: 500 }, enquiryQuestions: ["Produk apa yang dijual?", "Perlu loading malam?"] });
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 300, days: [{ date: "2026-12-14", start: "10:00", end: "20:00" }] });
    await expect(sendEnquiries(o.owner, ev, [v.spaceId], { [v.spaceId]: { q1: "Gadget" } })).rejects.toMatchObject({ key: "enquiries.answerRequired" });
    const [id] = await sendEnquiries(o.owner, ev, [v.spaceId], { [v.spaceId]: { q1: "Gadget", q2: "Ya" } });
    expect((await db()`select answers from enquiries where id = ${id!}`)[0]!.answers).toEqual({ q1: "Gadget", q2: "Ya" });
  });
});

describe("M6 calendar and holds", () => {
  it("AC-M6-1: venue sees each state, organizer sees Unavailable / Limited; weekly blocks repeat", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const n = await blockDates(v.owner, v.spaceId, { from: "2026-11-16", to: "2026-11-16", reason: "Maintenance", weeklyUntil: "2026-12-14" });
    expect(n).toBe(5);
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: [{ date: "2026-11-18", start: "10:00", end: "20:00" }] });
    const [q] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    await placeTentativeHold(v.owner, q!);
    const venue = await venueCalendar(v.owner, v.spaceId, "2026-11-16", "2026-11-30");
    const st = Object.fromEntries(venue.days.map((d) => [d.date, d.state]));
    expect(st["2026-11-16"]).toBe("block");
    expect(st["2026-11-23"]).toBe("block");
    expect(st["2026-11-18"]).toBe("tentative_hold");
    expect(st["2026-11-17"]).toBe("available");
    const pub = Object.fromEntries((await publicAvailability(v.spaceId, "2026-11-16", "2026-11-30")).map((d) => [d.date, d.state]));
    expect(pub["2026-11-16"]).toBe("unavailable");
    expect(pub["2026-11-18"]).toBe("limited");
  });

  it("AC-M6-3: tentative hold notifications, expiry on the app clock, one hold per date range", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const sari = await makeOrganizer(admin, "sari@komunitas.id", "Komunitas Sari");
    const days = [{ date: "2026-12-14", start: "10:00", end: "20:00" }];
    const ev1 = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days });
    const ev2 = await createEvent(sari.owner, { name: "Bazar", type: "bazaar", category: "food", expectedAttendance: 100, days });
    const [q1] = await sendEnquiries(o.owner, ev1, [v.spaceId]);
    const [q2] = await sendEnquiries(sari.owner, ev2, [v.spaceId]);
    const { postMessage } = await import("@/server/messaging");
    await postMessage(v.owner, q1!, { body: "Tanggal tersedia, kami tahan dulu." }); // a reply keeps the enquiry open
    await postMessage(v.owner, q2!, { body: "Tanggal sedang ditahan." });
    await placeTentativeHold(v.owner, q1!, 5);
    await expect(placeTentativeHold(v.owner, q2!)).rejects.toMatchObject({ key: "calendar.holdConflict" });
    await expect(placeTentativeHold(v.owner, q1!)).rejects.toMatchObject({ key: "calendar.holdExists" });
    await expect(placeTentativeHold(v.owner, q2!, 15)).rejects.toMatchObject({ key: "calendar.holdDaysInvalid" });
    const events = async () => (await db()`select event from notifications where user_id = ${o.owner.userId} and event like 'hold_%' order by created_at`).map((r) => r.event);
    expect(await events()).toEqual(["hold_placed"]);
    await advanceDemoClock(admin, 4 * 86_400_000 + 3600_000); // +4d1h: inside the last 24 h
    expect(await events()).toEqual(["hold_placed", "hold_expiring"]);
    await advanceDemoClock(admin, 86_400_000);
    expect(await events()).toEqual(["hold_placed", "hold_expiring", "hold_expired"]);
    expect((await publicAvailability(v.spaceId, "2026-12-14", "2026-12-14"))[0]!.state).toBe("available");
    await placeTentativeHold(v.owner, q2!); // free again
    await releaseTentativeHold(v.owner, q2!);
  });

  it("FR-M6-07: concurrent holds on the same dates — exactly one succeeds", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const staff = v.owner;
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      const o = await makeOrganizer(admin, `eo${i}@eo.id`, `EO ${i}`);
      const ev = await createEvent(o.owner, { name: `Expo ${i}`, type: "exhibition", category: "tech", expectedAttendance: 100, days: [{ date: "2026-12-14", start: "10:00", end: "20:00" }, { date: "2026-12-15", start: "10:00", end: "20:00" }] });
      ids.push((await sendEnquiries(o.owner, ev, [v.spaceId]))[0]!);
    }
    const results = await Promise.allSettled(ids.map((id) => placeTentativeHold(staff, id)));
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason.key === "calendar.holdConflict")).toBe(true);
  });

  it("FR-M6-03 / §12.1: blocks can't overlap a hold until it is released", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: [{ date: "2026-12-14", start: "10:00", end: "20:00" }] });
    const [q] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    await placeTentativeHold(v.owner, q!);
    await expect(blockDates(v.owner, v.spaceId, { from: "2026-12-13", to: "2026-12-15" })).rejects.toMatchObject({ key: "calendar.blockOverlaps" });
    await releaseTentativeHold(v.owner, q!);
    await expect(blockDates(v.owner, v.spaceId, { from: "2026-12-13", to: "2026-12-15" })).resolves.toBe(1);
  });
});

describe("M24 admin", () => {
  it("AC-M24/M25/M26-1: queues, reject with reason, suspend/unsuspend, search, audit log", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const copy = await duplicateSpace(v.owner, v.spaceId);
    await addSpacePhotos(v.owner, copy, [{ name: "a.png", bytes: await pngBytes() }]);
    await submitSpace(v.owner, copy);
    await expect(rejectSpace(admin, copy, "")).rejects.toMatchObject({ key: "errors.reasonRequired" });
    await rejectSpace(admin, copy, "Foto kurang jelas");
    expect((await db()`select status, review_reason from spaces where id = ${copy}`)[0]).toMatchObject({ status: "draft", review_reason: "Foto kurang jelas" });
    await setSuspended(admin, { type: "space", id: v.spaceId }, true, "Laporan pengguna");
    expect((await searchSpaces({})).rows.map((r) => r.id)).not.toContain(v.spaceId);
    await setSuspended(admin, { type: "space", id: v.spaceId }, false, "");
    const found = await adminSearch("budi@venue");
    expect(found.users.length).toBe(1);
    expect((await adminSearch("Mall A")).orgs.length).toBe(1);
    const log = (await adminAuditLog()).map((l) => l.action);
    expect(log).toEqual(expect.arrayContaining(["space.rejected", "space.suspended", "space.unsuspended", "org.verified", "space.approved", "pilot_invite.created"]));
  });

  it("AC-M24/M25/M26-2 (settings + daily email): settings change, items waiting > 2 business days", async () => {
    const admin = await makeAdmin();
    await updateSetting(admin, "organizer_fee_bps", 400);
    expect((await getSettings()).organizer_fee_bps).toBe(400);
    await expect(updateSetting(admin, "organizer_fee_bps", -1)).rejects.toMatchObject({ key: "errors.amountInvalid" });
    const u = await makeUser(admin, "budi@venue.id");
    const orgId = await createOrganization(u, { kind: "venue_operator", displayName: "Mall A" });
    const { submitForVerification } = await import("@/server/orgs");
    await submitForVerification(u, orgId); // Monday 09:00 WIB
    expect((await overdueReviewItems(new Date("2026-11-11T16:00:00Z"))).orgs.length).toBe(0); // Wed 23:00
    expect((await overdueReviewItems(new Date("2026-11-11T17:30:00Z"))).orgs.length).toBe(1); // Thu 00:30
    const { scheduleDailyAdminReminder } = await import("@/server/admin");
    await scheduleDailyAdminReminder(new Date("2026-11-09T02:00:00Z"));
    await advanceDemoClock(admin, 3 * 86_400_000);
    const mails = await db()`select subject from email_outbox where to_email = 'admin@spot-in.test' and category = 'admin_daily_reminder'`;
    expect(mails.length).toBeGreaterThanOrEqual(1);
  });

  it("FR-M24-11: holiday calendar is editable and used by deadlines", async () => {
    const admin = await makeAdmin();
    await addHoliday(admin, "2026-11-10", "Libur uji", "national");
    const v = await makeVenue(admin, "budi@venue.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: [{ date: "2026-12-14", start: "10:00", end: "20:00" }] });
    const [q] = await sendEnquiries(o.owner, ev, [v.spaceId]); // Monday 09:00; Tuesday is a holiday
    const [row] = await db()`select response_deadline_at from enquiries where id = ${q!}`;
    expect((row!.response_deadline_at as Date).toISOString()).toBe("2026-11-12T16:59:00.000Z"); // Thursday 23:59 WIB
  });
});

describe("helpers", () => {
  it("tick processes nothing when no jobs are due", async () => {
    expect(await tick()).toBe(0);
    void addElectricity;
  });
});
