import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";
import { registrationOpen } from "@/lib/config";
import { imagery } from "@/lib/imagery";
import { getSession, memberships } from "@/web/session";
import { cities } from "@/server/search";
import { SPACE_TYPES } from "@/server/listings";
import { EVENT_TYPES } from "@/server/enquiries";
import { REGIONS, citiesOutsideRegions } from "@/lib/regions";
import { HeroSearch } from "@/components/HeroSearch";
import { listCatalog } from "@/server/catalog";
import { CatalogCard, type CatalogItem } from "@/components/CatalogCard";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && !sp.verified) {
    const m = await memberships(s.userId);
    if (!s.intentChosen && !s.isQuickAttendee) redirect("/mulai");
    // Organizers start from the home search (UI v2); venue-only users go to their dashboard.
    if (s.context === "venue" && m.venue) redirect("/venue");
    if (m.venue && !m.organizer) redirect("/venue");
  }
  const open = registrationOpen();
  const cityList = (await cities()).map((c) => String(c.city));
  const catalog = (await listCatalog()).slice(0, 4);
  const how = [1, 2, 3] as const;
  return (
    <div className="-mt-8">
      {/* Hero (Peerspace-style): ask first, list spaces only after the search --- */}
      <section className="bleed relative isolate overflow-hidden bg-ink">
        <img src={imagery.hero} alt={t("home.heroImageAlt")} className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/20 to-black/40" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-28 sm:px-6 sm:pt-28 sm:pb-40 lg:px-8">
          {sp.verified ? <p className="alert alert-ok mb-6 max-w-xl">{t("auth.verified")}</p> : null}
          <HeroSearch
            regions={REGIONS}
            otherCities={citiesOutsideRegions(cityList)}
            suggestions={[...EVENT_TYPES.filter((x) => x !== "other").map((x) => t(`eventTypes.${x}`)), ...SPACE_TYPES.filter((x) => x !== "other").map((x) => t(`spaceTypes.${x}`))]}
            defaultCity={REGIONS[0]}
          />
        </div>
      </section>
      <section className="bleed relative bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 pb-14 sm:px-6 lg:px-8">
          <p className="-mt-12 m-0 text-[52px] leading-[0.95] font-extrabold tracking-[-0.045em] sm:-mt-20 sm:text-[112px]">
            {t("home.bandLine1")}
            <br />
            {t("home.bandLine2")}
          </p>
          <p className="m-0 text-right">
            <span className="block text-lg font-bold">{t("home.bandCaption")}</span>
            <span className="font-mono text-sm tracking-wider text-white/75">{t("home.bandCaptionPlace")}</span>
          </p>
        </div>
      </section>

      {/* Pilot note -------------------------------------------------------- */}
      <section className="bleed border-b border-line bg-brand-soft">
        <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm text-ink sm:px-6 lg:px-8">
          <Sparkles className="size-4 shrink-0 text-brand" aria-hidden="true" />
          {open ? t("home.publicNote") : t("home.pilotNote")}
        </p>
      </section>

      {/* Moments ----------------------------------------------------------- */}
      <section className="pt-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="mt-0 mb-2 text-[28px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[36px]">{t("home.momentsTitle")}</h2>
            <p className="m-0 text-lg text-muted-foreground">{t("home.momentsLead")}</p>
          </div>
          <Link href="/cari?q=" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            {t("home.browseAll")} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 md:grid-cols-4">
          {EVENT_TYPES.map((x) => (
            <li key={x}>
              <Link href={x === "other" ? "/cari?q=" : `/cari?eventType=${x}`} className="group block text-ink no-underline hover:no-underline">
                <span className="block overflow-hidden rounded-xl bg-sunken">
                  <img src={imagery.eventTypes[x]} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                </span>
                <span className="mt-3 block text-base font-bold">{x === "other" ? t("home.tileAll") : t(`eventTypes.${x}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <h3 className="mt-12 mb-4 text-base font-bold">{t("home.typesTitle")}</h3>
        <div className="flex flex-wrap gap-2">
          {SPACE_TYPES.filter((x) => x !== "other").map((x) => (
            <Link key={x} href={`/cari?type=${x}`} className="pill-link">
              {t(`spaceTypes.${x}`)}
            </Link>
          ))}
        </div>
      </section>

      {/* Open-space catalog --------------------------------------------- */}
      {catalog.length ? (
        <section className="mt-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="mt-0 mb-2 text-[28px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[36px]">{t("catalog.homeTitle")}</h2>
              <p className="m-0 text-lg text-muted-foreground">{t("catalog.homeLead")}</p>
            </div>
            <Link href="/katalog" className="btn btn-secondary">
              {t("catalog.homeCta")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.map((v) => (
              <CatalogCard key={String(v.slug)} v={v as unknown as CatalogItem} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Why Spot-In --------------------------------------------------------- */}
      <section className="mt-20 grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="mt-0 mb-2 text-[28px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[36px]">{t("home.howTitle")}</h2>
          <p className="mb-8 text-lg text-muted-foreground">{t("home.howLead")}</p>
          <ol className="m-0 grid list-none gap-0 p-0">
            {how.map((n) => (
              <li key={n} className="grid grid-cols-[56px_1fr] gap-4 border-t border-line py-6 last:border-b">
                <span className="eyebrow-num pt-1">{String(n).padStart(2, "0")}</span>
                <div>
                  <h3 className="mt-0 mb-1 text-lg font-bold">{t(`home.how${n}Title`)}</h3>
                  <p className="m-0 leading-relaxed text-muted-foreground">{t(`home.point${n}`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative">
          <img src={imagery.closing} alt={t("home.closingImageAlt")} loading="lazy" className="aspect-[4/5] w-full rounded-2xl object-cover lg:aspect-[5/6]" />
          <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-white/95 p-5 shadow-float backdrop-blur sm:right-auto sm:max-w-sm">
            <p className="m-0 text-lg font-extrabold tracking-tight text-ink">{t("home.closingTitle")}</p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">{t("home.closingLead")}</p>
            <Link href="#cari" className="btn btn-dark h-10">
              {t("home.closingCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Cities ------------------------------------------------------------- */}
      {cityList.length ? (
        <section className="mt-20">
          <h2 className="mt-0 mb-2 text-[28px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[36px]">{t("home.citiesTitle")}</h2>
          <p className="mb-8 text-lg text-muted-foreground">{t("home.citiesLead")}</p>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {cityList.map((c, i) => (
              <li key={c}>
                <Link href={`/cari?city=${encodeURIComponent(c)}`} className="group relative block overflow-hidden rounded-xl text-white no-underline hover:no-underline">
                  <img src={imagery.cities[i % imagery.cities.length]} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
                  <span className="absolute bottom-4 left-4 right-4">
                    <span className="flex items-center gap-1.5 text-lg font-bold">
                      <MapPin className="size-4" aria-hidden="true" />
                      {c}
                    </span>
                    <span className="text-sm text-white/85">{t("home.citySpaces")} →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Host CTA ------------------------------------------------------------ */}
      <section className="mt-20 grid overflow-hidden rounded-2xl bg-brand-deep text-white lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <CalendarDays className="mb-5 size-8 text-[#c9b6ff]" aria-hidden="true" />
          <h2 className="mt-0 mb-3 text-[28px] leading-tight font-extrabold tracking-[-0.02em] text-white sm:text-[36px]">{t("home.hostTitle")}</h2>
          <p className="mb-8 max-w-md text-lg leading-relaxed text-white/80">{t("home.hostLead")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={open ? "/daftar" : "/masuk"} className="btn bg-white text-ink hover:bg-white/90">
              {open ? t("home.hostCta") : t("nav.login")}
            </Link>
          </div>
        </div>
        <img src={imagery.host} alt={t("home.hostImageAlt")} loading="lazy" className="h-full min-h-72 w-full object-cover" />
      </section>

      {!s ? (
        <section className="mt-20 mb-4 flex flex-col items-center text-center">
          <h2 className="mt-0 mb-3 max-w-2xl text-[28px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[36px]">{t("home.title")}</h2>
          <p className="mb-6 max-w-xl text-lg text-muted-foreground">{t("home.lead")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link className="btn btn-primary" href="/masuk">
              {t("nav.login")}
            </Link>
            <Link className="btn btn-secondary" href="/daftar">
              {t("auth.signUpLink")}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
