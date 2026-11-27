"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Thin progress bar at the top of the page. It appears the moment an internal link or a GET form
 * is used and disappears when the new page is shown, so a click never looks ignored (UI v2).
 */
export function NavProgress() {
  const path = usePathname();
  const query = useSearchParams();
  // The location the navigation started from; the bar shows only while we are still on it.
  const [from, setFrom] = useState<string | null>(null);
  const here = `${path}?${query}`;
  const busy = from === here;
  const t = useTranslations("common");

  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      setFrom(`${window.location.pathname}?${new URLSearchParams(window.location.search)}`);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setFrom(null), 12000); // never stick if navigation is cancelled
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement | null;
      if (!e.defaultPrevented && f && (f.method || "get").toLowerCase() === "get") start();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return busy ? <div className="load-bar" role="progressbar" aria-label={t("loading")} /> : null;
}
