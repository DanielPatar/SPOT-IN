"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { t } from "@/lib/i18n";
import {
  signUp, login, createSession, requestMagicLink, requestPasswordReset, resetPassword, revokeSession, setSessionContext,
  chooseIntent, updateProfile, deleteAccount, sendVerification, beginTotpEnrolment, confirmTotpEnrolment, passTotp,
} from "@/server/accounts";
import { createOrganization, acceptOrgInvite } from "@/server/orgs";
import { run, str, bool, all, type ActionState } from "../action";
import { actor, clientIp, setSessionCookie, clearSessionCookie, userAgent, getSession } from "../session";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function startSession(userId: string, next: string) {
  const token = await createSession(userId, { userAgent: await userAgent(), ip: await clientIp() });
  await setSessionCookie(token);
  redirect(safeNext(next));
}

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const userId = await login({ email: str(form, "email"), password: str(form, "password"), ip: await clientIp() });
    await startSession(userId, str(form, "next") || "/");
  });
}

export async function magicLinkAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requestMagicLink(str(form, "email"), await clientIp());
    return { ok: t("auth.magicSent") };
  });
}

export async function signUpAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const { userId } = await signUp({
      name: str(form, "name"),
      email: str(form, "email"),
      password: str(form, "password") || undefined,
      ageConfirmed: bool(form, "age"),
      acceptedPilotNotice: bool(form, "consent"),
      ip: await clientIp(),
    });
    await startSession(userId, "/mulai");
  });
}

export async function resendVerificationAction(_: ActionState): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await sendVerification(a.userId);
    return { ok: t("auth.verificationResent") };
  });
}

export async function forgotPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await requestPasswordReset(str(form, "email"));
    return { ok: t("auth.resetSent") };
  });
}

export async function resetPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const userId = await resetPassword(str(form, "token"), str(form, "password"));
    await startSession(userId, "/");
  });
}

export async function logoutAction(): Promise<void> {
  const s = await getSession();
  if (s) await revokeSession(s.userId, s.sessionId);
  await clearSessionCookie();
  redirect("/masuk");
}

export async function switchContextAction(form: FormData): Promise<void> {
  const a = await actor();
  const ctx = str(form, "context") === "venue" ? "venue" : "organizer";
  await setSessionContext(a.userId, a.session.sessionId, ctx);
  redirect(ctx === "venue" ? "/venue" : "/cari");
}

/** FR-M1-06: Find spaces / List spaces / both, then create the organization(s). */
export async function startAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const intents = all(form, "intent");
    await chooseIntent(a.userId, intents);
    const { membershipOf } = await import("@/server/access");
    const hasVenue = !!(await membershipOf(a.userId, "venue_operator"));
    const hasOrganizer = !!(await membershipOf(a.userId, "organizer"));
    if (intents.includes("list") && !hasVenue && !str(form, "venueName").trim()) return { error: t("start.venueNameRequired") };
    if (intents.includes("list") && !hasVenue) {
      await createOrganization(a, { kind: "venue_operator", displayName: str(form, "venueName"), legalName: str(form, "venueLegalName"), city: str(form, "venueCity"), contactPhone: str(form, "venuePhone") });
    }
    if (intents.includes("find") && !hasOrganizer) {
      const individual = str(form, "organizerKind") !== "company";
      await createOrganization(a, {
        kind: "organizer",
        displayName: individual ? str(form, "organizerName") || a.session.name : str(form, "organizerName"),
        legalName: individual ? undefined : str(form, "organizerLegalName"),
        isIndividual: individual,
      });
    }
    await setSessionContext(a.userId, a.session.sessionId, intents.includes("list") ? "venue" : "organizer").catch(() => {});
    redirect(intents.includes("list") ? "/venue" : "/cari");
  });
}

export async function profileAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await updateProfile(a.userId, { name: str(form, "name"), phone: str(form, "phone"), emailOptional: bool(form, "emailOptional") });
    revalidatePath("/akun");
    return { ok: t("common.saved") };
  });
}

export async function revokeSessionAction(form: FormData): Promise<void> {
  const a = await actor();
  await revokeSession(a.userId, str(form, "sessionId"));
  revalidatePath("/akun");
}

export async function deleteAccountAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    if (str(form, "confirm") !== "HAPUS") return { error: t("account.typeToConfirm") };
    await deleteAccount(a.userId, a.ip);
    await clearSessionCookie();
    redirect("/masuk?deleted=1");
  });
}

export async function beginTotpAction(_: ActionState): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const r = await beginTotpEnrolment(a.userId);
    return { data: r };
  });
}

export async function confirmTotpAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await confirmTotpEnrolment(a.userId, a.session.sessionId, str(form, "code"));
    redirect(str(form, "next") || "/akun");
  });
}

export async function passTotpAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await passTotp(a.userId, a.session.sessionId, str(form, "code"));
    redirect("/admin");
  });
}

export async function acceptInviteAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const orgId = await acceptOrgInvite(a, str(form, "token"));
    const [o] = await db()`select kind from organizations where id = ${orgId}`;
    await setSessionContext(a.userId, a.session.sessionId, o?.kind === "venue_operator" ? "venue" : "organizer");
    redirect(o?.kind === "venue_operator" ? "/venue" : "/cari");
  });
}

export async function markNotificationsReadAction(): Promise<void> {
  const a = await actor();
  await db()`update notifications set read_at = ${await now()} where user_id = ${a.userId} and read_at is null`;
  revalidatePath("/notifikasi");
}
