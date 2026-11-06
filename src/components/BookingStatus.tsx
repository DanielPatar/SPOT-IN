import { t } from "@/lib/i18n";
import { Status, type Tone } from "./kit";

export function BookingStatus({ status }: { status: string }) {
  const tone: Tone = ["confirmed", "fully_paid", "settled", "in_progress"].includes(status)
    ? "positive"
    : ["pending_agreement_and_deposit", "balance_due", "post_event_window", "on_hold"].includes(status)
      ? "waiting"
      : status === "lapsed" || status.startsWith("cancelled")
        ? "danger"
        : "neutral";
  return <Status tone={tone}>{t(`bookingStatus.${status}`)}</Status>;
}

/** Index into BOOKING_STEPS for the progress strip. */
export function bookingStep(status: string, agreementDone: boolean): number {
  switch (status) {
    case "pending_agreement_and_deposit":
      return agreementDone ? 2 : 1;
    case "confirmed":
    case "balance_due":
      return 4;
    case "fully_paid":
    case "in_progress":
      return 5;
    case "post_event_window":
    case "on_hold":
      return 6;
    case "settled":
      return 7;
    default:
      return 0;
  }
}
