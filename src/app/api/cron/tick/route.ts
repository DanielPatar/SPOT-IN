import { tick } from "@/lib/jobs";
import { config } from "@/lib/config";
import { safeEqual } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/** Runs due jobs on the application clock. Called by the scheduler (uptime cron) with the app secret. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${config().APP_SECRET}`)) return new Response("Unauthorized", { status: 401 });
  const processed = await tick();
  return Response.json({ processed });
}
