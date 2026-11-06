import { db } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Health check for uptime pings (NFR availability). Also proves the pilot guard passed. */
export async function GET() {
  try {
    const cfg = config();
    await db()`select 1`;
    return Response.json({ ok: true, env: cfg.APP_ENV, pilotMode: cfg.pilotMode });
  } catch (e) {
    return Response.json({ ok: false, error: String(e).slice(0, 200) }, { status: 503 });
  }
}
