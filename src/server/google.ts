import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { audit } from "@/lib/audit";
import { isInvited, normalizeEmail } from "./accounts";

/**
 * Google sign-in (FR-M1-01). Only for existing users or invited emails (FR-M1-11);
 * new Google users still accept the pilot notice and 18+ on the sign-up page.
 */
export function googleAuthUrl(state: string): string {
  const cfg = config();
  const p = new URLSearchParams({
    client_id: cfg.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${cfg.APP_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function googleCallback(code: string): Promise<{ userId: string } | { signUpEmail: string; name: string } | { error: "not_invited" | "failed" }> {
  const cfg = config();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.GOOGLE_CLIENT_ID ?? "",
      client_secret: cfg.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${cfg.APP_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { error: "failed" };
  const tokens = (await res.json()) as { access_token?: string };
  const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!info.ok) return { error: "failed" };
  const u = (await info.json()) as { sub: string; email: string; email_verified: boolean; name?: string };
  if (!u.email_verified) return { error: "failed" };
  const email = normalizeEmail(u.email);
  const [existing] = await db()`select id, status, google_sub from users where google_sub = ${u.sub} or email = ${email} limit 1`;
  const at = await now();
  if (existing) {
    if (existing.status !== "active") return { error: "failed" };
    await db()`update users set google_sub = ${u.sub}, email_verified_at = coalesce(email_verified_at, ${at}) where id = ${existing.id as string}`;
    await audit({ scope: "user", actorId: String(existing.id), action: "user.google_login", entity: "user", entityId: String(existing.id), at });
    return { userId: String(existing.id) };
  }
  if (!(await isInvited(email))) return { error: "not_invited" };
  return { signUpEmail: email, name: u.name ?? "" };
}
