"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { t } from "@/lib/i18n";
import * as search from "@/server/search";
import * as enq from "@/server/enquiries";
import { quickEstimate } from "@/server/listings";
import { reportSpace } from "@/server/messaging";
import { formFiles } from "@/server/files";
import { formatRupiah } from "@/lib/money";
import { run, str, int, all, type ActionState } from "../action";
import { actor } from "../session";

export async function createShortlistAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const id = await search.createShortlist(a, str(form, "name"));
    const spaceId = str(form, "spaceId");
    if (spaceId) {
      await search.addToShortlist(a, id, spaceId, str(form, "note"));
      return { ok: t("shortlist.added") };
    }
    redirect(`/shortlist/${id}`);
  });
}

export async function addToShortlistAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await search.addToShortlist(a, str(form, "shortlistId"), str(form, "spaceId"), str(form, "note"));
    return { ok: t("shortlist.added") };
  });
}

export async function shortlistItemAction(form: FormData): Promise<void> {
  const a = await actor();
  const id = str(form, "shortlistId");
  if (str(form, "op") === "remove") await search.removeFromShortlist(a, id, str(form, "spaceId"));
  else await search.updateShortlistNote(a, id, str(form, "spaceId"), str(form, "note"));
  revalidatePath(`/shortlist/${id}`);
}

export async function shareLinkAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const id = str(form, "shortlistId");
    if (str(form, "op") === "revoke") await search.revokeShareLink(a, id, str(form, "linkId"));
    else await search.createShareLink(a, id);
    revalidatePath(`/shortlist/${id}`);
    return { ok: t(str(form, "op") === "revoke" ? "shortlist.linkRevoked" : "shortlist.linkCreated") };
  });
}

export async function deleteShortlistAction(form: FormData): Promise<void> {
  const a = await actor();
  await search.deleteShortlist(a, str(form, "shortlistId"));
  redirect("/shortlist");
}

function eventInput(form: FormData): enq.EventInput {
  const dates = form.getAll("dayDate").map(String);
  const starts = form.getAll("dayStart").map(String);
  const ends = form.getAll("dayEnd").map(String);
  return {
    name: str(form, "name"),
    type: str(form, "type"),
    brand: str(form, "brand"),
    category: str(form, "category"),
    description: str(form, "description"),
    expectedAttendance: int(form, "attendance") ?? 0,
    days: dates.map((date, i) => ({ date, start: starts[i] ?? "10:00", end: ends[i] ?? "21:00" })).filter((d) => d.date),
    budgetMin: int(form, "budgetMin"),
    budgetMax: int(form, "budgetMax"),
    requiredFacilities: all(form, "facilities"),
  };
}

export async function createEventAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const id = await enq.createEvent(a, eventInput(form), await formFiles(form, "files"));
    const spaces = str(form, "spaces");
    redirect(spaces ? `/acara/${id}/kirim?spaces=${encodeURIComponent(spaces)}` : `/acara/${id}`);
  });
}

export async function updateEventAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const id = str(form, "eventId");
    await enq.updateEvent(a, id, eventInput(form));
    const files = await formFiles(form, "files");
    if (files.length) await enq.addEventFiles(a, id, files);
    redirect(`/acara/${id}`);
  });
}

export async function sendEnquiriesAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const eventId = str(form, "eventId");
    const spaceIds = all(form, "spaceId");
    const answers: Record<string, Record<string, string>> = {};
    for (const [k, v] of form.entries()) {
      const m = /^answer_([0-9a-f-]{36})_(q\d+)$/.exec(k);
      if (m && typeof v === "string") (answers[m[1]!] ??= {})[m[2]!] = v;
    }
    await enq.sendEnquiries(a, eventId, spaceIds, answers);
    redirect(`/acara/${eventId}?sent=${spaceIds.length}`);
  });
}

export async function organizerEnquiryAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const id = str(form, "enquiryId");
    const op = str(form, "op");
    if (op === "withdraw") await enq.withdrawEnquiry(a, id);
    if (op === "lost") await enq.markLost(a, id, str(form, "feedback"));
    revalidatePath(`/enquiry/${id}`);
    return { ok: t(`organizerEnquiry.done.${op}`) };
  });
}

export async function estimateAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const dates = form.getAll("dayDate").map(String);
    const starts = form.getAll("dayStart").map(String);
    const ends = form.getAll("dayEnd").map(String);
    const addOnIds = all(form, "addOn");
    const quantities: Record<string, number> = {};
    for (const id of addOnIds) {
      const q = int(form, `qty_${id}`);
      if (q) quantities[id] = q;
    }
    const r = await quickEstimate(str(form, "spaceId"), {
      days: dates.map((date, i) => ({ date, start: starts[i] ?? "10:00", end: ends[i] ?? "21:00" })).filter((d) => d.date),
      addOnIds,
      quantities,
    });
    return {
      ok: t("estimate.result", { total: formatRupiah(r.organizerTotal) }),
      data: {
        lines: r.lines.map((l) => ({ label: l.label, quantity: l.quantity, amount: formatRupiah(l.amount) })),
        rental: formatRupiah(r.rentalAndAddOns),
        service: formatRupiah(r.serviceCharge),
        ppn: formatRupiah(r.ppn),
        venueTotal: formatRupiah(r.venueTotal),
        fee: formatRupiah(r.organizerFee),
        total: formatRupiah(r.organizerTotal),
      },
    };
  });
}

export async function reportSpaceAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await reportSpace(await actor(), str(form, "spaceId"), str(form, "reason"), str(form, "text"));
    return { ok: t("report.sent") };
  });
}
