"use client";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/kit";

export type ActionState = { error?: string; ok?: string; nonce?: string; data?: Record<string, unknown> };
type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

/**
 * Form bound to a server action. The result stays on the page as an inline notice
 * at the top of the form (no toasts — see docs/mockups README, overlay rules).
 */
export function Form({ action, children, className, encType, resetOnOk }: { action: Action; children: ReactNode; className?: string; encType?: string; resetOnOk?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const t = useTranslations("common");
  return (
    <form action={formAction} className={className ?? "form"} encType={encType} key={resetOnOk ? state.nonce : undefined}>
      {state.error ? <Notice tone="danger" live title={t("errorTitle")} className="alert-error">{state.error}</Notice> : null}
      {state.ok ? <Notice tone="positive" title={state.ok} className="alert-ok" /> : null}
      {children}
    </form>
  );
}

export function Submit({ children, variant = "primary", name, value }: { children: ReactNode; variant?: "primary" | "secondary" | "danger"; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("common");
  const v = variant === "primary" ? "default" : variant === "secondary" ? "outline" : "destructive";
  return (
    <Button type="submit" variant={v} disabled={pending} name={name} value={value} aria-busy={pending} className="w-fit">
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? t("saving") : children}
    </Button>
  );
}
