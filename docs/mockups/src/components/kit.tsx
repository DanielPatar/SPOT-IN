/**
 * Spot-In UI kit: small product-level pieces built on shadcn/ui.
 * Everything here is reused across screens so that the same concept
 * always looks and reads the same way.
 */
import * as React from "react"
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  FlaskConical,
  Info,
  Loader2,
  MapPin,
  ShieldCheck,
  WifiOff,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight text-ink", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0f5c4d" />
        <circle cx="16" cy="13.5" r="5" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M16 18.5v6.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="13.5" r="1.6" fill="#d9822b" />
      </svg>
      <span className="text-[17px]">Spot-In</span>
    </span>
  )
}

/** FR-M38-01: persistent, non-dismissible banner on every booking-flow page. */
export function PilotBanner({ compact }: { compact?: boolean }) {
  return (
    <div
      role="note"
      aria-label="Mode pilot"
      className={cn(
        "flex items-start gap-2 border-b border-warm/40 bg-warm-soft text-warm-ink",
        compact ? "px-4 py-2 text-xs" : "px-4 py-2.5 text-[13px]",
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="leading-snug">
        <span className="font-semibold">Mode pilot</span> – pemesanan latihan, tidak mengikat, tanpa pembayaran nyata.
      </p>
    </div>
  )
}

/** FR-M28-17: label on every event page, registration form and pass. */
export function PilotEventLabel({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-warm/50 bg-warm-soft px-2.5 py-1 text-xs font-semibold text-warm-ink",
        className,
      )}
    >
      <FlaskConical className="size-3.5" aria-hidden="true" />
      Pilot demo – bukan acara sungguhan
    </p>
  )
}

/* ------------------------------------------------------------------ */
/* App chrome                                                          */
/* ------------------------------------------------------------------ */

type Ctx = "organizer" | "venue" | "admin" | "attendee" | "public"

const ctxLabel: Record<Ctx, string> = {
  organizer: "PT Lintas Acara Kreatif",
  venue: "Mal Cempaka Raya",
  admin: "Admin Spot-In",
  attendee: "",
  public: "",
}

export function AppHeader({
  ctx = "organizer",
  device = "mobile",
  nav,
  unread = 3,
  initials = "RW",
}: {
  ctx?: Ctx
  device?: "mobile" | "desktop"
  nav?: { label: string; active?: boolean }[]
  unread?: number
  initials?: string
}) {
  const showCtx = ctx === "organizer" || ctx === "venue" || ctx === "admin"
  return (
    <header className="sticky top-0 z-20 border-b bg-surface">
      <div className={cn("flex h-14 items-center gap-3", device === "desktop" ? "px-6" : "px-4")}>
        <Logo />
        {showCtx && (
          <button
            type="button"
            className="ml-1 inline-flex min-w-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-medium text-ink hover:bg-sunken"
            aria-label={`Konteks aktif: ${ctxLabel[ctx]}. Ganti konteks`}
          >
            <span className="truncate">{ctx === "organizer" ? "Penyelenggara" : ctx === "venue" ? "Pengelola" : "Admin"}</span>
            {device === "desktop" && <span className="truncate text-muted-foreground">· {ctxLabel[ctx]}</span>}
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        )}
        {device === "desktop" && nav && (
          <nav aria-label="Navigasi utama" className="ml-4 flex items-center gap-1">
            {nav.map((n) => (
              <a
                key={n.label}
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-current={n.active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  n.active ? "bg-brand-soft text-brand" : "text-muted-foreground hover:text-ink",
                )}
              >
                {n.label}
              </a>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-1">
          {ctx !== "public" && (
            <button
              type="button"
              className="relative grid size-9 place-items-center rounded-md text-ink hover:bg-sunken"
              aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
            >
              <Bell className="size-5" aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
          )}
          {ctx !== "public" && (
            <Avatar className="size-8">
              <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">{initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </header>
  )
}

/** Page container with consistent gutters per device. */
export function Page({
  children,
  device = "mobile",
  className,
  narrow,
}: {
  children: React.ReactNode
  device?: "mobile" | "desktop"
  className?: string
  narrow?: boolean
}) {
  return (
    <main
      className={cn(
        device === "desktop" ? "mx-auto w-full px-6 py-6" : "px-4 py-5",
        device === "desktop" && (narrow ? "max-w-3xl" : "max-w-6xl"),
        className,
      )}
    >
      {children}
    </main>
  )
}

/**
 * Page title: the title states the situation; the description adds context.
 * Deliberately no eyebrow label above titles.
 */
export function PageTitle({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  back?: string
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-2xl">
        {back && (
          <a href="#" onClick={(e) => e.preventDefault()} className="mb-2 inline-block text-sm font-medium text-brand hover:underline">
            ‹ {back}
          </a>
        )}
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-ink text-balance">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function SectionTitle({ children, hint, id }: { children: React.ReactNode; hint?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="text-base font-semibold text-ink">
        {children}
      </h2>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** A quiet white surface. Hierarchy comes from spacing and type, not stacked shadows. */
export function Panel({
  children,
  className,
  as: As = "section",
  ...rest
}: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" | "aside" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("rounded-lg border border-line bg-surface p-4", className)} {...rest}>
      {children}
    </As>
  )
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

/** Label + control + hint + inline error, wired with aria-describedby (WCAG 1.3.1, 3.3.1, 3.3.2). */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string
  label: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  optional?: boolean
  children: React.ReactElement<Record<string, unknown>>
  className?: string
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined
  const control = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  })
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (opsional)</span>}
      </Label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-[13px] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="flex items-start gap-1.5 text-[13px] leading-snug font-medium text-danger">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

/** Summary at the top of long forms (PRD §12.7). */
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
  )
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export type Tone = "neutral" | "positive" | "waiting" | "danger" | "info"

const toneClass: Record<Tone, string> = {
  neutral: "border-line-strong bg-sunken text-ink",
  positive: "border-brand/25 bg-brand-soft text-brand",
  waiting: "border-warm/50 bg-warm-soft text-warm-ink",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-line-strong bg-surface text-ink",
}

const toneIcon: Record<Tone, React.ComponentType<{ className?: string }>> = {
  neutral: Clock,
  positive: CheckCircle2,
  waiting: Clock,
  danger: AlertTriangle,
  info: Info,
}

/** Status always shows icon + text, never color alone (WCAG 1.4.1). */
export function Status({ tone, children, icon = true }: { tone: Tone; children: React.ReactNode; icon?: boolean }) {
  const Icon = toneIcon[tone]
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        toneClass[tone],
      )}
    >
      {icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  )
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      Terverifikasi Spot-In
    </span>
  )
}

/** Inline message block. Use for anything that must stay visible (no auto-dismiss). */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
  live,
}: {
  tone?: Tone
  title: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
  live?: boolean
}) {
  const Icon = tone === "positive" ? CheckCircle2 : tone === "danger" ? AlertTriangle : tone === "waiting" ? Clock : Info
  const tones: Record<Tone, string> = {
    neutral: "border-line bg-sunken",
    info: "border-line bg-surface",
    positive: "border-brand/30 bg-brand-soft",
    waiting: "border-warm/50 bg-warm-soft",
    danger: "border-danger/40 bg-danger-soft",
  }
  const iconTone: Record<Tone, string> = {
    neutral: "text-muted-foreground",
    info: "text-brand",
    positive: "text-brand",
    waiting: "text-warm-ink",
    danger: "text-danger",
  }
  return (
    <Alert
      role={live ? "alert" : "status"}
      className={cn("rounded-lg px-4 py-3", tones[tone], className)}
    >
      <Icon className={cn(iconTone[tone])} aria-hidden="true" />
      <AlertTitle className="text-[15px] text-ink">{title}</AlertTitle>
      {(children || action) && (
        <AlertDescription className="text-[14px] text-ink/80">
          {children}
          {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
        </AlertDescription>
      )}
    </Alert>
  )
}

/** Full-area state for empty / error / not-found. One clear next step. */
export function StateBlock({
  icon: Icon = Info,
  title,
  children,
  action,
  tone = "neutral",
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  tone?: "neutral" | "danger"
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong bg-surface px-5 py-8">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full",
          tone === "danger" ? "bg-danger-soft text-danger" : "bg-sunken text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {children && <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  )
}

export function OfflineBar() {
  return (
    <div role="status" className="flex items-center gap-2 bg-ink px-4 py-2 text-[13px] text-white">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold">Anda sedang offline</span> — perubahan belum tersimpan. Draf disimpan di perangkat ini.
      </span>
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </span>
  )
}

/** Skeleton list used for loading states; announces loading to screen readers once. */
export function SkeletonList({ rows = 4, label = "Memuat data" }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}…</span>
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
  )
}

/* ------------------------------------------------------------------ */
/* Money and documents                                                 */
/* ------------------------------------------------------------------ */

export function MoneyRow({
  label,
  value,
  sub,
  strong,
  muted,
  className,
  changed,
}: {
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  strong?: boolean
  muted?: boolean
  className?: string
  changed?: "added" | "removed" | "changed"
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5 text-sm",
        strong && "text-[15px] font-bold text-ink",
        muted && "text-muted-foreground",
        changed === "removed" && "text-muted-foreground line-through",
        className,
      )}
    >
      <div className="min-w-0">
        <div>{label}</div>
        {sub && <div className="text-xs font-normal text-muted-foreground no-underline">{sub}</div>}
      </div>
      <div className="num shrink-0 text-right font-medium">{value}</div>
    </div>
  )
}

/**
 * Generated-document preview (quote, agreement, receipt, statement, comparison).
 * Always carries the PILOT watermark (FR-M38-01).
 */
export function DocPreview({
  title,
  number,
  children,
  className,
  footer,
}: {
  title: string
  number?: string
  children: React.ReactNode
  className?: string
  footer?: React.ReactNode
}) {
  return (
    <article
      aria-label={`Pratinjau dokumen: ${title}`}
      className={cn(
        "pilot-watermark rounded-md border border-line-strong bg-white p-5 shadow-[0_1px_0_#e2dccf,0_8px_24px_-12px_rgba(29,27,22,0.18)]",
        className,
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="text-[15px] font-bold text-ink">{title}</p>
          {number && <p className="num mt-0.5 text-xs text-muted-foreground">{number}</p>}
        </div>
        <span className="rounded border border-warm/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-warm-ink">PILOT</span>
      </header>
      <div className="relative">{children}</div>
      {footer && <footer className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted-foreground">{footer}</footer>}
    </article>
  )
}

/** Key-value list used in summaries. */
export function Facts({ items, cols = 1 }: { items: { k: React.ReactNode; v: React.ReactNode }[]; cols?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-2.5 text-sm", cols === 2 && "@xl:grid-cols-2")}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-muted-foreground">{it.k}</dt>
          <dd className="font-medium text-ink">{it.v}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ------------------------------------------------------------------ */
/* Booking progress                                                    */
/* ------------------------------------------------------------------ */

export const bookingSteps = [
  "Penawaran diterima",
  "Perjanjian disetujui",
  "Uang muka dibayar",
  "Terkonfirmasi",
  "Pelunasan",
  "Acara",
  "Penyelesaian",
]

/**
 * The booking loop as an ordered list — it is a real sequence (PRD §9.2 Booking),
 * so numbering is meaningful here.
 */
export function BookingProgress({ current, device = "mobile" }: { current: number; device?: "mobile" | "desktop" }) {
  return (
    <ol
      aria-label="Tahap pemesanan"
      className={cn("flex gap-1", device === "mobile" ? "overflow-x-auto pb-1" : "flex-wrap")}
    >
      {bookingSteps.map((s, i) => {
        const done = i < current
        const now = i === current
        return (
          <li
            key={s}
            aria-current={now ? "step" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              done && "border-brand/20 bg-brand-soft text-brand",
              now && "border-brand bg-brand text-white",
              !done && !now && "border-line bg-surface text-muted-foreground",
            )}
          >
            {done ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <span className="num" aria-hidden="true">{i + 1}</span>}
            {s}
            {done && <span className="sr-only">(selesai)</span>}
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* Illustrations (no stock photography)                                */
/* ------------------------------------------------------------------ */

export type Art = "atrium" | "rooftop" | "hall" | "booth"

/** Flat architectural placeholders standing in for venue photos. */
export function SpacePhoto({ art, className, label }: { art: Art; className?: string; label: string }) {
  return (
    <div role="img" aria-label={label} className={cn("relative overflow-hidden rounded-md bg-[#e9e4d8]", className)}>
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        {art === "atrium" && (
          <>
            <rect width="320" height="200" fill="#ebe6da" />
            <path d="M40 0h240l-30 60H70z" fill="#f7f5f0" />
            <path d="M70 60h180v6H70z" fill="#cfc7b5" />
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={20 + i * 30} y={70 - i * 2} width="10" height={130} fill="#d8d0bf" />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={290 - i * 30} y={70 - i * 2} width="10" height={130} fill="#d8d0bf" />
            ))}
            <path d="M0 150h320v50H0z" fill="#ddd5c4" />
            <ellipse cx="160" cy="160" rx="70" ry="14" fill="#cfe4dc" />
            <rect x="130" y="120" width="60" height="34" rx="3" fill="#0f5c4d" opacity=".8" />
            <rect x="138" y="128" width="44" height="4" fill="#dcefe9" />
          </>
        )}
        {art === "rooftop" && (
          <>
            <rect width="320" height="200" fill="#f1e7d6" />
            <circle cx="250" cy="55" r="22" fill="#f3c38c" />
            {[20, 60, 95, 140, 190, 230, 270].map((x, i) => (
              <rect key={x} x={x} y={80 - (i % 3) * 18} width="30" height={120} fill="#ddd2bd" />
            ))}
            <path d="M0 140h320v60H0z" fill="#c9bfa9" />
            <path d="M0 136h320" stroke="#8f8778" strokeWidth="2" />
            {[30, 90, 150, 210, 270].map((x) => (
              <path key={x} d={`M${x} 136v-26`} stroke="#8f8778" strokeWidth="2" />
            ))}
            <path d="M20 112 Q160 96 300 112" stroke="#d9822b" strokeWidth="1.5" fill="none" />
          </>
        )}
        {art === "hall" && (
          <>
            <rect width="320" height="200" fill="#ece7dc" />
            <rect x="40" y="30" width="240" height="70" fill="#f7f5f0" />
            <rect x="110" y="44" width="100" height="42" fill="#0f5c4d" opacity=".75" />
            {Array.from({ length: 5 }).map((_, r) =>
              Array.from({ length: 9 }).map((__, c) => (
                <rect key={`${r}-${c}`} x={36 + c * 28} y={116 + r * 16} width="18" height="8" rx="2" fill="#cfc7b5" />
              )),
            )}
          </>
        )}
        {art === "booth" && (
          <>
            <rect width="320" height="200" fill="#efe9de" />
            <path d="M0 150h320v50H0z" fill="#ddd5c4" />
            <rect x="100" y="70" width="120" height="80" fill="#f7f5f0" stroke="#cfc7b5" />
            <rect x="100" y="70" width="120" height="16" fill="#0f5c4d" opacity=".8" />
            <rect x="120" y="110" width="80" height="40" fill="#dcefe9" />
          </>
        )}
      </svg>
    </div>
  )
}

/** Stylised OpenStreetMap-like map. Real build: Leaflet/MapLibre with OSM tiles (PRD §10). */
export function MapCanvas({
  className,
  pins = [],
  activePin,
  children,
  label = "Peta lokasi",
}: {
  className?: string
  pins?: { x: number; y: number; label: string; price?: string; muted?: boolean }[]
  activePin?: number
  children?: React.ReactNode
  label?: string
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-line bg-[#eef0e8]", className)} role="region" aria-label={label}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        <rect width="400" height="300" fill="#eef0e6" />
        <path d="M0 210 C80 190 120 240 200 220 S330 170 400 190 V300 H0Z" fill="#dbe8e1" />
        <path d="M250 0 C240 60 300 90 290 150 S330 260 320 300" stroke="#bcd3e0" strokeWidth="10" fill="none" />
        <rect x="40" y="40" width="70" height="50" fill="#e1e6d6" />
        <rect x="140" y="110" width="60" height="40" fill="#e1e6d6" />
        <path d="M0 120 H400" stroke="#ffffff" strokeWidth="9" />
        <path d="M0 120 H400" stroke="#f3dcb0" strokeWidth="5" />
        <path d="M120 0 V300" stroke="#ffffff" strokeWidth="7" />
        <path d="M0 60 L400 250" stroke="#ffffff" strokeWidth="5" />
        <path d="M210 0 L180 300" stroke="#ffffff" strokeWidth="5" />
        <path d="M0 260 H400" stroke="#ffffff" strokeWidth="4" />
        <path d="M330 0 V300" stroke="#ffffff" strokeWidth="4" />
      </svg>
      {pins.map((p, i) => (
        <span
          key={i}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-full",
          )}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.price ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold shadow-sm",
                activePin === i ? "border-brand bg-brand text-white" : p.muted ? "border-line-strong bg-sunken text-muted-foreground" : "border-brand/40 bg-white text-brand",
              )}
            >
              {p.price}
            </span>
          ) : (
            <MapPin className="size-8 fill-brand text-white drop-shadow" aria-hidden="true" />
          )}
          <span className="sr-only">{p.label}</span>
        </span>
      ))}
      {children}
      <span className="absolute right-1 bottom-1 rounded bg-white/85 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        © kontributor OpenStreetMap
      </span>
    </div>
  )
}

/** Deterministic QR-like pattern. A real build uses a QR library encoding the pass URL. */
export function QrCode({ seed = 7, size = 200, dimmed }: { seed?: number; size?: number; dimmed?: boolean }) {
  const n = 25
  let s = seed
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const cells: React.ReactNode[] = []
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (inFinder(x, y)) continue
      if (rnd() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)
    }
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  )
  return (
    <svg
      viewBox={`-2 -2 ${n + 4} ${n + 4}`}
      width={size}
      height={size}
      role="img"
      aria-label="Kode QR kartu masuk"
      className={cn("rounded-md bg-white", dimmed && "opacity-25")}
      shapeRendering="crispEdges"
    >
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <g fill="#1d1b16">
        {cells}
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("my-4 border-line", className)} />
}

export function StickyActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-none">
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

export function TextLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <a href="#" onClick={(e) => e.preventDefault()} className={cn("font-medium text-brand underline-offset-2 hover:underline", className)}>
      {children}
    </a>
  )
}

/** shadcn Select wrapped so Field can pass id / aria-* to the trigger. */
export function SelectBox({
  options,
  defaultValue,
  placeholder = "Pilih",
  className,
  ...aria
}: {
  options: string[]
  defaultValue?: string
  placeholder?: string
  className?: string
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}) {
  return (
    <Select defaultValue={defaultValue}>
      <SelectTrigger className={cn("w-full bg-surface", className)} {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Checkbox with a real <label> and optional helper text. */
export function CheckRow({
  id,
  children,
  hint,
  defaultChecked,
  error,
  disabled,
}: {
  id: string
  children: React.ReactNode
  hint?: React.ReactNode
  defaultChecked?: boolean
  error?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          defaultChecked={defaultChecked}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className="mt-0.5 size-5 border-[#8f8778] bg-surface data-[state=checked]:border-brand data-[state=checked]:bg-brand"
        />
        <Label htmlFor={id} className="block text-sm leading-snug font-normal text-ink">
          {children}
        </Label>
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="pl-8 text-[13px] text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="flex items-start gap-1.5 pl-8 text-[13px] font-medium text-danger">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

export { Button }
