import { getSession } from "@/web/session";
import { notFound, pdfResponse } from "@/web/documents";
import { canDownload } from "@/server/bookings";
import { statementPdf } from "@/server/lifecycle";
import { isUuid } from "@/server/access";

/** FR-M15-07 / FR-M16-09: watermarked per-booking statement (settlement after release). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  const { id } = await params;
  if (!s || !isUuid(id) || !(await canDownload({ userId: s.userId }, id))) return notFound();
  return pdfResponse(await statementPdf(id), `laporan-${id.slice(0, 8)}.pdf`);
}
