import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { AppError, NotVerifiedError, PermissionError } from "@/lib/permissions";
import { t } from "@/lib/i18n";
import { getSession } from "./session";
import { sendVerification } from "@/server/accounts";

export type ActionState = { error?: string; ok?: string; nonce?: string; data?: Record<string, unknown> };

/** Maps service errors to catalog messages; unknown errors get a reference ID (§12.7). */
export async function run(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    const r = (await fn()) ?? {};
    return r.ok ? { ...r, nonce: randomUUID() } : r;
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AppError) return { error: t(e.key, e.values) };
    if (e instanceof PermissionError) return { error: t("errors.permissionDenied") };
    if (e instanceof NotVerifiedError) {
      const s = await getSession();
      if (s) await sendVerification(s.userId);
      return { error: t("errors.notVerified") };
    }
    const ref = randomUUID().slice(0, 8);
    console.error(`[action ${ref}]`, e);
    return { error: t("errors.server", { ref }) };
  }
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export function int(form: FormData, key: string): number | null {
  const v = str(form, key).replace(/[.\s]/g, "").replace(/^Rp/i, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function all(form: FormData, key: string): string[] {
  return form.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0);
}
