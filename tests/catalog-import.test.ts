import { describe, expect, it } from "vitest";
import { parseBudget, parseCsv, readCatalog, slugify } from "../scripts/import-catalog";

describe("open-space catalog import (UI v2)", () => {
  it("parses quoted CSV fields with commas", () => {
    expect(parseCsv('a,b\n1,"x, y"\n')).toEqual([
      ["a", "b"],
      ["1", "x, y"],
    ]);
  });
  it("turns 💰 marks into a 1–4 tier and keeps the note", () => {
    expect(parseBudget("💰💰💰")).toEqual({ level: 3, note: null });
    expect(parseBudget("💰 (Atau Gratis dengan Izin Pemprov)")).toEqual({
      level: 1,
      note: "Atau Gratis dengan Izin Pemprov",
    });
    expect(parseBudget("")).toEqual({ level: null, note: null });
  });
  it("makes stable slugs", () => {
    expect(slugify("Central Park Mall (Laguna & Tribeca Park)")).toBe(
      "central-park-mall-laguna-tribeca-park",
    );
  });
  it("reads the bundled DKI catalog", () => {
    const rows = readCatalog("data/katalog/openspace-dki.csv");
    expect(rows.length).toBeGreaterThanOrEqual(12);
    const gi = rows.find((r) => r.slug === "grand-indonesia-fountain-atrium")!;
    expect(gi).toMatchObject({
      region: "Jakarta Pusat",
      max_pax: 2500,
      power_kva: 80,
      budget_level: 4,
    });
    expect(gi.hours).toEqual(["Acara: 10.00-22.00", "Loading: 23.00-06.00"]);
    expect(new Set(rows.map((r) => r.slug)).size).toBe(rows.length);
  });
});
