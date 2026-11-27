import { describe, expect, it } from "vitest";
import { isGoogleMapsHost, parseMapsLink } from "../src/lib/maps-link";

describe("Google Maps link → pin", () => {
  it("prefers the place coordinates over the map centre", () => {
    const url =
      "https://www.google.com/maps/place/Grand+Indonesia/@-6.1950,106.8200,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-6.1951512!4d106.8205279";
    expect(parseMapsLink(url)).toEqual({ lat: -6.1951512, lon: 106.8205279 });
  });
  it("reads @lat,lon, ?q=lat,lon and plain pairs", () => {
    expect(parseMapsLink("https://www.google.com/maps/@-6.2088,106.8456,15z")).toEqual({
      lat: -6.2088,
      lon: 106.8456,
    });
    expect(parseMapsLink("https://maps.google.com/?q=-6.2,106.8166")).toEqual({
      lat: -6.2,
      lon: 106.8166,
    });
    expect(parseMapsLink("-6.225, 106.8")).toEqual({ lat: -6.225, lon: 106.8 });
  });
  it("returns null for short links and junk", () => {
    expect(parseMapsLink("https://maps.app.goo.gl/AbCdEf123")).toBeNull();
    expect(parseMapsLink("halo")).toBeNull();
    expect(parseMapsLink("")).toBeNull();
  });
  it("only follows Google Maps hosts", () => {
    expect(isGoogleMapsHost("maps.app.goo.gl")).toBe(true);
    expect(isGoogleMapsHost("www.google.co.id")).toBe(true);
    expect(isGoogleMapsHost("google.com.evil.example")).toBe(false);
    expect(isGoogleMapsHost("example.com")).toBe(false);
  });
});
