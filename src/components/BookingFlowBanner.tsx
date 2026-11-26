"use client";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FlaskConical } from "lucide-react";

/** Routes that make up the booking flow: enquiry → quote → agreement → payment → booking. */
const BOOKING_FLOW = [
  "/acara/kirim",
  "/enquiry",
  "/venue/enquiry",
  "/venue/pipeline",
  "/pemesanan",
];

/**
 * FR-M38-01: the persistent pilot banner is required on every page of a booking flow.
 * Other pages (home, catalog, search, account) no longer show it (UI v2).
 */
export function BookingFlowBanner() {
  const t = useTranslations("pilot");
  const path = usePathname() ?? "/";
  const inFlow =
    BOOKING_FLOW.some((p) => path === p || path.startsWith(`${p}/`)) ||
    /^\/acara\/[^/]+\/(kirim|bandingkan)/.test(path);
  if (!inFlow) return null;
  return (
    <div
      role="note"
      aria-label={t("bannerLabel")}
      className="flex items-center justify-center gap-2 bg-brand-deep px-4 py-1.5 text-[12.5px] text-white/90"
    >
      <FlaskConical className="size-3.5 shrink-0 text-[#f6c07a]" aria-hidden="true" />
      <p className="leading-snug">
        <span className="font-semibold text-white">{t("bannerLabel")}</span> {t("banner")}
      </p>
    </div>
  );
}
