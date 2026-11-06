import { handleCallback } from "@/server/bookings";
import type { CallbackPayload } from "@/adapters/payments";

/** Payment provider callbacks: signature verified, stored raw, processed idempotently (PRD §10). */
export async function POST(req: Request) {
  let payload: CallbackPayload;
  try {
    payload = (await req.json()) as CallbackPayload;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const result = await handleCallback(payload, req.headers.get("x-callback-signature") ?? "");
  return Response.json({ result }, { status: result === "rejected" ? 401 : 200 });
}
