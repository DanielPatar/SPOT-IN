import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LEVELS = [1, 2, 3, 4] as const;

/** 💰 cost tier (1–4). Filled coins = tier, faded = remaining; the label is read out, not the emoji. */
export function BudgetLevel({
  level,
  size = "md",
  withName = false,
  className,
}: {
  level: number | null | undefined;
  size?: "sm" | "md" | "lg";
  withName?: boolean;
  className?: string;
}) {
  if (!level) return null;
  const name = t(`budget.levels.${level}`);
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={t("budget.label", { n: level, name })}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex tracking-tight",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-2xl",
        )}
      >
        {LEVELS.map((i) => (
          <span key={i} className={i <= level ? "" : "opacity-25 grayscale"}>
            {t("budget.symbol")}
          </span>
        ))}
      </span>
      {withName ? (
        <span aria-hidden="true" className="text-sm font-semibold text-ink">
          {name}
        </span>
      ) : null}
    </span>
  );
}

/** Legend explaining the four tiers. */
export function BudgetLegend({ current }: { current?: number | null }) {
  return (
    <ul className="m-0 grid list-none gap-2.5 p-0">
      {LEVELS.map((i) => (
        <li
          key={i}
          className={cn("grid gap-1 rounded-lg p-2 text-sm", current === i && "bg-brand-soft")}
        >
          <BudgetLevel level={i} size="sm" />
          <span>
            <span className="block font-semibold text-ink">{t(`budget.levels.${i}`)}</span>
            <span className="text-muted-foreground">{t(`budget.desc.${i}`)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
