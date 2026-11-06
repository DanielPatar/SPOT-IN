import Link from "next/link";
import { t } from "@/lib/i18n";

export function AdminNav() {
  const items = ["", "undangan", "verifikasi", "ruang", "laporan", "cari", "pengaturan", "audit"];
  return (
    <nav className="row" style={{ marginBottom: 16 }} aria-label={t("admin.nav")}>
      {items.map((i) => (
        <Link key={i} href={`/admin/${i}`} className="btn btn-secondary">
          {t(`admin.navItems.${i || "home"}`)}
        </Link>
      ))}
    </nav>
  );
}
