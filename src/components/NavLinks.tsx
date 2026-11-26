"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Header navigation with an underline on the current section (UI v2). */
export function NavLinks({
  items,
  label,
}: {
  items: { href: string; label: string }[];
  label: string;
}) {
  const path = usePathname() ?? "/";
  const active = (href: string) => path === href || (href !== "/" && path.startsWith(`${href}/`));
  return (
    <nav
      aria-label={label}
      className="order-last -mx-1 flex w-full gap-1 overflow-x-auto lg:order-none lg:mx-0 lg:ml-6 lg:w-auto"
    >
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.href) ? "page" : undefined}
          className={cn(
            "relative shrink-0 rounded-md px-3 py-2 text-[15px] font-semibold whitespace-nowrap no-underline transition-colors hover:bg-sunken hover:no-underline",
            active(n.href)
              ? "text-ink after:absolute after:inset-x-3 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-ink lg:after:-bottom-[15px]"
              : "text-muted-foreground hover:text-ink",
          )}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
