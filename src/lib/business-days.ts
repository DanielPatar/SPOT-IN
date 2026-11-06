import { addDays, localDate, weekdayOf, zonedInstant, localParts } from "./time";

/**
 * Business days (PRD §11.6): Monday–Friday excluding national holidays and cuti bersama
 * from the Admin holiday calendar (FR-M24-11), in the property's time zone.
 */
export type HolidaySet = ReadonlySet<string>; // YYYY-MM-DD

export function isBusinessDay(date: string, holidays: HolidaySet): boolean {
  const wd = weekdayOf(date);
  return wd !== 0 && wd !== 6 && !holidays.has(date);
}

/**
 * A deadline of N business days ends at 23:59 of the Nth business day after the day the
 * clock starts; the start day itself never counts.
 * Example: Friday 16:00 WIB, Monday a holiday, N = 2 → Wednesday 23:59 WIB.
 */
export function businessDayDeadline(start: Date, n: number, tz: string, holidays: HolidaySet): Date {
  if (n < 1) throw new Error("n must be >= 1");
  let date = localDate(start, tz);
  let counted = 0;
  while (counted < n) {
    date = addDays(date, 1);
    if (isBusinessDay(date, holidays)) counted++;
  }
  return zonedInstant(date, "23:59", tz);
}

/** The first business day strictly after the local date of `after`, at `time` local (used for release, §11.7). */
export function nextBusinessDayAt(after: Date, time: string, tz: string, holidays: HolidaySet): Date {
  let date = localDate(after, tz);
  do {
    date = addDays(date, 1);
  } while (!isBusinessDay(date, holidays));
  return zonedInstant(date, time, tz);
}

/** Business hours (09:00–17:00 on business days) elapsed between two instants (median response time). */
export function businessHoursBetween(from: Date, to: Date, tz: string, holidays: HolidaySet): number {
  if (to <= from) return 0;
  let total = 0;
  let date = localDate(from, tz);
  const endDate = localDate(to, tz);
  for (let guard = 0; guard < 3660; guard++) {
    if (isBusinessDay(date, holidays)) {
      const open = zonedInstant(date, "09:00", tz).getTime();
      const close = zonedInstant(date, "17:00", tz).getTime();
      const s = Math.max(open, from.getTime());
      const e = Math.min(close, to.getTime());
      if (e > s) total += e - s;
    }
    if (date === endDate) break;
    date = addDays(date, 1);
  }
  return total / 3_600_000;
}

export function hoursBefore(instant: Date, hours: number): Date {
  return new Date(instant.getTime() - hours * 3_600_000);
}

export { localParts };
