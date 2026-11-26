import Link from "next/link";
import { Globe } from "lucide-react";
import { t } from "@/lib/i18n";
import { eventDiscoveryOn, registrationOpen } from "@/lib/config";
import { Logo } from "@/components/kit";

/** Site footer (UI v2): link columns, then a legal/locale row. */
export function Footer() {
  const open = registrationOpen();
  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t("footer.colExplore"),
      links: [
        { href: "/#cari", label: t("footer.searchSpaces") },
        { href: "/katalog", label: t("footer.catalog") },
        ...(eventDiscoveryOn() ? [{ href: "/jelajah", label: t("footer.discover") }] : []),
        { href: "/shortlist", label: t("nav.shortlists") },
        { href: "/acara", label: t("footer.manageEvents") },
        { href: "/pemesanan", label: t("footer.bookings") },
      ],
    },
    {
      title: t("footer.colHost"),
      links: [
        ...(open ? [{ href: "/daftar", label: t("footer.listSpace") }] : []),
        { href: "/masuk", label: t("footer.hostLogin") },
        { href: "/venue", label: t("footer.hostDashboard") },
      ],
    },
    {
      title: t("footer.colSupport"),
      links: [
        { href: "/bantuan", label: t("footer.help") },
        { href: "/bantuan/hubungi", label: t("footer.contact") },
        { href: "/lapor", label: t("footer.report") },
      ],
    },
  ];
  return (
    <footer className="no-print mt-16 border-t border-line bg-sunken">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="mt-0 mb-3 text-sm font-bold text-ink">{c.title}</h2>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {c.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground no-underline hover:text-ink hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-[13px] text-muted-foreground sm:px-6 lg:px-8">
          <p className="m-0">
            {t("footer.copyright")} · {open ? t("footer.textOpen") : t("footer.text")}
          </p>
          <p className="m-0 inline-flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="size-4" aria-hidden="true" />
              {t("footer.language")}
            </span>
            <span>{t("footer.currency")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
