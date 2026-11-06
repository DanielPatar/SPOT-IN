import { describe, expect, it } from "vitest";
import { businessDayDeadline, hoursBefore, nextBusinessDayAt } from "@/lib/business-days";
import { zonedInstant, formatDate, formatDateTime, timezoneFromLongitude } from "@/lib/time";
import { formatRupiah, mulDivHalfUp, parseRupiah, pct } from "@/lib/money";
import { maskContacts, MASK } from "@/lib/masking";
import { can } from "@/lib/permissions";
import { assertPilotSafe, PilotGuardError } from "@/lib/config";
import { estimate } from "@/lib/pricing";

describe("business days (§11.6, AC-M9/M10-3)", () => {
  const holidays = new Set(["2026-12-14"]); // a Monday treated as a holiday
  it("Friday 16:00 WIB with Monday a holiday expires Wednesday 23:59 WIB", () => {
    const start = zonedInstant("2026-12-11", "16:00", "Asia/Jakarta"); // Friday
    const deadline = businessDayDeadline(start, 2, "Asia/Jakarta", holidays);
    expect(deadline.toISOString()).toBe(zonedInstant("2026-12-16", "23:59", "Asia/Jakarta").toISOString());
    expect(formatDateTime(deadline, "Asia/Jakarta")).toBe("16 Des 2026, 23:59 WIB");
    expect(formatDateTime(hoursBefore(deadline, 24), "Asia/Jakarta")).toBe("15 Des 2026, 23:59 WIB");
    expect(formatDateTime(hoursBefore(deadline, 4), "Asia/Jakarta")).toBe("16 Des 2026, 19:59 WIB");
  });
  it("the start day never counts and weekends are skipped", () => {
    const start = zonedInstant("2026-11-09", "08:00", "Asia/Jakarta"); // Monday
    expect(businessDayDeadline(start, 2, "Asia/Jakarta", new Set()).toISOString()).toBe(
      zonedInstant("2026-11-11", "23:59", "Asia/Jakarta").toISOString(),
    );
  });
  it("uses the property's time zone", () => {
    const start = new Date("2026-11-06T16:30:00Z"); // Fri 23:30 WIB but Sat 00:30 WITA
    const wib = businessDayDeadline(start, 1, "Asia/Jakarta", new Set());
    const wita = businessDayDeadline(start, 1, "Asia/Makassar", new Set());
    expect(formatDateTime(wib, "Asia/Jakarta")).toBe("9 Nov 2026, 23:59 WIB");
    expect(formatDateTime(wita, "Asia/Makassar")).toBe("9 Nov 2026, 23:59 WITA");
  });
  it("release moves past a holiday (§11.7)", () => {
    const windowEnd = zonedInstant("2026-12-16", "22:00", "Asia/Jakarta"); // Wednesday
    expect(formatDateTime(nextBusinessDayAt(windowEnd, "10:00", "Asia/Jakarta", new Set()), "Asia/Jakarta")).toBe("17 Des 2026, 10:00 WIB");
    expect(formatDateTime(nextBusinessDayAt(windowEnd, "10:00", "Asia/Jakarta", new Set(["2026-12-17"])), "Asia/Jakarta")).toBe(
      "18 Des 2026, 10:00 WIB",
    );
  });
});

describe("formatting (FR-M25-02)", () => {
  it("formats Rupiah and dates", () => {
    expect(formatRupiah(25_000_000)).toBe("Rp 25.000.000");
    expect(formatDate("2026-12-12")).toBe("12 Des 2026");
    expect(parseRupiah("Rp 25.000.000")).toBe(25_000_000);
    expect(parseRupiah("abc")).toBeNull();
  });
  it("prefills time zones from longitude", () => {
    expect(timezoneFromLongitude(106.8)).toBe("Asia/Jakarta");
    expect(timezoneFromLongitude(115.2)).toBe("Asia/Makassar");
    expect(timezoneFromLongitude(140.7)).toBe("Asia/Jayapura");
  });
});

describe("money (§11.2)", () => {
  it("rounds half-up exactly", () => {
    expect(mulDivHalfUp(5, 1, 2)).toBe(3);
    expect(pct(81_000_000, 300)).toBe(2_430_000);
    expect(pct(1, 5000)).toBe(1);
  });
  it("reproduces the worked example in the estimate", () => {
    const r = estimate({
      days: ["2026-12-14", "2026-12-15", "2026-12-16"].map((date) => ({ date, start: "10:00", end: "22:00" })),
      card: { unit: "day", weekdayPrice: 25_000_000, weekendPrice: null, minUnits: 1, minSpend: null },
      seasons: [],
      addOns: [{ id: "e", name: "Listrik", unit: "per_kva_day", price: 50_000, taxable: true, mandatory: false }],
      selectedAddOnIds: ["e"],
      quantities: { e: 40 },
      tax: { isPkp: true, serviceChargeBps: 0, ppnRateBps: 1200, dppNumerator: 11, dppDenominator: 12 },
      fee: { bps: 300, min: 50_000, max: 2_500_000 },
    });
    expect(r.rentalAndAddOns).toBe(81_000_000);
    expect(r.ppn).toBe(8_910_000);
    expect(r.venueTotal).toBe(89_910_000);
    expect(r.organizerFee).toBe(2_430_000);
    expect(r.organizerTotal).toBe(92_340_000);
  });
});

describe("contact masking (FR-M10-03, AC-M9/M10-5)", () => {
  const masked = ["hubungi 0812-3456-7890", "a@b.co", "wa.me/6281234567890", "1234567890", "+62 812 3456 7890", "62.812.3456.789", "https://api.whatsapp.com/send?phone=62812"];
  for (const s of masked) {
    it(`masks "${s}"`, () => {
      const r = maskContacts(s);
      expect(r.masked).toBe(true);
      expect(r.text).toContain(MASK);
      expect(r.text.replace(MASK, "")).not.toMatch(/\d{6,}/);
    });
  }
  const kept = ["Rp 25.000.000", "300 m²", "12/12/2026", "Rp 12345678901", "kapasitas 300 orang, 40 kVA", "2026-12-12"];
  for (const s of kept) {
    it(`keeps "${s}"`, () => {
      expect(maskContacts(s)).toEqual({ text: s, masked: false });
    });
  }
  it("masks inside a longer message and keeps the rest", () => {
    const r = maskContacts("Harga Rp 25.000.000 untuk 300 m², telp 0812 3456 7890 ya");
    expect(r.text).toBe(`Harga Rp 25.000.000 untuk 300 m², telp ${MASK} ya`);
  });
});

describe("permission matrix (§4.3, AC-M2-1)", () => {
  it("matches the PRD tables", () => {
    expect(can("venue_operator", "staff", "org.manage")).toBe(false);
    expect(can("venue_operator", "staff", "venue.threshold")).toBe(false);
    expect(can("venue_operator", "viewer", "quote.send")).toBe(false);
    expect(can("venue_operator", "viewer", "enquiry.view")).toBe(true);
    expect(can("venue_operator", "staff", "listing.edit")).toBe(true);
    expect(can("venue_operator", "owner", "quote.approve")).toBe(true);
    expect(can("venue_operator", "staff", "quote.approve")).toBe(false);
    expect(can("organizer", "member", "booking.cancel")).toBe(false);
    expect(can("organizer", "member", "attendees.export")).toBe(false);
    expect(can("organizer", "member", "enquiry.send")).toBe(true);
    expect(can("organizer", "owner", "attendees.export")).toBe(true);
  });
});

describe("pilot guard (FR-M38-07, FR-M14-13)", () => {
  it("refuses to start with pilot mode off", () => {
    expect(() => assertPilotSafe({ PILOT_MODE: "off" })).toThrow(PilotGuardError);
  });
  it("refuses live payment keys", () => {
    expect(() => assertPilotSafe({ PILOT_MODE: "on", XENDIT_SECRET_KEY: "xnd_production_abc" })).toThrow(PilotGuardError);
    expect(() => assertPilotSafe({ PILOT_MODE: "on", XENDIT_SECRET_KEY: "xnd_development_abc" })).not.toThrow();
    expect(() => assertPilotSafe({ PILOT_MODE: "on" })).not.toThrow();
  });
});
