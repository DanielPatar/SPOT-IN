"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

type Props = {
  regions: readonly string[];
  otherCities: string[];
  suggestions: string[];
  defaultCity: string;
};

/**
 * Home search (UI v2, Peerspace-style): "what / where / when". The list of spaces is only
 * shown after this form is submitted to /cari. The headline follows the chosen city.
 */
export function HeroSearch({ regions, otherCities, suggestions, defaultCity }: Props) {
  const t = useTranslations("home");
  const [city, setCity] = useState(defaultCity);
  const field = "grid gap-1 px-5 py-3 text-left font-normal focus-within:bg-sunken/70 md:py-4";
  const control =
    "h-8 w-full border-0 bg-transparent p-0 text-[17px] text-ink shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0";
  return (
    <div>
      <h1 className="max-w-4xl text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-[64px]">
        {city ? t("heroAskIn", { city }) : t("heroAsk")}
      </h1>
      <form
        id="cari"
        action="/cari"
        method="get"
        role="search"
        aria-label={t("searchLabel")}
        className="mt-10 grid scroll-mt-28 overflow-hidden rounded-md bg-white shadow-float md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-center"
      >
        <label className={field}>
          <span className="text-sm font-semibold text-muted-foreground">{t("searchWhat")}</span>
          <input
            name="q"
            list="hero-what"
            autoComplete="off"
            placeholder={t("whatPlaceholder")}
            className={`${control} [&::-webkit-calendar-picker-indicator]:hidden`}
          />
          <datalist id="hero-what">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className={`${field} border-t border-line md:border-t-0 md:border-l`}>
          <span className="text-sm font-semibold text-muted-foreground">{t("searchWhere")}</span>
          <select
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={`${control} cursor-pointer`}
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
        <label className={`${field} border-t border-line md:border-t-0 md:border-l`}>
          <span className="text-sm font-semibold text-muted-foreground">{t("searchWhen")}</span>
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
        <div className="p-3 md:p-2.5">
          <button
            type="submit"
            className="btn btn-dark h-14 w-full rounded-md px-7 text-[17px] md:w-auto"
          >
            {t("searchSubmit")}
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
