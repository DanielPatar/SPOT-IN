"use client";
import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal scroll-snap rail with arrow buttons; swipe and keyboard scrolling keep working. */
export function Carousel({
  children,
  label,
  prev,
  next,
}: {
  children: ReactNode;
  label: string;
  prev: string;
  next: string;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const move = (dir: 1 | -1) =>
    rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });
  const btn =
    "grid size-11 place-items-center rounded-full border border-line-strong bg-white text-ink transition-colors hover:border-ink hover:bg-sunken";
  return (
    <div>
      <ul
        ref={rail}
        aria-label={label}
        tabIndex={0}
        className="rail m-0 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth p-0 pb-2"
      >
        {children}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={btn} aria-label={prev} onClick={() => move(-1)}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button type="button" className={btn} aria-label={next} onClick={() => move(1)}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
