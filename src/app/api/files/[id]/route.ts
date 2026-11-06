import { db } from "@/lib/db";
import { storage, verifyFileSignature } from "@/adapters/storage";
import { isUuid } from "@/server/access";

/** Serves stored files only through signed, expiring URLs (NFR security). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  if (!isUuid(id) || !verifyFileSignature(id, url.searchParams.get("exp") ?? "", url.searchParams.get("sig") ?? "")) {
    return new Response("Not found", { status: 404 });
  }
  const [f] = await db()`select storage_key, filename, mime, scan_status from files where id = ${id}`;
  if (!f || f.scan_status !== "clean") return new Response("Not found", { status: 404 });
  const body = await storage().get(String(f.storage_key));
  const inline = String(f.mime).startsWith("image/") || f.mime === "application/pdf";
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": String(f.mime),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(String(f.filename))}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
