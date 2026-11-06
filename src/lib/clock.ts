import { db } from "./db";
import { config } from "./config";

/**
 * Application clock (FR-M38-10). Every deadline, hold expiry, reminder and scheduled job
 * reads time from here, never from Date.now() directly. In the demo (and test)
 * environment an Admin can move the clock forward; elsewhere the offset is always 0.
 */
let cache: { offsetMs: number; at: number } | undefined;
const CACHE_MS = 1000;

export async function clockOffsetMs(): Promise<number> {
  if (!config().demoClockEnabled) return 0;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.offsetMs;
  const rows = await db()`select value from settings where key = 'demo_clock_offset_ms'`;
  const offsetMs = rows[0] ? Number(rows[0].value) : 0;
  cache = { offsetMs, at: Date.now() };
  return offsetMs;
}

export async function now(): Promise<Date> {
  return new Date(Date.now() + (await clockOffsetMs()));
}

export async function setClockOffsetMs(offsetMs: number, actorId: string | null): Promise<void> {
  if (!config().demoClockEnabled) throw new Error("The demo clock exists only in the demo environment (FR-M38-10).");
  if (offsetMs < 0) throw new Error("The demo clock only moves forward.");
  await db()`
    insert into settings (key, value, changed_by, changed_at)
    values ('demo_clock_offset_ms', ${JSON.stringify(offsetMs)}::jsonb, ${actorId}, now())
    on conflict (key) do update set value = excluded.value, changed_by = excluded.changed_by, changed_at = now()`;
  cache = undefined;
}

export function invalidateClockCache(): void {
  cache = undefined;
}
