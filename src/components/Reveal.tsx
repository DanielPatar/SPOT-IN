"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades its children in when they scroll into view and out when they leave, in both scroll directions.
 * Content is visible without JavaScript:
 * the hidden state is only applied after mount, and never with prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Two-way: the element eases out again when it leaves, upwards or downwards, and back in on return.
    el.classList.add("reveal-wait");
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) el.classList.add("reveal-in");
        else {
          el.dataset.side = e.boundingClientRect.top < 0 ? "above" : "below";
          el.classList.remove("reveal-in");
        }
      },
      { rootMargin: "-6% 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <As
      ref={ref as never}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </As>
  );
}
