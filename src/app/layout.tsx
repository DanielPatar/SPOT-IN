import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { t, messages } from "@/lib/i18n";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Spot-In", template: "%s · Spot-In" },
  description: t("meta.description"),
  robots: { index: false, follow: false }, // invite-only pilot: nothing is indexed
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <NextIntlClientProvider locale="id" messages={messages} timeZone="Asia/Jakarta">
          {/* FR-M38-01: the pilot banner appears on every page */}
          <div className="pilot-banner" role="note">
            <strong>{t("pilot.bannerLabel")}</strong> {t("pilot.banner")}
          </div>
          <Header />
          <main id="main">{children}</main>
          <footer className="site">
            {t("footer.text")} · <a href="/bantuan">{t("footer.help")}</a>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
