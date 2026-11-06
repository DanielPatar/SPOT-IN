import { getSession } from "@/web/session";
import { notFound } from "@/web/documents";
import { canDownload } from "@/server/bookings";
import { storage } from "@/adapters/storage";
import { db } from "@/lib/db";
import { isUuid } from "@/server/access";

/** FR-M13-07: the stored, hashed agreement file — exactly the bytes whose SHA-256 is recorded. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  const { id } = await params;
  if (!s || !isUuid(id) || !(await canDownload({ userId: s.userId }, id))) return notFound();
  const [a] = await db()`select f.storage_key, a.sha256 from agreements a join files f on f.id = a.file_id where a.booking_id = ${id}`;
  if (!a) return notFound();
  const bytes = await storage().get(String(a.storage_key));
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="perjanjian-contoh.pdf"`, "X-Content-SHA256": String(a.sha256), "Cache-Control": "private, no-store" },
  });
}
