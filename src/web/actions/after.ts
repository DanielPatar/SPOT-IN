"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { t } from "@/lib/i18n";
import * as life from "@/server/lifecycle";
import * as pages from "@/server/event-pages";
import { contactUs, type ContactSubject } from "@/server/contact";
import { formFiles } from "@/server/files";
import { run, str, int, bool, type ActionState } from "../action";
import { actor, clientIp, getSession, requireAdminPage } from "../session";

// ---------------------------------------------------------------------------
// Booking: documents, at risk, cancellation, no-show, problems (M17, M18, M16)
// ---------------------------------------------------------------------------
export async function uploadDocumentAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const [file] = await formFiles(form, "file");
    if (!file) return { error: t("files.empty") };
    await life.uploadDocument(a, str(form, "documentId"), file);
    revalidatePath(`/pemesanan/${str(form, "bookingId")}`);
    return { ok: t("checklistPanel.uploaded") };
  });
}

export async function reviewDocumentAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const op = str(form, "op") as "approve" | "changes" | "waive";
    await life.reviewDocument(a, str(form, "documentId"), op, str(form, "comment"));
    // An approved or waived item loses its form, so the confirmation lives on the page.
    redirect(`/pemesanan/${str(form, "bookingId")}?done=doc_${op}`);
  });
}

export async function atRiskAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const on = str(form, "op") === "set";
    await life.setAtRisk(a, str(form, "bookingId"), on, str(form, "reason"));
    revalidatePath(`/pemesanan/${str(form, "bookingId")}`);
    return { ok: t(on ? "atRisk.set" : "atRisk.cleared") };
  });
}

export async function cancelBookingAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const bookingId = str(form, "bookingId");
    if (!bool(form, "confirm")) return { error: t("cancelPanel.confirmRequired") };
    if (str(form, "side") === "venue") await life.cancelByVenue(a, bookingId, str(form, "reason"));
    else await life.cancelByOrganizer(a, bookingId, { reason: str(form, "reason"), expectedRefund: int(form, "expectedRefund") ?? -1 });
    redirect(`/pemesanan/${bookingId}?done=cancelled`);
  });
}

export async function noShowAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    if (!bool(form, "confirm")) return { error: t("cancelPanel.confirmRequired") };
    await life.recordNoShow(a, str(form, "bookingId"));
    redirect(`/pemesanan/${str(form, "bookingId")}?done=cancelled`);
  });
}

export async function reportProblemAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await life.reportProblem(a, str(form, "bookingId"), str(form, "description"), await formFiles(form, "photos"));
    revalidatePath(`/pemesanan/${str(form, "bookingId")}`);
    return { ok: t("problemPanel.reported") };
  });
}

export async function resolveProblemAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const s = await requireAdminPage(); // admin session with 2FA passed (FR-M24-12)
    const a = { userId: s.userId, ip: await clientIp() };
    const outcome = str(form, "outcome") === "adjusted" ? "adjusted" : "release_as_is";
    await life.resolveProblem(a, str(form, "problemId"), { outcome, adjustment: int(form, "adjustment") ?? 0, note: str(form, "note") });
    redirect("/admin/masalah?done=1");
  });
}

// ---------------------------------------------------------------------------
// Event pages (M28, M30)
// ---------------------------------------------------------------------------
function parsePage(form: FormData): pages.PageInput {
  let questions: pages.Question[] = [];
  try {
    questions = JSON.parse(str(form, "questions") || "[]");
  } catch {
    questions = [];
  }
  const days = form.getAll("sessionDay").map(String);
  return {
    title: str(form, "title"),
    summary: str(form, "summary"),
    description: str(form, "description"),
    category: str(form, "category"),
    ageNote: str(form, "ageNote"),
    questions,
    closeMode: str(form, "closeMode") === "manual" ? "manual" : "session_start",
    sessions: days.map((day) => ({ day, start: str(form, `start_${day}`), end: str(form, `end_${day}`), capacity: int(form, `capacity_${day}`) ?? 0 })),
  };
}

export async function saveEventPageAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const eventId = str(form, "eventId");
    const [cover] = await formFiles(form, "cover");
    const r = await pages.saveEventPage(a, eventId, parsePage(form), { confirmNotify: bool(form, "confirmNotify"), coverFile: cover });
    if (r.needsConfirm) {
      // React resets the form after an action; send the typed values back so the confirmation keeps them.
      const values: Record<string, string> = {};
      for (const [k, v] of form.entries()) if (typeof v === "string" && k !== "confirmNotify") values[k] = v;
      return { data: { needsConfirm: r.needsConfirm, values } };
    }
    if (str(form, "op") === "publish") {
      await pages.publishEventPage(a, r.pageId);
      redirect(`/acara/${eventId}/halaman?done=published`);
    }
    redirect(`/acara/${eventId}/halaman?done=saved`);
  });
}

export async function registrationOpenAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const open = str(form, "op") === "open";
    await pages.setRegistrationOpen(a, str(form, "pageId"), open);
    revalidatePath(`/acara/${str(form, "eventId")}/halaman`);
    return { ok: t(open ? "pageEditor.reopened" : "pageEditor.closedNow") };
  });
}

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const s = await getSession();
    const answers: Record<string, string> = {};
    for (const [k, v] of form.entries()) if (k.startsWith("answer_") && typeof v === "string") answers[k.slice(7)] = v;
    const slug = str(form, "slug");
    const r = await pages.register({
      slug,
      sessionId: str(form, "sessionId"),
      name: str(form, "name"),
      email: str(form, "email"),
      answers,
      ageConfirmed: bool(form, "age"),
      acceptedPilotNotice: bool(form, "pilot"),
      ip: await clientIp(),
      sessionUserId: s?.userId ?? null,
    });
    if (r.status === "confirmed") redirect(`/kartu/${r.passToken}`);
    redirect(`/e/${slug}?sent=${encodeURIComponent(str(form, "email"))}`);
  });
}

export async function cancelRegistrationAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await pages.cancelOwnRegistration(a, str(form, "registrationId"));
    revalidatePath("/kartu-saya");
    return { ok: t("myPasses.cancelled") };
  });
}

export async function organizerCancelRegistrationAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await pages.organizerCancelRegistration(a, str(form, "registrationId"), str(form, "message"));
    revalidatePath(`/acara/${str(form, "eventId")}/peserta`);
    return { ok: t("attendeeList.cancelledOne") };
  });
}

export async function checkInAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const op = str(form, "op");
    if (op === "undo") await pages.undoCheckIn(a, str(form, "passId"));
    else await pages.checkIn(a, str(form, "passId"));
    // The check-in button disappears once used, so the confirmation is shown by the page it returns to.
    const back = str(form, "back").startsWith("/") ? str(form, "back") : "/";
    const u = new URL(back, "http://x");
    u.searchParams.set("done", op === "undo" ? "undo" : "checkin");
    u.searchParams.set("who", str(form, "name"));
    redirect(`${u.pathname}${u.search}`);
  });
}

// ---------------------------------------------------------------------------
// Reports and Hubungi kami (M36, M26)
// ---------------------------------------------------------------------------
export async function reportAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const s = await getSession();
    const type = str(form, "type") === "space" ? "space" : "event_page";
    await pages.report({ subjectType: type, subjectId: str(form, "id"), reason: str(form, "reason"), text: str(form, "text"), reporterId: s?.userId ?? null, ip: await clientIp() });
    return { ok: t("reportForm.sent") };
  });
}

export async function contactAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const type = str(form, "type");
    await contactUs(a, { subjectType: (["booking", "enquiry", "event_page"].includes(type) ? type : null) as ContactSubject | null, subjectId: str(form, "id") || null, text: str(form, "text") });
    return { ok: t("contactForm.sent") };
  });
}
