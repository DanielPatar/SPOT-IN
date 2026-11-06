import { getSession } from "@/web/session";
import { csvResponse, notFound } from "@/web/documents";
import { statementCsv } from "@/server/lifecycle";
import { isUuid } from "@/server/access";
import { PermissionError } from "@/lib/permissions";

/** FR-M15-07: per-booking statement as CSV. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  const { id } = await params;
  if (!s || !isUuid(id)) return notFound();
  try {
    return csvResponse(await statementCsv({ userId: s.userId }, id), `laporan-${id.slice(0, 8)}.csv`);
  } catch (e) {
    if (e instanceof PermissionError) return notFound();
    throw e;
  }
}
