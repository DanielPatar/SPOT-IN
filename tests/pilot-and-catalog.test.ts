import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { resetData, setNow } from "./helpers";
import { makeAdmin, makeVenue, makeOrganizer } from "./factories";
import { referencedKeys } from "../scripts/catalog-keys";
import { piiScan } from "../scripts/pii-scan";
import { pilotDelete } from "../scripts/pilot-delete";
import { seed } from "../scripts/seed";
import { hasMessage } from "@/lib/i18n";
import { SPACE_TYPES, ACTIVITIES, LAYOUTS, PROPERTY_TYPES, WEEKDAYS } from "@/server/listings";
import { EVENT_TYPES, CATEGORIES, FACILITIES, DECLINE_REASONS } from "@/server/enquiries";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { createEvent, sendEnquiries } from "@/server/enquiries";
import { postMessage } from "@/server/messaging";
import { searchSpaces } from "@/server/search";

describe("FR-M25-01/05 message catalog", () => {
  it("every static key used in src exists", () => {
    const { keys } = referencedKeys();
    const missing = [...keys].filter((k) => !hasMessage(k));
    expect(missing).toEqual([]);
  });

  it("every value of each dynamic key family exists", () => {
    const fam: Record<string, readonly string[]> = {
      spaceTypes: SPACE_TYPES,
      propertyTypes: PROPERTY_TYPES,
      activities: ACTIVITIES,
      layouts: LAYOUTS,
      weekdays: WEEKDAYS,
      weekdaysShort: WEEKDAYS,
      eventTypes: EVENT_TYPES,
      categories: CATEGORIES,
      facilities: FACILITIES,
      declineReasons: DECLINE_REASONS,
      enquiryStatus: ["submitted", "viewed", "info_requested", "responded", "quoted", "accepted", "declined", "expired", "withdrawn", "lost"],
      spaceStatus: ["draft", "in_review", "published", "unpublished", "suspended"],
      verification: ["unsubmitted", "pending", "verified", "rejected"],
      roles: ["owner", "staff", "viewer", "member"],
      environment: ["indoor", "outdoor", "covered"],
      units: ["day", "half_day", "hour"],
      unitsPer: ["day", "half_day", "hour"],
      addOnUnits: ["per_day", "per_kva_day", "per_person", "per_item"],
      "calendar.state": ["available", "unavailable", "limited", "block", "tentative_hold", "booking_hold", "booked"],
      warnings: ["outside_operating_days", "length_outside_limits", "above_capacity", "facilities_missing"],
      settingsKeys: Object.keys(DEFAULT_SETTINGS),
      "team.actions": ["org_created", "member_invited", "member_invite_revoked", "member_joined", "member_role_changed", "member_removed", "org_ownership_transferred", "org_threshold_changed"],
      "admin.navItems": ["home", "undangan", "verifikasi", "ruang", "laporan", "cari", "pengaturan", "audit"],
      "admin.inviteStatus": ["pending", "accepted", "revoked", "expired"],
      "spaces.statusDone": ["submit", "publish", "unpublish", "duplicate"],
      "venueEnquiry.done": ["requestInfo", "decline", "hold", "releaseHold", "notes"],
      "venueHome.step": ["profile", "property", "pin", "space", "submitted", "verified"],
      autoDecline: ["space_unpublished", "space_suspended", "operator_suspended"],
      orgKinds: ["venue_operator", "organizer"],
    };
    const missing: string[] = [];
    for (const [prefix, values] of Object.entries(fam)) for (const v of values) if (!hasMessage(`${prefix}.${v}`)) missing.push(`${prefix}.${v}`);
    for (const p of ["flexible", "moderate", "strict"]) if (!hasMessage(`policies.${p}.name`)) missing.push(p);
    const used = referencedKeys().dynamic;
    for (const prefix of used) {
      if (["notify", "help", "events.next", "search.sorts", "report.reasons", "admin.subjects", "admin.methods", "admin.roleHints", "admin.holidayKinds", "estimate.qtyHint", "auth.oauth", "organizerEnquiry.done", "policies"].includes(prefix)) continue;
      expect(Object.keys(fam), `unchecked dynamic family ${prefix}`).toContain(prefix);
    }
    expect(missing).toEqual([]);
  });

  it("the catalog is a single Bahasa Indonesia file", () => {
    const raw = readFileSync("messages/id.json", "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe("M38 pilot mode", () => {
  beforeEach(async () => {
    await resetData();
    await setNow(new Date("2026-11-09T02:00:00Z"));
  });

  it("AC-M38-4: the schema has no blocked columns and the scan reports zero matches; a NIK-like number is found", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo", type: "exhibition", category: "tech", expectedAttendance: 100, days: [{ date: "2026-12-14", start: "10:00", end: "20:00" }] });
    const [q] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    let r = await piiScan();
    expect(r).toEqual({ columns: [], values: [] });
    await postMessage(o.owner, q!, { body: "NIK saya 3171 0123 4567 8901" });
    r = await piiScan();
    expect(r.columns).toEqual([]);
    expect(r.values.map((x) => `${x.table}.${x.column}`)).toContain("messages.body");
  });

  it("AC-M38-5: the deletion job (on a copy of pilot data) leaves no personal fields", async () => {
    const admin = await makeAdmin();
    const v = await makeVenue(admin, "budi@venue.id");
    const o = await makeOrganizer(admin, "rina@eo.id");
    const ev = await createEvent(o.owner, { name: "Expo Rahasia", type: "exhibition", category: "tech", expectedAttendance: 100, days: [{ date: "2026-12-14", start: "10:00", end: "20:00" }] });
    const [q] = await sendEnquiries(o.owner, ev, [v.spaceId]);
    await postMessage(o.owner, q!, { body: "Halo dari Rina" });
    expect((await pilotDelete({ confirm: true })).ran).toBe(false); // date not reached
    await setNow(new Date("2027-04-01T02:00:00Z"));
    expect((await pilotDelete({ confirm: false })).ran).toBe(false); // dry run
    const r = await pilotDelete({ confirm: true });
    expect(r.ran).toBe(true);
    const leftovers = await db()`
      select count(*)::int as n from users where not is_admin and (name <> '' or email::text not like 'deleted+%' or phone is not null or password_hash is not null)`;
    expect(leftovers[0]!.n).toBe(0);
    expect((await db()`select count(*)::int as n from messages where body <> ''`)[0]!.n).toBe(0);
    expect((await db()`select count(*)::int as n from files`)[0]!.n).toBe(0);
    expect((await db()`select count(*)::int as n from events where name = 'Expo Rahasia'`)[0]!.n).toBe(0);
  });

  it("FR-M38-06: the demo seed runs and refuses the pilot environment", async () => {
    await seed();
    const res = await searchSpaces({ q: "aula jaksel" });
    expect(res.rows.map((r) => r.name)).toContain("Aula Kemang");
    process.env.APP_ENV = "pilot";
    await expect(seed()).rejects.toThrow(/pilot/);
    process.env.APP_ENV = "test";
  });
});
