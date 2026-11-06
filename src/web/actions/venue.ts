"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { t } from "@/lib/i18n";
import * as listings from "@/server/listings";
import * as calendar from "@/server/calendar";
import * as orgs from "@/server/orgs";
import * as enq from "@/server/enquiries";
import * as msg from "@/server/messaging";
import { formFiles } from "@/server/files";
import { run, str, int, bool, all, type ActionState } from "../action";
import { actor } from "../session";

const WEEKDAYS = listings.WEEKDAYS;

export async function savePropertyAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const lat = str(form, "lat") ? Number(str(form, "lat")) : null;
    const lon = str(form, "lon") ? Number(str(form, "lon")) : null;
    const hours: Record<string, { open: string; close: string } | null> = {};
    for (const d of WEEKDAYS) hours[d] = bool(form, `${d}_closed`) ? null : { open: str(form, `${d}_open`) || "10:00", close: str(form, `${d}_close`) || "22:00" };
    const names = form.getAll("docName").map(String);
    const docs = names.map((name, i) => ({ name, mandatory: form.getAll("docMandatory").map(String).includes(String(i)), dueOffsetDays: Number(form.getAll("docDue")[i] ?? 7) }));
    await listings.saveProperty(a, {
      name: str(form, "name"),
      type: str(form, "type"),
      addressText: str(form, "addressText"),
      city: str(form, "city"),
      area: str(form, "area"),
      lat: lat !== null && Number.isFinite(lat) ? lat : null,
      lon: lon !== null && Number.isFinite(lon) ? lon : null,
      timezone: str(form, "timezone") || null,
      operatingHours: hours,
      parkingNotes: str(form, "parkingNotes"),
      loadingNotes: str(form, "loadingNotes"),
      houseRules: str(form, "houseRules"),
      requiredDocs: docs,
    });
    const files = await formFiles(form, "photos");
    if (files.length) await listings.addPropertyPhotos(a, files);
    revalidatePath("/venue");
    return { ok: t("common.saved") };
  });
}

function spaceInput(form: FormData): listings.SpaceInput {
  const caps: Record<string, number> = {};
  for (const l of listings.LAYOUTS) {
    const v = int(form, `cap_${l}`);
    if (v) caps[l] = v;
  }
  const num = (k: string) => (str(form, k) ? Number(str(form, k).replace(",", ".")) : null);
  return {
    name: str(form, "name"),
    type: str(form, "type"),
    levelText: str(form, "levelText"),
    areaM2: num("areaM2"),
    ceilingHeightM: num("ceilingHeightM"),
    capacities: caps,
    powerKva: int(form, "powerKva"),
    environment: (str(form, "environment") || "indoor") as "indoor",
    wifi: bool(form, "wifi"),
    accessibilityNotes: str(form, "accessibilityNotes"),
    permittedActivities: all(form, "activities"),
    prohibitedCategories: str(form, "prohibitedCategories"),
    minDays: int(form, "minDays") ?? 1,
    maxDays: int(form, "maxDays"),
    videoUrl: str(form, "videoUrl"),
    enquiryQuestions: form.getAll("question").map(String),
    cancellationPolicy: (str(form, "cancellationPolicy") || "moderate") as "moderate",
    bufferHours: int(form, "bufferHours") ?? 0,
  };
}

export async function createSpaceAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const id = await listings.createSpace(a, spaceInput(form));
    redirect(`/venue/ruang/${id}`);
  });
}

export async function updateSpaceAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await listings.updateSpace(a, str(form, "spaceId"), spaceInput(form));
    revalidatePath(`/venue/ruang/${str(form, "spaceId")}`);
    return { ok: t("common.saved") };
  });
}

export async function spacePhotosAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const spaceId = str(form, "spaceId");
    const captions: Record<string, string> = {};
    for (const [k, v] of form.entries()) if (k.startsWith("caption_") && typeof v === "string") captions[k.slice(8)] = v;
    await listings.updateSpacePhotos(a, spaceId, { coverFileId: str(form, "cover") || undefined, captions, removeFileIds: all(form, "remove") });
    const files = await formFiles(form, "photos");
    if (files.length) await listings.addSpacePhotos(a, spaceId, files);
    revalidatePath(`/venue/ruang/${spaceId}`);
    return { ok: t("common.saved") };
  });
}

export async function rateCardAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const spaceId = str(form, "spaceId");
    const weekday = int(form, "weekdayPrice");
    if (weekday === null) return { error: t("errors.amountInvalid") };
    await listings.setRateCard(a, spaceId, {
      unit: (str(form, "unit") || "day") as "day",
      weekdayPrice: weekday,
      weekendPrice: int(form, "weekendPrice"),
      minUnits: int(form, "minUnits") ?? 1,
      minSpend: int(form, "minSpend"),
      showFullRateCard: str(form, "display") !== "from",
      fromPrice: int(form, "fromPrice"),
    });
    revalidatePath(`/venue/ruang/${spaceId}`);
    return { ok: t("common.saved") };
  });
}

export async function addSeasonAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const spaceId = str(form, "spaceId");
    await listings.addSeason(a, spaceId, { name: str(form, "name"), startDate: str(form, "startDate"), endDate: str(form, "endDate"), price: int(form, "price") ?? -1 });
    revalidatePath(`/venue/ruang/${spaceId}`);
    return { ok: t("common.saved") };
  });
}

export async function removeSeasonAction(form: FormData): Promise<void> {
  const a = await actor();
  await listings.removeSeason(a, str(form, "spaceId"), str(form, "seasonId"));
  revalidatePath(`/venue/ruang/${str(form, "spaceId")}`);
}

export async function spaceStatusAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const spaceId = str(form, "spaceId");
    const op = str(form, "op");
    if (op === "submit") await listings.submitSpace(a, spaceId);
    else if (op === "publish") await listings.setPublished(a, spaceId, true);
    else if (op === "unpublish") await listings.setPublished(a, spaceId, false);
    else if (op === "duplicate") redirect(`/venue/ruang/${await listings.duplicateSpace(a, spaceId)}`);
    revalidatePath(`/venue/ruang/${spaceId}`);
    return { ok: t(`spaces.statusDone.${op}`) };
  });
}

export async function blockAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const spaceId = str(form, "spaceId");
    const n = await calendar.blockDates(a, spaceId, {
      from: str(form, "from"),
      to: str(form, "to") || str(form, "from"),
      reason: str(form, "reason"),
      weeklyUntil: bool(form, "weekly") ? str(form, "weeklyUntil") : null,
    });
    revalidatePath(`/venue/ruang/${spaceId}/kalender`);
    return { ok: t("calendar.blocked", { n }) };
  });
}

export async function removeBlockAction(form: FormData): Promise<void> {
  const a = await actor();
  await calendar.removeBlock(a, str(form, "spaceId"), str(form, "entryId"), bool(form, "series"));
  revalidatePath(`/venue/ruang/${str(form, "spaceId")}/kalender`);
}

export async function orgProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    let logoFileId: string | null = null;
    const [logo] = await formFiles(form, "logo");
    if (logo) logoFileId = (await (await import("@/server/files")).storeUpload(a.userId, "logo", logo)).id;
    await orgs.updateOrganization(a, str(form, "orgId"), {
      displayName: str(form, "displayName"),
      legalName: str(form, "legalName"),
      city: str(form, "city"),
      contactEmail: str(form, "contactEmail"),
      contactPhone: str(form, "contactPhone"),
      logoFileId,
    });
    revalidatePath("/venue/pengaturan");
    revalidatePath("/organizer/tim");
    return { ok: t("common.saved") };
  });
}

export async function thresholdAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await orgs.setApprovalThreshold(a, str(form, "orgId"), int(form, "threshold"));
    return { ok: t("common.saved") };
  });
}

export async function taxAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const pct = Number((str(form, "serviceCharge") || "0").replace(",", "."));
    await listings.setTaxSettings(a, { isPkp: bool(form, "isPkp"), serviceChargeBps: Math.round(pct * 100) });
    return { ok: t("common.saved") };
  });
}

export async function addOnAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await listings.saveAddOn(a, { id: str(form, "id") || undefined, name: str(form, "name"), unit: str(form, "unit"), price: int(form, "price") ?? -1, taxable: bool(form, "taxable"), mandatory: bool(form, "mandatory") });
    revalidatePath("/venue/pengaturan");
    return { ok: t("common.saved") };
  });
}

export async function removeAddOnAction(form: FormData): Promise<void> {
  const a = await actor();
  await listings.removeAddOn(a, str(form, "id"));
  revalidatePath("/venue/pengaturan");
}

export async function savedReplyAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await msg.saveSavedReply(a, { title: str(form, "title"), body: str(form, "body") });
    revalidatePath("/venue/pengaturan");
    return { ok: t("common.saved") };
  });
}

export async function removeSavedReplyAction(form: FormData): Promise<void> {
  const a = await actor();
  await msg.removeSavedReply(a, str(form, "id"));
  revalidatePath("/venue/pengaturan");
}

// --- team (both kinds of organization) ---
export async function inviteMemberAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    await orgs.inviteMember(a, str(form, "orgId"), str(form, "email"), str(form, "role"));
    revalidatePath(str(form, "path") || "/venue/tim");
    return { ok: t("team.invited") };
  });
}

export async function teamAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const orgId = str(form, "orgId");
    const op = str(form, "op");
    if (op === "role") await orgs.changeRole(a, orgId, str(form, "userId"), str(form, "role"));
    if (op === "transfer") await orgs.transferOwnership(a, orgId, str(form, "userId"));
    if (op === "remove") await orgs.removeMember(a, orgId, str(form, "userId"), str(form, "reassignTo"));
    if (op === "resend") await orgs.resendInvite(a, orgId, str(form, "inviteId"));
    if (op === "revoke") await orgs.revokeInvite(a, orgId, str(form, "inviteId"));
    if (op === "submitVerification") await orgs.submitForVerification(a, orgId);
    revalidatePath(str(form, "path") || "/venue/tim");
    return { ok: t("common.saved") };
  });
}

// --- enquiries (venue side) ---
export async function venueEnquiryAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await actor();
    const id = str(form, "enquiryId");
    const op = str(form, "op");
    if (op === "requestInfo") await enq.requestInfo(a, id, str(form, "text"));
    if (op === "decline") await enq.declineEnquiry(a, id, str(form, "reason"), str(form, "note"));
    if (op === "hold") await calendar.placeTentativeHold(a, id, int(form, "days") ?? undefined);
    if (op === "releaseHold") await calendar.releaseTentativeHold(a, id);
    if (op === "notes") await enq.saveInternalNotes(a, id, str(form, "notes"), str(form, "assignee") || null);
    revalidatePath(`/venue/enquiry/${id}`);
    return { ok: t(`venueEnquiry.done.${op}`) };
  });
}
