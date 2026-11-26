import { ArrowRight, CheckCircle2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STEPS = ["enquiry", "discuss", "quote", "negotiate", "agree"] as const;
export type DealStep = (typeof STEPS)[number] | "closed";

/** Where an enquiry stands between organizer and venue, from its status and latest quote. */
export function dealStep(
  enquiryStatus: string,
  latestQuote?: { status: string; revision_comments?: unknown } | null,
): DealStep {
  if (enquiryStatus === "accepted" || latestQuote?.status === "accepted") return "agree";
  if (["declined", "expired", "withdrawn", "lost"].includes(enquiryStatus)) return "closed";
  if (latestQuote?.status === "sent") return latestQuote.revision_comments ? "negotiate" : "quote";
  if (["info_requested", "responded", "quoted"].includes(enquiryStatus)) return "discuss";
  return "enquiry";
}

/** The path from enquiry to agreement, with one plain sentence on what happens next (UI v2). */
export function DealSteps({
  step,
  side,
  action,
}: {
  step: DealStep;
  side: "organizer" | "venue";
  action?: React.ReactNode;
}) {
  const current = step === "closed" ? -1 : STEPS.indexOf(step);
  return (
    <section
      aria-label={t("deal.label")}
      className="mb-6 rounded-2xl border border-line bg-surface p-5"
    >
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1 gap-y-2 p-0">
        {STEPS.map((s, i) => {
          const done = current > i || step === "agree";
          const now = current === i && step !== "agree";
          return (
            <li key={s} aria-current={now ? "step" : undefined} className="flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                  done && "border-brand/20 bg-brand-soft text-brand",
                  now && "border-ink bg-ink text-white",
                  !done && !now && "border-line text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                ) : (
                  <span className="num">{i + 1}</span>
                )}
                {t(`deal.steps.${s}`)}
              </span>
              {i < STEPS.length - 1 ? (
                <ArrowRight className="size-3.5 text-line-strong" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-2xl text-[15px] text-ink">
          <span className="font-bold">{t("deal.nextTitle")}: </span>
          {t(`deal.${side}.${step}`)}
        </p>
        {action}
      </div>
    </section>
  );
}

/** Short "how booking works" list for the space page. */
export function HowBookingWorks() {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <h2 className="mt-0 mb-3 text-base">{t("deal.howTitle")}</h2>
      <ol className="m-0 grid list-none gap-2.5 p-0 text-sm">
        {[1, 2, 3, 4].map((n) => (
          <li key={n} className="grid grid-cols-[24px_1fr] gap-2">
            <span className="num grid size-6 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
              {n}
            </span>
            <span className="text-ink">{t(`deal.how.${n}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
