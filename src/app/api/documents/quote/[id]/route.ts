import { getSession } from "@/web/session";
import { pdfResponse, notFound } from "@/web/documents";
import { quotePdf } from "@/server/documents";
import { quotesForEnquiry } from "@/server/quotes";
import { db } from "@/lib/db";
import { isUuid } from "@/server/access";

/** FR-M12-09: quote PDF with the pilot watermark; only for the two parties. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  const { id } = await params;
  if (!s || !isUuid(id)) return notFound();
  const [q] = await db()`select enquiry_id, version from quotes where id = ${id}`;
  if (!q) return notFound();
  try {
    const { quotes } = await quotesForEnquiry({ userId: s.userId }, String(q.enquiry_id));
    if (!quotes.some((x) => x.id === id)) return notFound();
  } catch {
    return notFound();
  }
  return pdfResponse(await quotePdf(id), `penawaran-v${q.version}.pdf`);
}
