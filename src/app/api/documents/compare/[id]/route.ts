import { getSession } from "@/web/session";
import { pdfResponse, notFound } from "@/web/documents";
import { comparisonPdf } from "@/server/documents";
import { compareRows } from "@/web/compare";
import { isUuid } from "@/server/access";

/** FR-M8-05: comparison table exported as a watermarked PDF. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  const { id } = await params;
  if (!s || !isUuid(id)) return notFound();
  try {
    const { event, rows } = await compareRows({ userId: s.userId }, id);
    return pdfResponse(await comparisonPdf({ name: String(event.name) }, rows), "perbandingan-penawaran.pdf");
  } catch {
    return notFound();
  }
}
