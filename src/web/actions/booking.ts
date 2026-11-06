"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { t } from "@/lib/i18n";
import * as quotes from "@/server/quotes";
import * as bookings from "@/server/bookings";
import { markLost } from "@/server/enquiries";
import type { QuoteLine, PaymentSchedule } from "@/lib/quote-math";
import { run, str, int, bool, type ActionState } from "../action";
import { actor } from "../session";

export async function startQuoteAction(form: FormData): Promise<void> {
  const a = await actor();
  const enquiryId = str(form, "enquiryId");
  await quotes.draftQuote(a, enquiryId);
  redirect(`/venue/enquiry/${enquiryId}/penawaran`);
}

function parseDraft(form: FormData) {
  let lines: QuoteLine[] = [];
  try {
    lines = JSON.parse(str(form, "lines") || "[]") as QuoteLine[];
  } catch {
    lines = [];
  }
  const full = str(form, "mode") === "full";
  const schedule: PaymentSchedule = {
    mode: full ? "full" : "split",
    depositBps: Math.round(Number(str(form, "depositPct") || "50") * 100),
    depositDays: int(form, "depositDays") ?? 3,
    balanceDaysBefore: int(form, "balanceDaysBefore") ?? 14,
  };
  return {
    lines,
    schedule,
    validityDays: int(form, "validityDays") ?? 7,
    cancellationPolicy: str(form, "cancellationPolicy") || "moderate",
    inclusions: str(form, "inclusions"),
    exclusions: str(form, "exclusions"),
    specialTerms: str(form, "specialTerms"),
  };
}

export async function quoteDraftAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const quoteId = str(form, "quoteId");
    const op = str(form, "op");
    await quotes.updateDraft(a, quoteId, parseDraft(form));
    if (op === "send") {
      const r = await quotes.submitQuote(a, quoteId);
      // The draft form disappears once sent, so the confirmation lives on the page itself.
      redirect(`/venue/enquiry/${str(form, "enquiryId")}/penawaran?done=${r === "sent" ? "sent" : "sentForApproval"}`);
    }
    revalidatePath(`/venue/enquiry/${str(form, "enquiryId")}/penawaran`);
    return { ok: t("quoteBuilder.draftSaved") };
  });
}

export async function quoteApprovalAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const quoteId = str(form, "quoteId");
    if (str(form, "op") === "approve") await quotes.approveQuote(a, quoteId);
    else await quotes.returnQuote(a, quoteId, str(form, "comment"));
    redirect(`/venue/enquiry/${str(form, "enquiryId")}/penawaran?done=${str(form, "op") === "approve" ? "approvedSent" : "returned"}`);
  });
}

export async function organizerQuoteAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const quoteId = str(form, "quoteId");
    const op = str(form, "op");
    if (op === "accept") {
      const bookingId = await bookings.acceptQuote(a, quoteId, { acceptPilotTerms: bool(form, "pilotTerms") });
      redirect(`/pemesanan/${bookingId}?accepted=1`);
    }
    if (op === "revision") {
      const lines: Record<string, string> = {};
      for (const [k, v] of form.entries()) if (k.startsWith("line_") && typeof v === "string") lines[k.slice(5)] = v;
      await quotes.requestRevision(a, quoteId, { general: str(form, "general"), lines });
    }
    if (op === "decline") await quotes.declineQuote(a, quoteId, str(form, "reason"));
    revalidatePath(`/enquiry/${str(form, "enquiryId")}`);
    return { ok: t(`quoteView.done.${op}`) };
  });
}

export async function agreementAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await bookings.acceptAgreement(a, str(form, "bookingId"), { checked: bool(form, "read"), typedName: str(form, "typedName") });
    redirect(`/pemesanan/${str(form, "bookingId")}?done=agreement`);
  });
}

export async function startPaymentAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const paymentId = await bookings.startPayment(a, str(form, "requestId"), str(form, "method") as "test_va");
    redirect(`/pemesanan/${str(form, "bookingId")}/bayar/${str(form, "requestId")}?payment=${paymentId}`);
  });
}

export async function simulatePaymentAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await bookings.simulatePayment(a, str(form, "paymentId"), str(form, "outcome") as "paid");
    revalidatePath(`/pemesanan/${str(form, "bookingId")}`);
    redirect(`/pemesanan/${str(form, "bookingId")}/bayar/${str(form, "requestId")}?payment=${str(form, "paymentId")}`);
  });
}

export async function extendBalanceAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await bookings.extendBalance(a, str(form, "bookingId"), int(form, "days") ?? 0);
    redirect(`/pemesanan/${str(form, "bookingId")}?done=extended`);
  });
}

export async function markLostAction(form: FormData): Promise<void> {
  const a = await actor();
  await markLost(a, str(form, "enquiryId"), str(form, "feedback"));
  revalidatePath(`/pemesanan/${str(form, "bookingId")}`);
}
