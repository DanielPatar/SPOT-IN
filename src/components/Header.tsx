import Link from "next/link";
import { t } from "@/lib/i18n";
import { getSession, memberships } from "@/web/session";
import { db } from "@/lib/db";
import { logoutAction, switchContextAction } from "@/web/actions/auth";

export async function Header() {
  const s = await getSession();
  const m = s ? await memberships(s.userId) : null;
  const unread = s ? Number((await db()`select count(*)::int as n from notifications where user_id = ${s.userId} and read_at is null`)[0]!.n) : 0;
  const ctx = s?.context ?? (m?.organizer ? "organizer" : m?.venue ? "venue" : null);
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="logo">
          {t("brand.name1")}
          <span>{t("brand.name2")}</span>
        </Link>
        {s ? (
          <nav className="nav" aria-label={t("nav.label")}>
            {ctx === "venue" && m?.venue ? (
              <>
                <Link href="/venue">{t("nav.venueHome")}</Link>
                <Link href="/venue/enquiry">{t("nav.venueInbox")}</Link>
                <Link href="/venue/ruang">{t("nav.venueSpaces")}</Link>
                <Link href="/venue/tim">{t("nav.team")}</Link>
                <Link href="/venue/pengaturan">{t("nav.venueSettings")}</Link>
              </>
            ) : null}
            {ctx === "organizer" && m?.organizer ? (
              <>
                <Link href="/cari">{t("nav.search")}</Link>
                <Link href="/shortlist">{t("nav.shortlists")}</Link>
                <Link href="/acara">{t("nav.events")}</Link>
                <Link href="/organizer/tim">{t("nav.team")}</Link>
              </>
            ) : null}
            {!m?.venue && !m?.organizer && !s.isQuickAttendee ? <Link href="/mulai">{t("nav.start")}</Link> : null}
            {s.isAdmin ? <Link href="/admin">{t("nav.admin")}</Link> : null}
          </nav>
        ) : (
          <nav className="nav" aria-label={t("nav.label")} />
        )}
        <div className="nav-right">
          {s && m?.venue && m?.organizer ? (
            <form action={switchContextAction}>
              <input type="hidden" name="context" value={ctx === "venue" ? "organizer" : "venue"} />
              <span className="context-pill">{ctx === "venue" ? m.venue.displayName : m.organizer.displayName}</span>{" "}
              <button className="link-btn small" type="submit">
                {ctx === "venue" ? t("nav.switchToOrganizer") : t("nav.switchToVenue")}
              </button>
            </form>
          ) : s && ctx ? (
            <span className="context-pill">{ctx === "venue" ? m?.venue?.displayName : m?.organizer?.displayName}</span>
          ) : null}
          {s ? (
            <>
              <Link href="/notifikasi" className="btn btn-secondary small" aria-label={t("nav.notificationsCount", { n: unread })}>
                {t("nav.notifications")}
                {unread ? <span className="badge badge-warn">{unread}</span> : null}
              </Link>
              <Link href="/akun" className="small">
                {s.name || s.email}
              </Link>
              <form action={logoutAction}>
                <button className="link-btn small" type="submit">
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
        <p className="alert alert-warn small" style={{ borderRadius: 0, textAlign: "center" }}>
          {t("auth.verifyBanner")} <a href="/akun/verifikasi">{t("auth.resendVerification")}</a>
        </p>
      ) : null}
      {s?.emailBounced ? (
        <p className="alert alert-error small" style={{ borderRadius: 0, textAlign: "center" }}>
          {t("auth.bouncedBanner")} <a href="/akun">{t("auth.fixEmail")}</a>
        </p>
      ) : null}
    </header>
  );
}
