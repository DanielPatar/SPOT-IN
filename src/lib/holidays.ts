import { db } from "./db";
import type { HolidaySet } from "./business-days";

let cache: { set: HolidaySet; at: number } | undefined;

/** Holiday calendar from the database (FR-M24-11), cached briefly. */
export async function loadHolidays(): Promise<HolidaySet> {
  if (cache && Date.now() - cache.at < 30_000) return cache.set;
  const rows = await db()`select to_char(date, 'YYYY-MM-DD') as d from holiday_calendar`;
  const set = new Set(rows.map((r) => String(r.d)));
  cache = { set, at: Date.now() };
  return set;
}

export function invalidateHolidayCache(): void {
  cache = undefined;
}
