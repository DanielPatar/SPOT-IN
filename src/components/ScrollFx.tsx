"use client";
import { useEffect } from "react";

/**
 * Scroll-linked motion for the home page (UI v2). Works in both directions — everything is derived
 * from the current scroll position, so scrolling back up plays it in reverse:
 * - [data-hero]            exposes --hero (0 → 1 while the hero scrolls out) for the zoom/fade
 * - [data-drift="±px"]     slides sideways while the element crosses the viewport
 * - [data-parallax="0.x"]  moves an image slower than the page inside its frame
 * - #site-header           transparent over the hero at the top, solid after; hides while scrolling down,
 *                          returns when scrolling up
 * Off for prefers-reduced-motion.
 */
export function ScrollFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const header = document.getElementById("site-header");
    let last = window.scrollY;
    let frame = 0;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>("[data-hero]")) {
        el.style.setProperty("--hero", clamp(y / Math.max(1, el.offsetHeight)).toFixed(3));
      }
      for (const el of document.querySelectorAll<HTMLElement>("[data-drift]")) {
        const r = el.getBoundingClientRect();
        // 0 when the element's top reaches the bottom of the screen, 1 once it is 45% up the screen
        const p = clamp((vh - r.top) / (vh * 0.55));
        el.style.transform = `translate3d(${((1 - p) * Number(el.dataset.drift)).toFixed(1)}px,0,0)`;
        el.style.opacity = (0.25 + 0.75 * p).toFixed(3);
      }
      for (const el of document.querySelectorAll<HTMLElement>("[data-parallax]")) {
        const r = (el.parentElement ?? el).getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const offset = (r.top + r.height / 2 - vh / 2) * -Number(el.dataset.parallax);
        el.style.transform = `translate3d(0,${offset.toFixed(1)}px,0) scale(1.18)`;
      }
      if (header) {
        // Transparent over the hero at the very top, solid once the page moves (styles in globals.css).
        header.classList.toggle("header-solid", y > 16);
        document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
        const down = y > last && y > 240;
        if (Math.abs(y - last) > 6) header.classList.toggle("header-away", down);
      }
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      header?.classList.remove("header-away", "header-solid");
      document.documentElement.style.removeProperty("--header-h");
    };
  }, []);
  return null;
}
