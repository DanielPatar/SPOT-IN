import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetData, setNow } from "./helpers";
import { makeAdmin, makeUser, makeVenue, makeOrganizer, pngBytes } from "./factories";
import { searchSpaces, publicProperty, createShortlist, addToShortlist, createShareLink, sharedShortlist, revokeShareLink, shortlistDetail } from "@/server/search";
import { blockDates, placeTentativeHold } from "@/server/calendar";
import { createEvent, sendEnquiries, declineEnquiry, withdrawEnquiry, saveInternalNotes, enquiryForActor, venueInbox, eventDetail, requestInfo, markViewed } from "@/server/enquiries";
import { postMessage, listMessages, editMessage, deleteMessage, reportMessage, saveSavedReply, savedReplies } from "@/server/messaging";
import { advanceDemoClock, addHoliday, reportsQueue } from "@/server/admin";
import { createOrganization } from "@/server/orgs";
import { saveProperty, createSpace, setRateCard, addSpacePhotos, submitSpace } from "@/server/listings";
import { approveSpace, verifyOrganization } from "@/server/admin";
import { MASK } from "@/lib/masking";

beforeEach(async () => {
  await resetData();
  await setNow(new Date("2026-11-09T02:00:00Z"));
});

const DAYS = [
  { date: "2026-12-12", start: "10:00", end: "22:00" },
  { date: "2026-12-13", start: "10:00", end: "22:00" },
  { date: "2026-12-14", start: "10:00", end: "22:00" },
];

describe("M7/M8 search and shortlists", () => {
  it("AC-M7/M8-1: dates exclude booked/blocked (held only with the toggle), filters, distance sort", async () => {
    const admin = await makeAdmin();
    const a = await makeVenue(admin, "a@v.id", { name: "Mall A", spaceName: "Hall A", lat: -6.2297, lon: 106.8, powerKva: 40, activities: ["fnb_sampling"] });
    const b = await makeVenue(admin, "b@v.id", { name: "Mall B", spaceName: "Hall B", lat: -6.26, lon: 106.78, powerKva: 20, activities: [] });
    const c = await makeVenue(admin, "c@v.id", { name: "Mall C", spaceName: "Hall C", lat: -6.3, lon: 106.82, powerKva: 60, activities: ["fnb_sampling"] });
    await blockDates(b.owner, b.spaceId, { from: "2026-12-13", to: "2026-12-13" });
    const o = await makeOrganizer(admin, "sari@k.id", "Sari");
    const ev = await createEvent(o.owner, { name: "Bazar", type: "bazaar", category: "food", expectedAttendance: 100, days: DAYS });
    const [q] = await sendEnquiries(o.owner, ev, [c.spaceId]);
    await postMessage(c.owner, q!, { body: "Bisa." });
    await placeTentativeHold(c.owner, q!);
    const dates = DAYS.map((d) => d.date);
    let ids = (await searchSpaces({ dates })).rows.map((r) => r.id);
    expect(ids).toEqual([a.spaceId]);
    const withLimited = await searchSpaces({ dates, showLimited: true });
    expect(withLimited.rows.map((r) => r.id).sort()).toEqual([a.spaceId, c.spaceId].sort());
    expect(withLimited.rows.find((r) => r.id === c.spaceId)!.limited).toBe(true);
    ids = (await searchSpaces({ minPowerKva: 30, activities: ["fnb_sampling"] })).rows.map((r) => r.id);
    expect(ids.sort()).toEqual([a.spaceId, c.spaceId].sort());
    const near = await searchSpaces({ near: { lat: -6.301, lon: 106.821 }, sort: "distance" });
    expect(near.rows.map((r) => r.id)).toEqual([c.spaceId, b.spaceId, a.spaceId]);
    expect(Number(near.rows[0]!.distance_m)).toBeLessThan(500);
    expect((await searchSpaces({ attendance: 501 })).total).toBe(0);
    expect((await searchSpaces({ budgetMax: 20_000_000 })).total).toBe(0);
  });

  it("AC-M7/M8-2: typo-tolerant 'aul jaksel' finds halls in Jakarta Selatan; property page lists its spaces", async () => {
    const admin = await makeAdmin();
    const a = await makeVenue(admin, "a@v.id", { name: "Mall A", spaceName: "Grand Ballroom", city: "Jakarta Selatan" });
    await makeVenue(admin, "b@v.id", { name: "Mall B", spaceName: "Grand Ballroom B", city: "Jakarta Barat", area: "Kebon Jeruk" });
    await makeVenue(admin, "c@v.id", { name: "Mall C", spaceName: "Atrium Utama", spaceType: "atrium", city: "Jakarta Selatan" });
    for (const q of ["aula jaksel", "aul jaksel", "hall jakarta selatan", "ballrom jaksel"]) {
      const ids = (await searchSpaces({ q })).rows.map((r) => r.id);
      expect(ids, q).toEqual([a.spaceId]);
    }
    const [row] = await db()`select property_id from spaces where id = ${a.spaceId}`;
    const p = await publicProperty(String(row!.property_id));
    expect(p.spaces.map((s) => s.id)).toEqual([a.spaceId]);
  });

  it("AC-M7/M8-3: share link shows spaces, notes and prices; revoked link is gone; enquiry from the shortlist", async () => {
    const admin = await makeAdmin();
    const a = await makeVenue(admin, "a@v.id", { name: "Mall A", spaceName: "Hall A" });
    const b = await makeVenue(admin, "b@v.id", { name: "Mall B", spaceName: "Hall B" });
    const o = await makeOrganizer(admin, "rina@eo.id");
    const list = await createShortlist(o.owner, "Expo Desember");
    await addToShortlist(o.owner, list, a.spaceId, "Favorit klien");
    await addToShortlist(o.owner, list, b.spaceId);
    const token = await createShareLink(o.owner, list);
    const shared = await sharedShortlist(token);
    expect(shared!.items.map((i) => [i.name, i.note, Number(i.from_price)])).toEqual([["Hall A", "Favorit klien", 25_000_000], ["Hall B", null, 25_000_000]]);
    expect(Object.keys(shared!.items[0]!)).not.toContain("internal_notes");
    const { links } = await shortlistDetail(o.owner, list);
    await revokeShareLink(o.owner, list, String(links[0]!.id));
    expect(await sharedShortlist(token)).toBeNull();
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 300, days: DAYS });
    const ids = await sendEnquiries(o.owner, ev, [a.spaceId]); // selected spaces of the shortlist
    expect(ids.length).toBe(1);
  });
});

describe("M9 enquiries", () => {
  it("AC-M9/M10-1: one send → independent threads with deadlines; limits; files", async () => {
    const admin = await makeAdmin();
    const venues = [];
    for (let i = 0; i < 6; i++) venues.push(await makeVenue(admin, `v${i}@v.id`, { name: `Mall ${i}`, spaceName: `Hall ${i}` }));
    const o = await makeOrganizer(admin, "rina@eo.id");
    const pdf = Buffer.from("%PDF-1.4\n% test proposal\n");
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(10 * 1024 * 1024 + 1)]);
    await expect(createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 300, days: DAYS }, [{ name: "big.pdf", bytes: big }])).rejects.toMatchObject({ key: "files.tooLarge" });
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 300, days: DAYS }, [
      { name: "deck.pdf", bytes: pdf },
      { name: "layout.png", bytes: await pngBytes() },
    ]);
    await expect(sendEnquiries(o.owner, ev, venues.map((v) => v.spaceId))).rejects.toMatchObject({ key: "enquiries.limitPerSend" });
    const ids = await sendEnquiries(o.owner, ev, venues.slice(0, 3).map((v) => v.spaceId));
    expect(ids.length).toBe(3);
    const threads = await db()`select count(distinct t.id)::int as n from threads t where t.enquiry_id in ${db()(ids)}`;
    expect(threads[0]!.n).toBe(3);
    for (let i = 0; i < 3; i++) {
      const { enquiry } = await enquiryForActor(venues[i]!.owner, ids[i]!);
      expect(enquiry.response_deadline_at).toBeInstanceOf(Date);
      const files = await eventDetail(o.owner, ev);
      expect(files.files.length).toBe(2);
      await expect(enquiryForActor(venues[(i + 1) % 3]!.owner, ids[i]!)).rejects.toThrow("permission_denied");
    }
    // 10 open enquiries per event
    const more = [];
    for (let i = 6; i < 14; i++) more.push(await makeVenue(admin, `v${i}@v.id`, { name: `Mall ${i}`, spaceName: `Hall ${i}` }));
    await sendEnquiries(o.owner, ev, [...venues.slice(3, 6), ...more.slice(0, 2)].map((v) => v.spaceId));
    await sendEnquiries(o.owner, ev, more.slice(2, 4).map((v) => v.spaceId)); // 10 open now
    await expect(sendEnquiries(o.owner, ev, [more[4]!.spaceId])).rejects.toMatchObject({ key: "enquiries.limitOpenPerEvent" });
  });

  it("AC-M9/M10-2: attendance above capacity warns but sends", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "a@v.id", { capacity: 200 });
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 300, days: DAYS });
    const [id] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    expect((await db()`select warnings from enquiries where id = ${id!}`)[0]!.warnings).toContain("above_capacity");
  });

  it("AC-M9/M10-3: Friday 16:00 WIB, Monday holiday → expires Wednesday 23:59 with reminders at Tue 23:59 and Wed 19:59", async () => {
    const admin = await makeAdmin();
    await addHoliday(admin, "2026-12-14", "Libur uji", "national");
    const v = await makeVenue(admin, "a@v.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: [{ date: "2027-01-20", start: "10:00", end: "20:00" }] });
    await setNow(new Date("2026-12-11T09:00:00Z")); // Friday 16:00 WIB
    const [id] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    const jobs = await db()`select kind, run_at, payload from jobs where unique_key like ${"enquiry:" + id + "%"} order by run_at`;
    expect(jobs.map((j) => [j.kind, (j.run_at as Date).toISOString()])).toEqual([
      ["enquiry.reminder", "2026-12-15T16:59:00.000Z"], // Tue 23:59 WIB
      ["enquiry.reminder", "2026-12-16T12:59:00.000Z"], // Wed 19:59 WIB
      ["enquiry.expire", "2026-12-16T16:59:00.000Z"], // Wed 23:59 WIB
    ]);
    await setNow(new Date("2026-12-16T16:58:00Z"));
    await advanceDemoClock(admin, 30_000); // 23:58:30
    expect((await db()`select status from enquiries where id = ${id!}`)[0]!.status).toBe("submitted");
    await advanceDemoClock(admin, 31_000); // 23:59:01
    expect((await db()`select status from enquiries where id = ${id!}`)[0]!.status).toBe("expired");
    const n = await db()`select event from notifications where user_id = ${o.owner.userId} and event = 'enquiry_expired'`;
    expect(n.length).toBe(1);
    const venueMails = await db()`select category from email_outbox where to_email = 'a@v.id' and category = 'enquiry_deadline_approaching'`;
    expect(venueMails.length).toBe(2);
  });

  it("AC-M9/M10-4: decline needs a reason; withdraw notifies the venue; notes are venue-only", async () => {
    const admin = await makeAdmin();
    const a = await makeVenue(admin, "a@v.id", { name: "Mall A", spaceName: "Hall A" });
    const b = await makeVenue(admin, "b@v.id", { name: "Mall B", spaceName: "Hall B" });
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: DAYS });
    const [qa, qb] = await sendEnquiries(o.owner, ev, [a.spaceId, b.spaceId]);
    await expect(declineEnquiry(a.owner, qa!, "")).rejects.toMatchObject({ key: "enquiries.declineReasonRequired" });
    await declineEnquiry(a.owner, qa!, "capacity");
    const detail = await eventDetail(o.owner, ev);
    expect(detail.enquiries.find((e) => e.id === qa)!).toMatchObject({ status: "declined", decline_reason: "capacity" });
    await saveInternalNotes(b.owner, qb!, "Klien besar, prioritaskan");
    const orgView = (await enquiryForActor(o.owner, qb!)).enquiry;
    expect(orgView.internal_notes).toBe("Klien besar, prioritaskan"); // raw row; the organizer page never renders it
    await withdrawEnquiry(o.owner, qb!);
    expect((await db()`select event from notifications where user_id = ${b.owner.userId} and event = 'enquiry_withdrawn'`).length).toBe(1);
    await expect(saveInternalNotes(o.owner, qb!, "x")).rejects.toThrow("permission_denied");
  });
});

describe("M10 messaging", () => {
  it("AC-M9/M10-5: contact masking in messages before confirmation", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "a@v.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: DAYS });
    const [q] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    for (const s of ["hubungi 0812-3456-7890", "a@b.co", "wa.me/6281234567890", "1234567890"]) {
      const r = await postMessage(o.owner, q!, { body: s });
      expect(r.masked, s).toBe(true);
    }
    for (const s of ["Rp 25.000.000", "300 m²", "12/12/2026"]) {
      const r = await postMessage(o.owner, q!, { body: s });
      expect(r.masked, s).toBe(false);
    }
    const venueView = await listMessages(v.owner, q!);
    expect(venueView.messages.slice(0, 4).every((m) => m.body!.includes(MASK))).toBe(true);
    expect(venueView.messages.some((m) => m.body!.includes("0812"))).toBe(false);
    const mine = await listMessages(o.owner, q!);
    expect(mine.messages[0]!.wasMasked).toBe(true); // the sender sees a notice
    expect((await db()`select 1 from email_outbox where to_email = 'admin@spot-in.test' and category = 'admin_alert_masking'`).length).toBe(1);
  });

  it("AC-M9/M10-6: thread features — attachments, saved replies, inbox filters, report, 10-minute edit, soft delete", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "a@v.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: DAYS });
    const [q] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    await markViewed(v.owner, q!);
    expect((await venueInbox(v.owner, { view: "unreplied" })).rows.map((r) => r.id)).toEqual([q]);
    await saveSavedReply(v.owner, { title: "Tersedia", body: "Tanggal tersedia, kami siapkan penawaran." });
    const [reply] = await savedReplies(v.owner);
    await postMessage(v.owner, q!, { body: String(reply!.body), files: [{ name: "rate.pdf", bytes: Buffer.from("%PDF-1.4 rate card") }] });
    expect((await venueInbox(v.owner, { view: "unreplied" })).rows.length).toBe(0);
    await expect(postMessage(v.owner, q!, { body: "x", files: [{ name: "evil.exe", bytes: Buffer.from("MZ\x90\x00") }] })).rejects.toMatchObject({ key: "files.typeNotAllowed" });
    const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    await expect(postMessage(v.owner, q!, { body: "x", files: [{ name: "a.pdf", bytes: Buffer.concat([Buffer.from("%PDF-1.4\n"), eicar]) }] })).rejects.toMatchObject({ key: "files.infected" });
    const { id } = await postMessage(o.owner, q!, { body: "Terima kasih" });
    expect((await venueInbox(v.owner, { view: "mine" })).rows.map((r) => r.id)).toEqual([q]);
    expect((await venueInbox(v.owner, { spaceId: v.spaceId })).rows.length).toBe(1);
    await editMessage(o.owner, id, "Terima kasih banyak");
    let list = await listMessages(v.owner, q!);
    expect(list.messages.at(-1)).toMatchObject({ body: "Terima kasih banyak", edited: true });
    expect(list.messages[0]!.attachments[0]!.filename).toBe("rate.pdf");
    await advanceDemoClock(admin, 11 * 60_000);
    await expect(editMessage(o.owner, id, "lagi")).rejects.toMatchObject({ key: "messages.editWindowPassed" });
    await deleteMessage(o.owner, id);
    list = await listMessages(v.owner, q!);
    expect(list.messages.at(-1)).toMatchObject({ deleted: true, body: null });
    expect((await db()`select body from messages where id = ${id}`)[0]!.body).toBe("Terima kasih banyak"); // kept for the Admin
    await reportMessage(v.owner, list.messages[0]!.id, "spam");
    expect((await reportsQueue()).length).toBe(1);
  });

  it("FR-M9-06: request info → organizer reply moves the status to responded", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "a@v.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: DAYS });
    const [q] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    await requestInfo(v.owner, q!, "Berapa jumlah booth?");
    expect((await db()`select status, first_response_at from enquiries where id = ${q!}`)[0]!.status).toBe("info_requested");
    await postMessage(o.owner, q!, { body: "20 booth" });
    expect((await db()`select status from enquiries where id = ${q!}`)[0]!.status).toBe("responded");
  });

  it("§12.6: a user can't enquire to their own operator's space", async () => {
    const admin = await makeAdmin();
    const u = await makeUser(admin, "hendra@hall.id");
    const op = await createOrganization(u, { kind: "venue_operator", displayName: "Hall Hendra" });
    await saveProperty(u, { name: "Hall Hendra", type: "hall", addressText: "Jl. 2", city: "Bandung", lat: -6.9, lon: 107.6 });
    const sp = await createSpace(u, { name: "Hall", type: "event_hall", capacities: { standing: 100 } });
    await setRateCard(u, sp, { unit: "day", weekdayPrice: 5_000_000, showFullRateCard: true });
    await addSpacePhotos(u, sp, [{ name: "a.png", bytes: await pngBytes() }]);
    await submitSpace(u, sp);
    await verifyOrganization(admin, op, { method: "chat" });
    await approveSpace(admin, sp);
    await createOrganization(u, { kind: "organizer", displayName: "Hendra Events" });
    const ev = await createEvent(u, { name: "Seminar", type: "seminar", category: "education", expectedAttendance: 50, days: DAYS });
    await expect(sendEnquiries(u, ev, [sp])).rejects.toMatchObject({ key: "enquiries.ownSpace" });
  });
});
