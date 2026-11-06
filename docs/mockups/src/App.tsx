import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Laptop, Smartphone } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PortalContainerContext } from "@/lib/portal"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/kit"
import { sections, type ScreenDef } from "@/registry"
import { screens } from "@/screens"

function readHash(): { screen?: string; state?: string } {
  const h = window.location.hash.replace(/^#\/?/, "")
  if (!h) return {}
  const [screen, query] = h.split("?")
  const state = new URLSearchParams(query ?? "").get("state") ?? undefined
  return { screen, state }
}

export function App() {
  const [route, setRoute] = useState(readHash)
  useEffect(() => {
    const on = () => {
      setRoute(readHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])

  const def = screens.find((s) => s.id === route.screen)
  return (
    <TooltipProvider delayDuration={300}>
      {def ? <Viewer def={def} stateId={route.state} /> : <Gallery />}
    </TooltipProvider>
  )
}

/* ------------------------------------------------------------------ */

function Gallery() {
  const totalStates = screens.reduce((n, s) => n + s.states.length, 0)
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <Logo />
          <span className="text-sm text-muted-foreground">Mock-up UI, PRD v1.2</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">Semua layar Spot-In untuk pilot</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {screens.length} layar dan {totalStates} keadaan, disusun mengikuti alur pengguna di PRD §6. Buka layar untuk melihatnya di bingkai ponsel atau laptop, lalu
            pilih keadaan (kosong, memuat, galat, dan lainnya) dari baris di atas bingkai. Data di sini fiktif.
          </p>
        </div>

        <nav aria-label="Lompat ke bagian" className="mt-6 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a key={s.id} href={`#sec-${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${s.id}`)?.scrollIntoView() }} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink hover:border-brand hover:text-brand">
              {s.title.replace(/^§[\d.–]+ /, "")}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-12">
          {sections.map((sec) => {
            const items = screens.filter((s) => s.section === sec.id)
            if (!items.length) return null
            return (
              <section key={sec.id} id={`sec-${sec.id}`} aria-labelledby={`h-${sec.id}`} className="scroll-mt-6">
                <h2 id={`h-${sec.id}`} className="text-lg font-bold text-ink">
                  {sec.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sec.note}</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((s) => (
                    <li key={s.id}>
                      <ScreenLink def={s} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function ScreenLink({ def }: { def: ScreenDef }) {
  const DeviceIcon = def.device === "mobile" ? Smartphone : Laptop
  return (
    <a
      href={`#/${def.id}`}
      className="group flex h-full flex-col rounded-lg border border-line bg-surface p-4 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-semibold text-ink group-hover:text-brand">{def.title}</span>
        <DeviceIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={def.device === "mobile" ? "Ponsel" : "Laptop"} />
      </span>
      <span className="mt-1 text-sm leading-snug text-muted-foreground">{def.summary}</span>
      <span className="mt-auto pt-3 text-xs text-muted-foreground">
        {def.role} · {def.states.length} keadaan
      </span>
    </a>
  )
}

/* ------------------------------------------------------------------ */

function Viewer({ def, stateId }: { def: ScreenDef; stateId?: string }) {
  const state = def.states.find((s) => s.id === stateId) ?? def.states[0]
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null)
  const idx = screens.findIndex((s) => s.id === def.id)
  const prev = screens[idx - 1]
  const next = screens[idx + 1]
  const content = useMemo(() => def.render(state.id), [def, state.id])

  useEffect(() => {
    document.title = `${def.title} – Mock-up Spot-In`
  }, [def.title])

  return (
    <div className="min-h-screen bg-[#e9e5db]">
      <div className="no-print sticky top-0 z-40 border-b border-line-strong bg-surface">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <a href="#" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Semua layar
          </a>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{def.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              PRD §{def.section === "x" ? "12.7, 7.1, 7.17" : def.section === "0" ? "8, 7.18" : def.section} · {def.fr.join(", ")}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {prev && (
              <a className="text-muted-foreground hover:text-ink" href={`#/${prev.id}`}>
                ‹ Sebelumnya
              </a>
            )}
            {next && (
              <a className="text-muted-foreground hover:text-ink" href={`#/${next.id}`}>
                Berikutnya ›
              </a>
            )}
          </div>
        </div>
        <div role="group" aria-label="Pilih keadaan layar" className="flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2">
          {def.states.map((s) => (
            <a
              key={s.id}
              href={`#/${def.id}?state=${s.id}`}
              aria-current={s.id === state.id ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
                s.id === state.id ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand",
              )}
            >
              {s.label}
              {s.ref && <span className={cn("ml-1", s.id === state.id ? "text-white/80" : "text-muted-foreground")}>{s.ref}</span>}
            </a>
          ))}
        </div>
      </div>

      <div className="flex justify-center px-2 py-6 sm:px-6">
        <div
          ref={setFrameEl}
          className={cn(
            // @container: breakpoints inside screens respond to the frame width, not the browser window.
            "@container relative overflow-hidden bg-background [transform:translateZ(0)]",
            def.device === "mobile"
              ? "h-[820px] w-[390px] max-w-full rounded-[28px] border-[10px] border-ink shadow-xl"
              : "h-[860px] w-full max-w-[1280px] rounded-lg border border-line-strong shadow-xl",
          )}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden" data-frame-scroll>
            <PortalContainerContext.Provider value={frameEl}>
              <div key={state.id}>{content}</div>
            </PortalContainerContext.Provider>
          </div>
        </div>
      </div>
      <p className="no-print pb-8 text-center text-xs text-muted-foreground">
        Dialog dan panel terbuka di dalam bingkai. Tekan Esc untuk menutupnya sebelum memilih keadaan lain.
      </p>
    </div>
  )
}
