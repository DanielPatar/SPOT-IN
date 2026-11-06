import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { randomToken } from "@/lib/tokens";
import { googleAuthUrl } from "@/server/google";

export async function GET() {
  if (!config().GOOGLE_CLIENT_ID) return new Response("Not found", { status: 404 });
  const state = randomToken(16);
  (await cookies()).set("spotin_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return Response.redirect(googleAuthUrl(state), 302);
}
