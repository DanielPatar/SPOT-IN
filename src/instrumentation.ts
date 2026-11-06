/**
 * Runs due jobs every 30 s inside the Node server (dev, demo, pilot). Hosted
 * environments can also call POST /api/cron/tick from an external scheduler.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.APP_ENV === "test" || process.env.DISABLE_JOB_TICKER === "1") return;
  const { tick } = await import("@/lib/jobs");
  const { scheduleDailyAdminReminder } = await import("@/server/admin");
  const { now } = await import("@/lib/clock");
  try {
    await scheduleDailyAdminReminder(await now());
  } catch (e) {
    console.error("[jobs] could not schedule the daily admin reminder", e);
  }
  const g = globalThis as unknown as { __spotinTicker?: NodeJS.Timeout };
  if (g.__spotinTicker) return;
  g.__spotinTicker = setInterval(() => {
    tick().catch((e) => console.error("[jobs] tick failed", e));
  }, 30_000);
}
