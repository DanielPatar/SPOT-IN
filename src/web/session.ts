import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { resolveSession, type SessionUser, type Actor } from "@/server/accounts";
import { membershipOf } from "@/server/access";

export const SESSION_COOKIE = "spotin_session";

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return resolveSession(token);
});

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}

export async function requireSession(next?: string): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect(`/masuk${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return s;
}

export async function actor(): Promise<Actor & { session: SessionUser }> {
  const s = await requireSession();
  return { userId: s.userId, ip: await clientIp(), session: s };
}

/** Admin pages need 2FA enrolled and passed in this session (FR-M1-03, FR-M24-12). */
export async function requireAdminPage(): Promise<SessionUser> {
  const s = await requireSession("/admin");
  if (!s.isAdmin) redirect("/");
  if (!s.twoFactorEnabled || !s.twoFactorPassed) redirect("/admin/2fa");
  return s;
}

export const memberships = cache(async (userId: string) => ({
  venue: await membershipOf(userId, "venue_operator"),
  organizer: await membershipOf(userId, "organizer"),
}));

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
