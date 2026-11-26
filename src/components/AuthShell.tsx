import { t } from "@/lib/i18n";
import { imagery } from "@/lib/imagery";

/** Split auth layout (UI v2): form on the left, photography on the right from lg up. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-md lg:py-6">{children}</div>
      <aside className="relative hidden overflow-hidden rounded-2xl lg:sticky lg:top-24 lg:block">
        <img
          src={imagery.auth}
          alt={t("auth.asideImageAlt")}
          className="aspect-[4/5] w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute right-8 bottom-8 left-8 text-white">
          <p className="m-0 text-3xl leading-tight font-extrabold tracking-[-0.02em]">
            {t("auth.asideTitle")}
          </p>
          <p className="mt-3 mb-0 text-base text-white/85">{t("auth.asideLead")}</p>
        </div>
      </aside>
    </div>
  );
}
