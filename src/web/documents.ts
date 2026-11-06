import "server-only";

export function pdfResponse(bytes: Buffer, filename: string): Response {
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}

export const notFound = () => new Response("Not found", { status: 404 });

export function csvResponse(body: string, filename: string): Response {
  // BOM so spreadsheet apps read UTF-8 (Rp, accents) correctly.
  return new Response("\uFEFF" + body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}
