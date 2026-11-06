import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { getSession, memberships } from "@/web/session";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && !sp.verified) {
    const m = await memberships(s.userId);
    if (!s.intentChosen && !s.isQuickAttendee) redirect("/mulai");
    if (s.context === "venue" && m.venue) redirect("/venue");
    if (m.organizer) redirect("/cari");
    if (m.venue) redirect("/venue");
  }
  return (
    <div className="narrow">
      {sp.verified ? <p className="alert alert-ok">{t("auth.verified")}</p> : null}
      <h1>{t("home.title")}</h1>
      <p>{t("home.lead")}</p>
      <ul>
        <li>{t("home.point1")}</li>
        <li>{t("home.point2")}</li>
        <li>{t("home.point3")}</li>
      </ul>
      {s ? (
        <Link className="btn btn-primary" href="/">
          {t("home.continue")}
        </Link>
      ) : (
        <div className="row">
          <Link className="btn btn-primary" href="/masuk">
            {t("nav.login")}
          </Link>
          <Link className="btn btn-secondary" href="/daftar">
            {t("auth.signUpLink")}
          </Link>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 24 }}>
        {t("home.pilotNote")}
      </p>
    </div>
  );
}
