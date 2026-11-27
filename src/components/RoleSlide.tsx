"use client";
import { useEffect } from "react";

const OUT = ["role-out-left", "role-out-right"];
const IN = ["role-in-left", "role-in-right"];
const KEY = "spotin-role-slide";

/**
 * Slide between the organizer and venue sides (UI v2). The current page slides out the moment the
 * switch is pressed; the new dashboard slides in from the opposite side when the server answers,
 * so the animation fills the wait instead of adding to it. Transform/opacity only; skipped for
 * prefers-reduced-motion.
 */
export function RoleSlide({ role }: { role: string | null }) {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form?.matches("form[data-role-switch]")) return;
      const to = (form.elements.namedItem("context") as HTMLInputElement | null)?.value;
      try {
        window.sessionStorage.setItem(KEY, to === "venue" ? "venue" : "organizer");
      } catch {}
      main.classList.remove(...OUT, ...IN);
      main.classList.add(to === "venue" ? "role-out-left" : "role-out-right");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => main.classList.remove(...OUT), 8000); // never leave the page hidden
    };
    document.addEventListener("submit", onSubmit);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  // The switch re-renders the whole layout (the action revalidates it), so this component may be a fresh
  // instance when the new side arrives: the pending slide is carried in sessionStorage, not in state.
  useEffect(() => {
    let to: string | null = null;
    try {
      to = window.sessionStorage.getItem(KEY);
      window.sessionStorage.removeItem(KEY);
    } catch {}
    const main = document.getElementById("main");
    if (!main) return;
    main.classList.remove(...OUT, ...IN);
    if (!to || to !== role || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cls = role === "venue" ? "role-in-right" : "role-in-left";
    main.classList.add(cls);
    const done = () => main.classList.remove(cls);
    main.addEventListener("animationend", done, { once: true });
    return () => main.removeEventListener("animationend", done);
  }, [role]);

  return null;
}
