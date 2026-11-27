import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { t, messages } from "@/lib/i18n";
import { Header } from "@/components/Header";
import { Suspense } from "react";
import { BookingFlowBanner } from "@/components/BookingFlowBanner";
import { NavProgress } from "@/components/NavProgress";
import { ImageShrinker } from "@/components/ImageShrinker";
import { Footer } from "@/components/Footer";
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
          {/* FR-M38-01: the pilot banner appears on every page of the booking flow */}
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
            {t("nav.skip")}
          </a>
          <Suspense fallback={null}>
            <NavProgress />
          </Suspense>
          <ImageShrinker />
          <BookingFlowBanner />
          <Header />
          <main id="main" className="app-main">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
