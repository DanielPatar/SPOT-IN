/**
 * Spot-In UI kit, ported from docs/mockups/src/components/kit.tsx (the visual reference).
 * Product-level pieces built on shadcn/ui so the same concept always looks and reads the
 * same way. All text comes from the message catalog (FR-M25-05).
 */
import * as React from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Clock, FlaskConical, Info, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

/* Brand -------------------------------------------------------------- */

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-[-0.03em]", inverted ? "text-white" : "text-ink", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill={inverted ? "#ffffff" : "#5b2bd8"} />
        <path d="M16 6.5c-4.1 0-7.3 3.1-7.3 7.1 0 5.2 6.1 10.9 6.8 11.5a.8.8 0 0 0 1 0c.7-.6 6.8-6.3 6.8-11.5 0-4-3.2-7.1-7.3-7.1Z" fill={inverted ? "#5b2bd8" : "#ffffff"} />
        <circle cx="16" cy="13.6" r="2.7" fill={inverted ? "#ffffff" : "#5b2bd8"} />
      </svg>
      <span className="text-[20px] leading-none">{t("brand.name")}</span>
    </span>
  );
}

/** FR-M28-17: label on every event page, registration form and pass. */
export function PilotEventLabel({ className }: { className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-1.5 rounded-md border border-warm/50 bg-warm-soft px-2.5 py-1 text-xs font-semibold text-warm-ink", className)}>
      <FlaskConical className="size-3.5" aria-hidden="true" />
      {t("pilot.eventLabel")}
    </p>
  );
}

/* Layout ------------------------------------------------------------- */

/** Page title: the title states the situation; the description adds context. No eyebrow labels. */
export function PageTitle({ title, description, actions, back }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {back ? (
          <a href={back.href} className="mb-3 inline-block text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            ‹ {back.label}
          </a>
        ) : null}
        <h1 className="mb-0 text-[28px] leading-[1.15] font-extrabold tracking-[-0.02em] text-balance text-ink sm:text-[32px]">{title}</h1>
        {description ? <p className="mt-2 text-base leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, hint, id }: { children: React.ReactNode; hint?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="mt-0 text-lg font-bold tracking-[-0.01em] text-ink">
        {children}
      </h2>
      {hint ? <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A quiet white surface. Hierarchy comes from spacing and type, not stacked shadows. */
export function Panel({ children, className, as: As = "section", ...rest }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" | "aside" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("rounded-xl border border-line bg-surface p-5 sm:p-6", className)} {...rest}>
      {children}
    </As>
  );
}

/* Forms -------------------------------------------------------------- */

/** Label + control + hint + inline error, wired with aria-describedby (WCAG 1.3.1, 3.3.1, 3.3.2). */
export function Field({ id, label, hint, error, optional, children, className }: { id: string; label: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; optional?: boolean; children: React.ReactElement<Record<string, unknown>>; className?: string }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  const control = React.cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined });
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-muted-foreground"> {t("common.optional")}</span> : null}
      </label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-[13px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="flex items-start gap-1.5 text-[13px] leading-snug font-medium text-danger">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* Status ------------------------------------------------------------- */

export type Tone = "neutral" | "positive" | "waiting" | "danger" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "border-line-strong bg-sunken text-ink",
  positive: "border-brand/25 bg-brand-soft text-brand",
  waiting: "border-warm/50 bg-warm-soft text-warm-ink",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-line-strong bg-surface text-ink",
};
const toneIcon: Record<Tone, React.ComponentType<{ className?: string }>> = { neutral: Clock, positive: CheckCircle2, waiting: Clock, danger: AlertTriangle, info: Info };

/** Status always shows icon + text, never color alone (WCAG 1.4.1). */
export function Status({ tone, children, icon = true }: { tone: Tone; children: React.ReactNode; icon?: boolean }) {
  const Icon = toneIcon[tone];
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", toneClass[tone])}>
      {icon ? <Icon className="size-3" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      {t("badges.verified")}
    </span>
  );
}

/** Inline message block for anything that must stay visible (no auto-dismiss, no toasts). */
export function Notice({ tone = "info", title, children, action, className, live }: { tone?: Tone; title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string; live?: boolean }) {
  const Icon = tone === "positive" ? CheckCircle2 : tone === "danger" ? AlertTriangle : tone === "waiting" ? Clock : Info;
  const tones: Record<Tone, string> = {
    neutral: "border-line bg-sunken",
    info: "border-line bg-surface",
    positive: "border-brand/30 bg-brand-soft",
    waiting: "border-warm/50 bg-warm-soft",
    danger: "border-danger/40 bg-danger-soft",
  };
  const iconTone: Record<Tone, string> = { neutral: "text-muted-foreground", info: "text-brand", positive: "text-brand", waiting: "text-warm-ink", danger: "text-danger" };
  return (
    <Alert role={live ? "alert" : "status"} className={cn("rounded-xl px-4 py-3", tones[tone], className)}>
      <Icon className={cn(iconTone[tone])} aria-hidden="true" />
      <AlertTitle className="text-[15px] text-ink">{title}</AlertTitle>
      {children || action ? (
        <AlertDescription className="text-[14px] text-ink/80">
          {children}
          {action ? <div className="mt-2 flex flex-wrap gap-2">{action}</div> : null}
        </AlertDescription>
      ) : null}
    </Alert>
  );
}

/** Full-area state for empty / error / not-found. One clear next step. */
export function StateBlock({ icon: Icon = Info, title, children, action, tone = "neutral" }: { icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; action?: React.ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-sunken px-6 py-10 sm:px-10">
      <span className={cn("grid size-10 place-items-center rounded-full", tone === "danger" ? "bg-danger-soft text-danger" : "bg-white text-brand shadow-sm")}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <h2 className="mt-0 text-lg font-bold text-ink">{title}</h2>
        {children ? <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Loading skeleton; announces loading to screen readers once. */
export function SkeletonList({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label ?? t("common.loading")}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-lg border border-line bg-surface p-3">
          <Skeleton className="size-16 shrink-0 rounded-md bg-sunken" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-2/3 bg-sunken" />
            <Skeleton className="h-3 w-1/2 bg-sunken" />
            <Skeleton className="h-3 w-1/3 bg-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorSummary({ title, items }: { title: string; items: { href: string; text: string }[] }) {
  return (
    <div role="alert" className="mb-5 rounded-lg border-2 border-danger bg-danger-soft p-4" tabIndex={-1}>
      <p className="flex items-center gap-2 font-semibold text-danger">
        <XCircle className="size-4" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-ink">
        {items.map((i) => (
          <li key={i.href}>
            <a href={i.href} className="font-medium text-danger underline underline-offset-2">
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Money and documents ------------------------------------------------ */

export function MoneyRow({ label, value, sub, strong, muted, className, changed }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; strong?: boolean; muted?: boolean; className?: string; changed?: "added" | "removed" | "changed" }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5 text-sm", strong && "text-[15px] font-bold text-ink", muted && "text-muted-foreground", changed === "removed" && "text-muted-foreground line-through", changed === "added" && "text-brand", className)}>
      <div className="min-w-0">
        <div>{label}</div>
        {sub ? <div className="text-xs font-normal text-muted-foreground no-underline">{sub}</div> : null}
      </div>
      <div className="num shrink-0 text-right font-medium">{value}</div>
    </div>
  );
}

/** Generated-document preview; always carries the PILOT watermark (FR-M38-01). */
export function DocPreview({ title, number, children, className, footer }: { title: string; number?: string; children: React.ReactNode; className?: string; footer?: React.ReactNode }) {
  return (
    <article aria-label={t("docs.previewOf", { title })} className={cn("pilot-watermark rounded-md border border-line-strong bg-white p-5 shadow-[0_1px_0_#e2dccf,0_8px_24px_-12px_rgba(29,27,22,0.18)]", className)}>
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="text-[15px] font-bold text-ink">{title}</p>
          {number ? <p className="num mt-0.5 text-xs text-muted-foreground">{number}</p> : null}
        </div>
        <span className="rounded border border-warm/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-warm-ink">{t("docs.pilotStamp")}</span>
      </header>
      <div className="relative">{children}</div>
      {footer ? <footer className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted-foreground">{footer}</footer> : null}
    </article>
  );
}

/** Key-value list used in summaries. */
export function Facts({ items, cols = 1 }: { items: { k: React.ReactNode; v: React.ReactNode }[]; cols?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-2.5 text-sm", cols === 2 && "sm:grid-cols-2")}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-muted-foreground">{it.k}</dt>
          <dd className="font-medium text-ink">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export const BOOKING_STEPS = ["accepted", "agreement", "deposit", "confirmed", "balance", "event", "settled"] as const;

/** The booking loop as an ordered list — a real sequence (PRD §9.2), so numbering is meaningful. */
export function BookingProgress({ current }: { current: number }) {
  return (
    <ol aria-label={t("booking.progressLabel")} className="flex flex-wrap gap-1">
      {BOOKING_STEPS.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li
            key={s}
            aria-current={now ? "step" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              done && "border-brand/20 bg-brand-soft text-brand",
              now && "border-ink bg-ink text-white",
              !done && !now && "border-line bg-surface text-muted-foreground",
            )}
          >
            {done ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <span className="num">{i + 1}</span>}
            {t(`booking.steps.${s}`)}
          </li>
        );
      })}
    </ol>
  );
}

/** Status pill for an enquiry status, with tone fixed per meaning. */
export function EnquiryStatus({ status }: { status: string }) {
  const tone: Tone = ["accepted", "quoted", "responded"].includes(status)
    ? "positive"
    : ["submitted", "viewed", "info_requested"].includes(status)
      ? "waiting"
      : status === "declined" || status === "expired"
        ? "danger"
        : "neutral";
  return <Status tone={tone}>{t(`enquiryStatus.${status}`)}</Status>;
}
