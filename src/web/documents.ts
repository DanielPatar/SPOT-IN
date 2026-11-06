import "server-only";

export function pdfResponse(bytes: Buffer, filename: string): Response {
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}

export const notFound = () => new Response("Not found", { status: 404 });
