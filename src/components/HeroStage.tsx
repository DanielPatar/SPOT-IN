"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2, CalendarHeart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };
type Props = {
  slides: string[];
  regions: readonly string[];
  otherCities: string[];
  eventTypes: Option[];
  spaceTypes: Option[];
  defaultCity: string;
  discovery: boolean;
  notice?: string;
};

const SLIDE_MS = 6000;

/**
 * Home hero (UI v2, Peerspace-style). Backgrounds cross-fade with a caption in the dark band,
 * the headline follows the chosen city, and the search bar switches between renting a space
 * and finding an event. The list of spaces only opens after this form is submitted.
 */
export function HeroStage({
  slides,
  regions,
  otherCities,
  eventTypes,
  spaceTypes,
  defaultCity,
  discovery,
  notice,
}: Props) {
  const t = useTranslations("home");
  const [slide, setSlide] = useState(0);
  const [mode, setMode] = useState<"spaces" | "events">("spaces");
  const [city, setCity] = useState(defaultCity);
  const [what, setWhat] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setSlide((s) => (s + 1) % slides.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const field =
    "grid gap-1 px-5 py-3 text-left font-normal transition-colors focus-within:bg-sunken/70 hover:bg-sunken/40 md:py-4";
  const control =
    "h-8 w-full border-0 bg-transparent p-0 text-[17px] text-ink shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0";
  const divider = "border-t border-line md:border-t-0 md:border-l";
  const pick = (v: string) => {
    setWhat(v);
    setOpen(false);
  };
  const headline =
    mode === "events"
      ? city
        ? t("heroEventsAskIn", { city })
        : t("heroEventsAsk")
      : city
        ? t("heroAskIn", { city })
        : t("heroAsk");
  const where = (
    <label className={cn(field, divider)}>
      <span className="text-sm font-semibold text-muted-foreground">{t("searchWhere")}</span>
      <select
        name={mode === "events" ? "wilayah" : "city"}
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className={cn(control, "cursor-pointer")}
      >
        <option value="">{t("searchWhereAny")}</option>
        <optgroup label={t("regionsGroup")}>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </optgroup>
        {otherCities.length ? (
          <optgroup label={t("otherCitiesGroup")}>
            {otherCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
  const submit = (
    <div className="p-3 md:p-2.5">
      <button
        type="submit"
        className="btn btn-dark group h-14 w-full rounded-md px-7 text-[17px] md:w-auto"
      >
        {t("searchSubmit")}
        <ArrowRight
          className="size-5 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>
    </div>
  );

  return (
    <>
      <section
        data-hero
        className={cn("bleed relative isolate overflow-x-clip bg-ink", open ? "z-30" : "z-10")}
      >
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="hero-bg absolute inset-0">
            {slides.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className={cn(
                  "hero-slide absolute inset-0 size-full object-cover",
                  i === slide ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/45" />
        </div>
        <div className="hero-content mx-auto max-w-7xl px-4 pt-16 pb-28 sm:px-6 sm:pt-24 sm:pb-40 lg:px-8">
          {notice ? <p className="alert alert-ok mb-6 max-w-xl">{notice}</p> : null}
          {discovery ? (
            <div
              role="group"
              aria-label={t("tabsLabel")}
              className="mb-6 inline-flex gap-1 rounded-full bg-black/35 p-1 backdrop-blur"
            >
              {(["spaces", "events"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                    mode === m ? "bg-white text-ink" : "text-white hover:bg-white/15",
                  )}
                >
                  {m === "spaces" ? (
                    <Building2 className="size-4" aria-hidden="true" />
                  ) : (
                    <CalendarHeart className="size-4" aria-hidden="true" />
                  )}
                  {m === "spaces" ? t("tabSpaces") : t("tabEvents")}
                </button>
              ))}
            </div>
          ) : null}
          <h1
            key={headline}
            className="hero-headline max-w-4xl text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-[64px]"
          >
            {headline}
          </h1>

          {mode === "spaces" ? (
            <form
              id="cari"
              action="/cari"
              method="get"
              role="search"
              aria-label={t("searchLabel")}
              className="relative mt-10 grid scroll-mt-28 rounded-md bg-white shadow-float md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-center"
            >
              <div ref={box} className="relative">
                <label className={cn(field, "rounded-l-md")}>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {t("searchWhat")}
                  </span>
                  <input
                    name="q"
                    value={what}
                    onChange={(e) => setWhat(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setOpen(false);
                    }}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="hero-what"
                    placeholder={t("whatAny")}
                    className={control}
                  />
                </label>
                {open ? (
                  <div
                    id="hero-what"
                    className="hero-pop absolute top-full left-0 z-30 mt-2 w-full min-w-[300px] rounded-xl border border-line bg-white p-3 shadow-float sm:w-[440px]"
                  >
                    <button
                      type="button"
                      onClick={() => pick("")}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-brand-soft"
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
                        <Sparkles className="size-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-bold text-ink">{t("whatAny")}</span>
                        <span className="block text-sm text-muted-foreground">
                          {t("whatAnyHint")}
                        </span>
                      </span>
                    </button>
                    {[
                      { title: t("whatEvents"), items: eventTypes },
                      { title: t("whatSpaces"), items: spaceTypes },
                    ].map((g) => (
                      <div key={g.title} className="mt-3">
                        <p className="m-0 px-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                          {g.title}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {g.items.map((o) => (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => pick(o.label)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                                what === o.label
                                  ? "border-ink bg-ink text-white"
                                  : "border-line-strong text-ink hover:border-ink",
                              )}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {where}
              <label className={cn(field, divider)}>
                <span className="text-sm font-semibold text-muted-foreground">
                  {t("searchWhen")}
                </span>
                <input
                  name="from"
                  type="text"
                  placeholder={t("whenAny")}
                  className={control}
                  onFocus={(e) => {
                    e.currentTarget.type = "date";
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {}
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                />
              </label>
              {submit}
            </form>
          ) : (
            <form
              action="/jelajah"
              method="get"
              role="search"
              aria-label={t("tabEvents")}
              className="relative mt-10 grid rounded-md bg-white shadow-float md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-center"
            >
              <label className={cn(field, "rounded-l-md")}>
                <span className="text-sm font-semibold text-muted-foreground">
                  {t("eventsWhat")}
                </span>
                <input
                  name="q"
                  autoComplete="off"
                  placeholder={t("eventsWhatPlaceholder")}
                  className={control}
                />
              </label>
              {where}
              <label className={cn(field, divider)}>
                <span className="text-sm font-semibold text-muted-foreground">
                  {t("eventsWhen")}
                </span>
                <select name="kapan" defaultValue="" className={cn(control, "cursor-pointer")}>
                  <option value="">{t("eventsWhenAny")}</option>
                  <option value="now">{t("eventsWhenNow")}</option>
                  <option value="soon">{t("eventsWhenSoon")}</option>
                </select>
              </label>
              {submit}
            </form>
          )}
        </div>
      </section>
      <section className="bleed relative z-20 bg-transparent text-white">
        <div className="absolute inset-0 -z-10 bg-ink" aria-hidden="true" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 pb-12 sm:px-6 lg:px-8">
          <p className="m-0 -mt-12 text-[52px] leading-[0.95] font-extrabold tracking-[-0.045em] sm:-mt-20 sm:text-[112px]">
            <span data-drift="-90" className="block">
              {t("bandLine1")}
            </span>
            <span data-drift="90" className="block">
              {t("bandLine2")}
            </span>
          </p>
          <div className="text-right">
            <p key={slide} className="hero-caption m-0">
              <span className="block text-lg font-bold">{t(`slides.${slide + 1}`)}</span>
              <span className="font-mono text-sm tracking-wider text-white/75">
                {t("slidePlace")}
              </span>
            </p>
            <div
              role="group"
              aria-label={t("slidesLabel")}
              className="mt-3 flex justify-end gap-1.5"
            >
              {slides.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={t(`slides.${i + 1}`)}
                  aria-pressed={i === slide}
                  onClick={() => setSlide(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === slide ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
