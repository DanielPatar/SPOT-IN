import { getSession } from "@/web/session";
import { pdfResponse, notFound } from "@/web/documents";
import { canDownload } from "@/server/bookings";
import { receiptPdf } from "@/server/documents";
import { db } from "@/lib/db";
import { isUuid } from "@/server/access";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  const { id } = await params;
  if (!s || !isUuid(id)) return notFound();
  const [r] = await db()`select booking_id, number from receipts where id = ${id}`;
  if (!r || !(await canDownload({ userId: s.userId }, String(r.booking_id)))) return notFound();
  return pdfResponse(await receiptPdf(id), `${String(r.number)}.pdf`);
}
