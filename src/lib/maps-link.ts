/**
 * Reads coordinates out of a Google Maps link (UI v2: "paste the Maps link" instead of clicking the map).
 * Pure text parsing — safe on the client. Short links (maps.app.goo.gl) carry no coordinates and must be
 * resolved on the server first (adapters/geocoder.ts).
 */
export type LatLon = { lat: number; lon: number };

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";
const PATTERNS = [
  new RegExp(`!3d${NUM}!4d${NUM}`), // the place itself
  new RegExp(`[?&](?:q|query|ll|destination|center)=(?:loc:)?${NUM}(?:,|%2C)${NUM}`, "i"),
  new RegExp(`@${NUM},${NUM}`), // map centre
  new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`), // plain "lat, lon"
];

export function parseMapsLink(text: string): LatLon | null {
  const s = (text ?? "").trim();
  if (!s) return null;
  for (const re of PATTERNS) {
    const m = re.exec(s);
    if (!m) continue;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180)
      return { lat, lon };
  }
  return null;
}

/** Hosts we are willing to follow when resolving a short Maps link (avoids fetching arbitrary URLs). */
export function isGoogleMapsHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "maps.app.goo.gl" ||
    h === "goo.gl" ||
    h === "g.co" ||
    h === "maps.google.com" ||
    /^(www\.)?google\.[a-z.]{2,6}$/.test(h)
  );
}
