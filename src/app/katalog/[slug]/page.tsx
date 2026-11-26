import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bus,
  Clock,
  ExternalLink,
  Info,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDate, localDate } from "@/lib/time";
import { catalogVenue } from "@/server/catalog";
import { BudgetLegend, BudgetLevel } from "@/components/BudgetLevel";
import { isImage } from "@/components/CatalogCard";
import { StateBlock } from "@/components/kit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const v = await catalogVenue((await params).slug);
  return { title: v ? String(v.name) : t("catalog.title") };
}

function contactHref(c: string): string | null {
  if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c)) return `mailto:${c}`;
  if (/^\+?[\d\s()-]{7,}$/.test(c)) return `tel:${c.replace(/[^\d+]/g, "")}`;
  return null;
}

/** Catalog venue (UI v2): floor plan first, then the technical data and the 💰 estimate. */
export default async function CatalogVenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const v = await catalogVenue((await params).slug);
  if (!v) notFound();
  const fp = v.floorplan_path ? String(v.floorplan_path) : null;
  const level = Number(v.budget_level) || null;
  const facilities = (v.facilities ?? []) as string[];
  const hours = (v.hours ?? []) as string[];
  const contacts = (v.contacts ?? []) as string[];
  const specs = [
    {
      icon: Ruler,
      k: t("catalog.area"),
      v: v.area_m2 ? t("catalog.m2", { n: Number(v.area_m2).toLocaleString("id-ID") }) : null,
    },
    {
      icon: Users,
      k: t("catalog.capacity"),
      v: v.max_pax ? t("catalog.upTo", { n: Number(v.max_pax).toLocaleString("id-ID") }) : null,
    },
    { icon: LayoutGrid, k: t("catalog.areaType"), v: v.area_type ? String(v.area_type) : null },
    {
      icon: Zap,
      k: t("catalog.power"),
      v: v.power_kva ? t("catalog.kva", { n: Number(v.power_kva) }) : null,
    },
    { icon: Truck, k: t("catalog.loadingDock"), v: v.loading_dock ? String(v.loading_dock) : null },
  ].filter((s) => s.v);
  return (
    <div>
      <Link
        href="/katalog"
        className="mb-4 inline-block text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
      >
        ‹ {t("catalog.back")}
      </Link>
      <div className="mb-8">
        <h1 className="mb-2 text-[30px] sm:text-[36px]">{String(v.name)}</h1>
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden="true" />
            {String(v.region)}
          </span>
          {v.category ? <span>· {String(v.category)}</span> : null}
          <BudgetLevel level={level} size="sm" withName />
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <section aria-labelledby="denah">
            <h2 id="denah" className="mt-0 mb-4 text-[22px]">
              {t("catalog.floorplan")}
            </h2>
            {fp ? (
              <figure className="m-0 overflow-hidden rounded-2xl border border-line bg-white">
                {isImage(fp) ? (
                  <a href={fp} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={fp}
                      alt={t("catalog.floorplanAlt", { name: String(v.name) })}
                      className="max-h-[640px] w-full object-contain p-4"
                    />
                  </a>
                ) : (
                  <object
                    data={fp}
                    type="application/pdf"
                    aria-label={t("catalog.floorplanAlt", { name: String(v.name) })}
                    className="h-[640px] w-full"
                  />
                )}
                <figcaption className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
                  <a
                    href={fp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold"
                  >
                    {t("catalog.floorplanOpen")}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                  {v.source_url ? (
                    <a
                      href={String(v.source_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground"
                    >
                      {t("catalog.source")}
                    </a>
                  ) : null}
                </figcaption>
              </figure>
            ) : (
              <StateBlock icon={LayoutGrid} title={t("catalog.floorplanMissingTitle")}>
                {t("catalog.floorplanMissing")}
              </StateBlock>
            )}
          </section>

          <section className="border-b border-line py-8">
            <h2 className="mt-0 mb-5 text-[22px]">{t("catalog.specs")}</h2>
            <dl className="m-0 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {specs.map((s) => (
                <div key={s.k} className="flex items-start gap-3">
                  <s.icon className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
                  <div>
                    <dt className="text-sm text-muted-foreground">{s.k}</dt>
                    <dd className="m-0 font-semibold text-ink">{s.v}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          {facilities.length ? (
            <section className="border-b border-line py-8">
              <h2 className="mt-0 mb-4 text-[22px]">{t("catalog.facilities")}</h2>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {facilities.map((f) => (
                  <li
                    key={f}
                    className="rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-ink"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="grid gap-8 py-8 sm:grid-cols-2">
            {hours.length ? (
              <div>
                <h2 className="mt-0 mb-3 flex items-center gap-2 text-lg">
                  <Clock className="size-5" aria-hidden="true" />
                  {t("catalog.hours")}
                </h2>
                <ul className="m-0 grid list-none gap-1 p-0 text-[15px]">
                  {hours.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {v.transit ? (
              <div>
                <h2 className="mt-0 mb-3 flex items-center gap-2 text-lg">
                  <Bus className="size-5" aria-hidden="true" />
                  {t("catalog.transit")}
                </h2>
                <p className="m-0 text-[15px]">{String(v.transit)}</p>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="min-w-0">
          <div className="grid gap-6 rounded-2xl border border-line bg-surface p-6 shadow-float lg:sticky lg:top-24">
            <div>
              <p className="m-0 text-sm text-muted-foreground">{t("catalog.costTitle")}</p>
              <BudgetLevel level={level} size="lg" withName className="mt-1" />
              {v.budget_note ? (
                <p className="mt-2 mb-0 text-sm text-ink">{String(v.budget_note)}</p>
              ) : null}
              <p className="mt-2 mb-0 text-[13px] text-muted-foreground">{t("catalog.costHelp")}</p>
            </div>
            {contacts.length ? (
              <div className="border-t border-line pt-5">
                <h2 className="mt-0 mb-3 text-base">{t("catalog.contactTitle")}</h2>
                <ul className="m-0 grid list-none gap-2 p-0 text-[15px]">
                  {contacts.map((c) => {
                    const href = contactHref(c);
                    const Icon = href?.startsWith("tel:") ? Phone : href ? Mail : Info;
                    return (
                      <li key={c} className="flex items-start gap-2 break-all">
                        <Icon className="mt-1 size-4 shrink-0" aria-hidden="true" />
                        {href ? <a href={href}>{c}</a> : <span>{c}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {v.source_url ? (
              <a
                href={String(v.source_url)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary w-full"
              >
                {t("catalog.sourceLink")}
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            ) : null}
            <div className="rounded-xl bg-sunken p-4 text-sm">
              <p className="m-0 font-semibold text-ink">{t("catalog.notListedTitle")}</p>
              <p className="mt-1 mb-0 text-muted-foreground">{t("catalog.notListed")}</p>
            </div>
          </div>
          <details className="mt-6 rounded-xl border border-line p-4">
            <summary>{t("catalog.legendTitle")}</summary>
            <div className="mt-3">
              <BudgetLegend current={level} />
            </div>
          </details>
          <p className="mt-4 text-[13px] text-muted-foreground">
            {t("catalog.updated", {
              date: formatDate(localDate(new Date(v.imported_at as Date), "Asia/Jakarta")),
            })}
          </p>
        </aside>
      </div>
    </div>
  );
}
