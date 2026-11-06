import { getSession } from "@/web/session";
import { csvResponse, notFound } from "@/web/documents";
import { attendeesCsv } from "@/server/event-pages";
import { isUuid } from "@/server/access";
import { PermissionError } from "@/lib/permissions";

/** FR-M30-11: attendee CSV, Owner only, logged in the organization audit log. */
export async function GET(_req: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const s = await getSession();
  const { pageId } = await params;
  if (!s || !isUuid(pageId)) return notFound();
  try {
    return csvResponse(await attendeesCsv({ userId: s.userId }, pageId), `peserta-${pageId.slice(0, 8)}.csv`);
  } catch (e) {
    if (e instanceof PermissionError) return new Response("Forbidden", { status: 403 });
    throw e;
  }
}
