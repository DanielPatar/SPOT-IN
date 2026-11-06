import { cookies, headers } from "next/headers";
import { config } from "@/lib/config";
import { safeEqual } from "@/lib/tokens";
import { googleCallback } from "@/server/google";
import { createSession } from "@/server/accounts";
import { setSessionCookie } from "@/web/session";

export async function GET(req: Request) {
  const base = config().APP_URL;
  const url = new URL(req.url);
  const state = (await cookies()).get("spotin_oauth_state")?.value ?? "";
  if (!state || !safeEqual(state, url.searchParams.get("state") ?? "")) return Response.redirect(`${base}/masuk?error=failed`, 302);
  const r = await googleCallback(url.searchParams.get("code") ?? "");
  if ("error" in r) return Response.redirect(`${base}/masuk?error=${r.error}`, 302);
  if ("signUpEmail" in r) return Response.redirect(`${base}/daftar?email=${encodeURIComponent(r.signUpEmail)}`, 302);
  const h = await headers();
  const token = await createSession(r.userId, { userAgent: h.get("user-agent"), ip: h.get("x-forwarded-for")?.split(",")[0] ?? null });
  await setSessionCookie(token);
  return Response.redirect(`${base}/`, 302);
}
