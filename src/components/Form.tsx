"use client";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

export type ActionState = { error?: string; ok?: string; nonce?: string; data?: Record<string, unknown> };
type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

/** Form bound to a server action; shows the error/success message at the top (§12.7). */
export function Form({ action, children, className, encType, resetOnOk }: { action: Action; children: ReactNode; className?: string; encType?: string; resetOnOk?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className ?? "form"} encType={encType} key={resetOnOk ? state.nonce : undefined}>
      {state.error ? (
        <p className="alert alert-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="alert alert-ok" role="status">
          {state.ok}
        </p>
      ) : null}
      {children}
    </form>
  );
}

export function Submit({ children, variant = "primary", name, value }: { children: ReactNode; variant?: "primary" | "secondary" | "danger"; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("common");
  return (
    <button type="submit" className={`btn btn-${variant}`} disabled={pending} name={name} value={value} aria-busy={pending}>
      {pending ? t("saving") : children}
    </button>
  );
}
