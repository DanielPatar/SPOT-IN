/**
 * Indonesian time zones have fixed offsets and no daylight saving, which keeps all
 * property-local time arithmetic exact (PRD §11.6, FR-M25-02).
 */
export const TIMEZONES = {
  "Asia/Jakarta": { offsetMin: 7 * 60, label: "WIB" },
  "Asia/Makassar": { offsetMin: 8 * 60, label: "WITA" },
  "Asia/Jayapura": { offsetMin: 9 * 60, label: "WIT" },
} as const;
export type TimeZone = keyof typeof TIMEZONES;

export function isTimeZone(tz: string): tz is TimeZone {
  return tz in TIMEZONES;
}

function off(tz: string): number {
  if (!isTimeZone(tz)) throw new Error(`Unsupported time zone ${tz}`);
  return TIMEZONES[tz].offsetMin;
}

export function tzLabel(tz: string): string {
  return isTimeZone(tz) ? TIMEZONES[tz].label : tz;
}

/**
 * Time zone prefilled from a map pin's longitude (FR-M4-01). An approximation of the
 * WIB / WITA / WIT boundaries; the venue can always correct it.
 */
export function timezoneFromLongitude(lon: number): TimeZone {
  if (lon >= 126.5) return "Asia/Jayapura"; // Maluku, Papua
  if (lon >= 114.5) return "Asia/Makassar"; // Bali, NTB, NTT, Sulawesi, East/South/North Kalimantan
  return "Asia/Jakarta"; // Sumatra, Java, West/Central Kalimantan
}

/** Local wall-clock parts of an instant in a zone. */
export function localParts(instant: Date, tz: string) {
  const shifted = new Date(instant.getTime() + off(tz) * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(), // 0 = Sunday
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of the instant in the zone. */
export function localDate(instant: Date, tz: string): string {
  const p = localParts(instant, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Instant for a local date and "HH:MM" (or HH:MM:SS) in the zone. */
export function zonedInstant(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm, ss] = time.split(":").map(Number) as [number, number, number?];
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss ?? 0) - off(tz) * 60_000);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysBetween(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  return Math.round((tb - ta) / 86_400_000);
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const WEEKDAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** "12 Des 2026" (FR-M25-02) for a YYYY-MM-DD date. */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

export function formatWeekdayDate(date: string): string {
  return `${WEEKDAYS_ID[weekdayOf(date)]}, ${formatDate(date)}`;
}

/** "12 Des 2026, 10:00 WIB" for an instant shown in the property's zone. */
export function formatDateTime(instant: Date, tz: string): string {
  const p = localParts(instant, tz);
  return `${formatDate(localDate(instant, tz))}, ${pad(p.hour)}:${pad(p.minute)} ${tzLabel(tz)}`;
}

export function formatTime(instant: Date, tz: string): string {
  const p = localParts(instant, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}
