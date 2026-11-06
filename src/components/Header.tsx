import Link from "next/link";
import { Bell, ArrowLeftRight } from "lucide-react";
import { t } from "@/lib/i18n";
import { getSession, memberships } from "@/web/session";
import { db } from "@/lib/db";
import { logoutAction, switchContextAction } from "@/web/actions/auth";
import { Logo, Notice } from "@/components/kit";

/** App header from the mock-ups (AppHeader): logo, active context, navigation, notifications, account. */
export async function Header() {
  const s = await getSession();
  const m = s ? await memberships(s.userId) : null;
  const unread = s ? Number((await db()`select count(*)::int as n from notifications where user_id = ${s.userId} and read_at is null`)[0]!.n) : 0;
  const ctx = s?.context ?? (m?.organizer ? "organizer" : m?.venue ? "venue" : null);
  const nav: { href: string; label: string }[] = [];
  if (s && ctx === "venue" && m?.venue) {
    nav.push({ href: "/venue", label: t("nav.venueHome") }, { href: "/venue/enquiry", label: t("nav.venueInbox") }, { href: "/venue/ruang", label: t("nav.venueSpaces") }, { href: "/pemesanan", label: t("nav.bookings") }, { href: "/venue/tim", label: t("nav.team") }, { href: "/venue/pengaturan", label: t("nav.venueSettings") });
  }
  if (s && ctx === "organizer" && m?.organizer) {
    nav.push({ href: "/cari", label: t("nav.search") }, { href: "/shortlist", label: t("nav.shortlists") }, { href: "/acara", label: t("nav.events") }, { href: "/pemesanan", label: t("nav.bookings") }, { href: "/organizer/tim", label: t("nav.team") });
  }
  if (s && !m?.venue && !m?.organizer && !s.isQuickAttendee) nav.push({ href: "/mulai", label: t("nav.start") });
  if (s?.isQuickAttendee && !m?.venue && !m?.organizer) nav.push({ href: "/kartu-saya", label: t("nav.myPasses") });
  if (s?.isAdmin) nav.push({ href: "/admin", label: t("nav.admin") });
  const ctxName = ctx === "venue" ? m?.venue?.displayName : ctx === "organizer" ? m?.organizer?.displayName : null;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6">
        <Link href="/" className="no-underline hover:no-underline" aria-label={t("brand.home")}>
          <Logo />
        </Link>
        {s && ctxName ? (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-medium text-ink">
            <span>{ctx === "venue" ? t("nav.ctxVenue") : t("nav.ctxOrganizer")}</span>
            <span className="hidden truncate text-muted-foreground sm:inline">· {ctxName}</span>
          </span>
        ) : null}
        {nav.length ? (
          <nav aria-label={t("nav.label")} className="order-last flex w-full flex-wrap items-center gap-1 lg:order-none lg:ml-3 lg:w-auto">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground no-underline hover:bg-sunken hover:text-ink hover:no-underline">
                {n.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          {s && m?.venue && m?.organizer ? (
            <form action={switchContextAction}>
              <input type="hidden" name="context" value={ctx === "venue" ? "organizer" : "venue"} />
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-brand hover:bg-sunken">
                <ArrowLeftRight className="size-3.5" aria-hidden="true" />
                {ctx === "venue" ? t("nav.switchToOrganizer") : t("nav.switchToVenue")}
              </button>
            </form>
          ) : null}
          {s ? (
            <>
              <Link href="/notifikasi" className="relative grid size-9 place-items-center rounded-md text-ink no-underline hover:bg-sunken" aria-label={unread ? t("nav.notificationsCount", { n: unread }) : t("nav.notifications")}>
                <Bell className="size-5" aria-hidden="true" />
                {unread > 0 ? <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{unread}</span> : null}
              </Link>
              <Link href="/akun" className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand no-underline hover:no-underline" aria-label={t("nav.account", { name: s.name || s.email })}>
                {initials(s.name || s.email)}
              </Link>
              <form action={logoutAction}>
                <button className="h-9 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-sunken hover:text-ink" type="submit">
                  {t("nav.logout")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/masuk" className="btn btn-primary">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
      {s && !s.emailVerified ? (
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <Notice tone="waiting" title={t("auth.verifyBannerTitle")} action={<Link href="/akun/verifikasi">{t("auth.resendVerification")}</Link>}>
            {t("auth.verifyBanner")}
          </Notice>
        </div>
      ) : null}
      {s?.emailBounced ? (
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
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
