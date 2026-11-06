import { config } from "@/lib/config";
import { db } from "@/lib/db";

/**
 * Geocoding adapter (PRD §10): Nominatim, called once when a property is saved (never per
 * keystroke), at most 1 request per second, results cached. The pin is the source of truth.
 */
export type GeocodeResult = { lat: number; lon: number; displayName: string } | null;

let lastCall = 0;

export async function geocode(query: string): Promise<GeocodeResult> {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const cached = await db()`select lat, lon, display_name from geocode_cache where query = ${q}`;
  if (cached[0]) {
    return cached[0].lat == null ? null : { lat: Number(cached[0].lat), lon: Number(cached[0].lon), displayName: String(cached[0].display_name) };
  }
  let result: GeocodeResult = null;
  if (config().GEOCODER_DRIVER === "fake") {
    result = { lat: -6.2441, lon: 106.8001, displayName: `${query} (fake)` };
  } else {
    const wait = Math.max(0, lastCall + 1100 - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    try {
      const url = `${config().NOMINATIM_URL}/search?format=json&limit=1&countrycodes=id&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { "User-Agent": config().NOMINATIM_USER_AGENT }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
        if (data[0]) result = { lat: Number(data[0].lat), lon: Number(data[0].lon), displayName: data[0].display_name };
      } else {
        return null; // provider issue: don't cache
      }
    } catch {
      return null;
    }
  }
  await db()`
    insert into geocode_cache (query, lat, lon, display_name) values (${q}, ${result?.lat ?? null}, ${result?.lon ?? null}, ${result?.displayName ?? null})
    on conflict (query) do nothing`;
  return result;
}
