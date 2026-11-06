import { getSession } from "@/web/session";
import { csvResponse, notFound } from "@/web/documents";
import { venueCountsCsv } from "@/server/dashboards";
import { PermissionError } from "@/lib/permissions";

/** FR-M22-03: the raw rows behind the venue counts. */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return notFound();
  const u = new URL(req.url);
  const from = u.searchParams.get("from") ?? "";
  const to = u.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return notFound();
  try {
    return csvResponse(await venueCountsCsv({ userId: s.userId }, from, to), `permintaan-${from}-${to}.csv`);
  } catch (e) {
    if (e instanceof PermissionError) return notFound();
    throw e;
  }
}
