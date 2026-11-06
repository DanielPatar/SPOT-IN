"use server";
import { redirect } from "next/navigation";
import { consumeMagicLink, createSession, verifyEmail } from "@/server/accounts";
import { run, str, type ActionState } from "../action";
import { clientIp, setSessionCookie, userAgent, getSession } from "../session";

export async function consumeMagicLinkAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const { userId, data } = await consumeMagicLink(str(form, "token"));
    const token = await createSession(userId, { userAgent: await userAgent(), ip: await clientIp() });
    await setSessionCookie(token);
    const next = typeof data.redirect === "string" && data.redirect.startsWith("/") ? data.redirect : "/";
    redirect(next);
  });
}

export async function verifyEmailAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const userId = await verifyEmail(str(form, "token"));
    const s = await getSession();
    if (!s || s.userId !== userId) {
      const token = await createSession(userId, { userAgent: await userAgent(), ip: await clientIp() });
      await setSessionCookie(token);
    }
    redirect("/?verified=1");
  });
}
