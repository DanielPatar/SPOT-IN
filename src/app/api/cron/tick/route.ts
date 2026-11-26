import { tick } from "@/lib/jobs";
import { scheduleDailyAdminReminder } from "@/server/admin";
import { now } from "@/lib/clock";
import { config } from "@/lib/config";
import { safeEqual } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/**
 * Runs due jobs on the application clock. Called by an external scheduler.
 * POST authenticates with the app secret; GET exists for schedulers that can only
 * issue GET (Vercel Cron), and accepts CRON_SECRET as well.
 */
async function run(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  const ok =
    safeEqual(auth, `Bearer ${config().APP_SECRET}`) ||
    (!!cronSecret && safeEqual(auth, `Bearer ${cronSecret}`));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  // The serverless runtime has no long-lived ticker, so each call also tops up the daily reminder.
  await scheduleDailyAdminReminder(await now());
  const processed = await tick();
  return Response.json({ processed });
}

export async function POST(req: Request) {
  return run(req);
}

export async function GET(req: Request) {
  return run(req);
}
