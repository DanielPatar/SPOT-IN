"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Makes the <details data-pop> filter pills behave like popovers: only one open at a time,
 * closed by a click outside or Escape. Without JavaScript they still open and close as plain <details>.
 */
export function FilterPopovers({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const pops = () => Array.from(el.querySelectorAll<HTMLDetailsElement>("details[data-pop]"));
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.open) for (const o of pops()) if (o !== d) o.open = false;
    };
    const onDown = (e: MouseEvent) => {
      for (const o of pops()) if (o.open && !o.contains(e.target as Node)) o.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      for (const o of pops()) {
        if (o.open) {
          o.open = false;
          o.querySelector("summary")?.focus();
        }
      }
    };
    el.addEventListener("toggle", onToggle, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
