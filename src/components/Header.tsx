import Link from "next/link";
import { Bell, ArrowLeftRight } from "lucide-react";
import { t } from "@/lib/i18n";
import { getSession, memberships } from "@/web/session";
import { db } from "@/lib/db";
import { logoutAction, switchContextAction } from "@/web/actions/auth";
import { Logo, Notice } from "@/components/kit";
import { NavLinks } from "@/components/NavLinks";
import { RoleSlide } from "@/components/RoleSlide";
import { eventDiscoveryOn, registrationOpen } from "@/lib/config";

/** App header from the mock-ups (AppHeader): logo, active context, navigation, notifications, account. */
export async function Header() {
  const s = await getSession();
  const m = s ? await memberships(s.userId) : null;
  const unread = s ? Number((await db()`select count(*)::int as n from notifications where user_id = ${s.userId} and read_at is null`)[0]!.n) : 0;
  const ctx = s?.context ?? (m?.organizer ? "organizer" : m?.venue ? "venue" : null);
  const nav: { href: string; label: string; match?: string[] }[] = [];
  if (s && ctx === "venue" && m?.venue) {
    nav.push({ href: "/venue", label: t("nav.venueHome") }, { href: "/venue/enquiry", label: t("nav.venueInbox") }, { href: "/venue/ruang", label: t("nav.venueSpaces") }, { href: "/pemesanan", label: t("nav.bookings") }, { href: "/venue/tim", label: t("nav.team") }, { href: "/venue/pengaturan", label: t("nav.venueSettings") });
  }
  if (s && ctx === "organizer" && m?.organizer) {
    nav.push({ href: "/", label: t("nav.search"), match: ["/cari", "/ruang", "/properti"] }, { href: "/katalog", label: t("nav.catalog") }, { href: "/shortlist", label: t("nav.shortlists") }, { href: "/acara", label: t("nav.events") }, { href: "/pemesanan", label: t("nav.bookings") }, { href: "/organizer/tim", label: t("nav.team") });
  }
  if (s && !m?.venue && !m?.organizer && !s.isQuickAttendee) nav.push({ href: "/mulai", label: t("nav.start") });
  if (s?.isQuickAttendee && !m?.venue && !m?.organizer) nav.push({ href: "/kartu-saya", label: t("nav.myPasses") });
  if (s && eventDiscoveryOn() && !m?.venue && !m?.organizer) nav.push({ href: "/jelajah", label: t("nav.discover") });
  if (s?.isAdmin) nav.push({ href: "/admin", label: t("nav.admin") });
  const ctxName = ctx === "venue" ? m?.venue?.displayName : ctx === "organizer" ? m?.organizer?.displayName : null;
  return (
    <header id="site-header" className="sticky top-0 z-[1000] border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex min-h-[68px] max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
        <RoleSlide role={ctx} />
        <Link href="/" className="no-underline hover:no-underline" aria-label={t("brand.home")}>
          <Logo />
        </Link>
        {s && ctxName ? (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-sunken px-3 py-1 text-xs font-semibold text-ink">
            <span>{ctx === "venue" ? t("nav.ctxVenue") : t("nav.ctxOrganizer")}</span>
            <span className="hidden max-w-40 truncate font-medium text-muted-foreground sm:inline">· {ctxName}</span>
          </span>
        ) : null}
        {nav.length ? <NavLinks items={nav} label={t("nav.label")} /> : null}
        <div className="ml-auto flex items-center gap-1.5">
          {s && m?.venue && m?.organizer ? (
            <form action={switchContextAction} data-role-switch>
              <input type="hidden" name="context" value={ctx === "venue" ? "organizer" : "venue"} />
              <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-sunken">
                <ArrowLeftRight className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{ctx === "venue" ? t("nav.switchToOrganizer") : t("nav.switchToVenue")}</span>
                <span className="sr-only sm:hidden">{ctx === "venue" ? t("nav.switchToOrganizer") : t("nav.switchToVenue")}</span>
              </button>
            </form>
          ) : null}
          {s && !s.isQuickAttendee && !!m?.organizer !== !!m?.venue ? (
            <Link href="/mulai" className="hidden h-10 items-center rounded-full border border-line-strong px-4 text-sm font-semibold text-ink no-underline hover:border-ink hover:no-underline lg:inline-flex">
              {m?.organizer ? t("nav.addVenueRole") : t("nav.addOrganizerRole")}
            </Link>
          ) : null}
          {s ? (
            <>
              <Link href="/notifikasi" className="relative grid size-10 place-items-center rounded-full text-ink no-underline hover:bg-sunken" aria-label={unread ? t("nav.notificationsCount", { n: unread }) : t("nav.notifications")}>
                <Bell className="size-5" aria-hidden="true" />
                {unread > 0 ? <span className="absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread}</span> : null}
              </Link>
              <div className="flex items-center gap-1 rounded-full border border-line-strong py-1 pr-1 pl-1 transition-shadow hover:shadow-float">
                <Link href="/akun" className="grid size-8 place-items-center rounded-full bg-ink text-xs font-bold text-white no-underline hover:no-underline" aria-label={t("nav.account", { name: s.name || s.email })}>
                  {initials(s.name || s.email)}
                </Link>
                <form action={logoutAction}>
                  <button className="h-8 rounded-full px-3 text-sm font-semibold text-ink hover:bg-sunken" type="submit">
                    {t("nav.logout")}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              {eventDiscoveryOn() ? (
                <Link href="/jelajah" className="hidden rounded-md px-3 py-2 text-[15px] font-semibold text-ink no-underline hover:bg-sunken hover:no-underline md:inline-flex">
                  {t("nav.discover")}
                </Link>
              ) : null}
              <Link href="/katalog" className="hidden rounded-md px-3 py-2 text-[15px] font-semibold text-ink no-underline hover:bg-sunken hover:no-underline md:inline-flex">
                {t("nav.catalog")}
              </Link>
              {registrationOpen() ? (
                <Link href="/daftar" className="hidden rounded-md px-3 py-2 text-[15px] font-semibold text-ink no-underline hover:bg-sunken hover:no-underline md:inline-flex">
                  {t("nav.listSpace")}
                </Link>
              ) : null}
              <Link href="/masuk" className="rounded-md px-3 py-2 text-[15px] font-semibold text-ink no-underline hover:bg-sunken hover:no-underline">
                {t("nav.login")}
              </Link>
              {registrationOpen() ? (
                <Link href="/daftar" className="btn btn-primary h-10 px-4">
                  {t("nav.signUp")}
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
      {s && !s.emailVerified ? (
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:px-8">
          <Notice tone="waiting" title={t("auth.verifyBannerTitle")} action={<Link href="/akun/verifikasi">{t("auth.resendVerification")}</Link>}>
            {t("auth.verifyBanner")}
          </Notice>
        </div>
      ) : null}
      {s?.emailBounced ? (
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:px-8">
          <Notice tone="danger" title={t("auth.bouncedTitle")} action={<Link href="/akun">{t("auth.fixEmail")}</Link>}>
            {t("auth.bouncedBanner")}
          </Notice>
        </div>
      ) : null}
    </header>
  );
}

function initials(name: string): string {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
