import type { ReactNode } from "react"
import { AppHeader, OfflineBar, Page, PilotBanner } from "@/components/kit"
import type { Device } from "@/registry"

type Ctx = "organizer" | "venue" | "admin" | "attendee" | "public"

const navFor: Record<Ctx, { label: string }[] | undefined> = {
  organizer: [{ label: "Cari ruang" }, { label: "Acara saya" }, { label: "Daftar pilihan" }, { label: "Pesan" }],
  venue: [{ label: "Kotak masuk" }, { label: "Kalender" }, { label: "Pemesanan" }, { label: "Properti" }],
  admin: [{ label: "Antrean" }, { label: "Cari" }, { label: "Buku besar" }, { label: "Pengaturan" }],
  attendee: undefined,
  public: undefined,
}

/**
 * Standard screen chrome.
 * - `pilot`: show the persistent pilot banner (required on booking-flow pages, FR-M38-01).
 * - `offline`: show the §12.7 offline bar.
 */
export function Shell({
  children,
  device = "mobile",
  ctx = "organizer",
  pilot = false,
  offline = false,
  active,
  narrow,
  bare,
  initials,
}: {
  children: ReactNode
  device?: Device
  ctx?: Ctx
  pilot?: boolean
  offline?: boolean
  active?: string
  narrow?: boolean
  bare?: boolean
  initials?: string
}) {
  const nav = navFor[ctx]?.map((n) => ({ ...n, active: n.label === active }))
  return (
    <div className="min-h-full">
      <AppHeader ctx={ctx} device={device} nav={nav} initials={initials ?? (ctx === "venue" ? "BS" : ctx === "admin" ? "DA" : ctx === "attendee" ? "MA" : "RW")} unread={ctx === "public" ? 0 : 3} />
      {offline && <OfflineBar />}
      {pilot && <PilotBanner compact={device === "mobile"} />}
      {bare ? children : (
        <Page device={device} narrow={narrow}>
          {children}
        </Page>
      )}
    </div>
  )
}

/** Logged-out auth layout: centered single column, calm. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-background">
      <AppHeader ctx="public" />
      <main className="px-5 py-7">{children}</main>
    </div>
  )
}
