"use server";
import { revalidatePath } from "next/cache";
import { t } from "@/lib/i18n";
import * as admin from "@/server/admin";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/settings";
import { run, str, int, type ActionState } from "../action";
import { requireAdminPage, clientIp } from "../session";

async function adminActor() {
  const s = await requireAdminPage();
  return { userId: s.userId, ip: await clientIp() };
}

export async function invitePilotAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await admin.invitePilotUser(await adminActor(), str(form, "email"), (str(form, "roleHint") || "both") as "both");
    revalidatePath("/admin/undangan");
    return { ok: t("admin.invited") };
  });
}

export async function revokePilotInviteAction(form: FormData): Promise<void> {
  await admin.revokePilotInvite(await adminActor(), str(form, "id"));
  revalidatePath("/admin/undangan");
}

export async function verificationAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await adminActor();
    if (str(form, "op") === "verify") await admin.verifyOrganization(a, str(form, "orgId"), { method: str(form, "method"), note: str(form, "note") });
    else await admin.rejectOrganization(a, str(form, "orgId"), str(form, "reason"));
    revalidatePath("/admin/verifikasi");
    return { ok: t("common.saved") };
  });
}

export async function spaceReviewAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await adminActor();
    if (str(form, "op") === "approve") await admin.approveSpace(a, str(form, "spaceId"));
    else await admin.rejectSpace(a, str(form, "spaceId"), str(form, "reason"));
    revalidatePath("/admin/ruang");
    return { ok: t("common.saved") };
  });
}

export async function reportDecisionAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await admin.decideReport(await adminActor(), str(form, "reportId"), str(form, "op") === "dismiss" ? "dismiss" : "suspend_subject", str(form, "note"));
    revalidatePath("/admin/laporan");
    return { ok: t("common.saved") };
  });
}

export async function suspendAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await admin.setSuspended(await adminActor(), { type: str(form, "type") as "user", id: str(form, "id") }, str(form, "op") === "suspend", str(form, "reason"));
    revalidatePath("/admin/cari");
    return { ok: t("common.saved") };
  });
}

export async function settingAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const key = str(form, "key") as SettingKey;
    const def = DEFAULT_SETTINGS[key];
    let value: unknown = str(form, "value");
    if (typeof def === "number") value = int(form, "value");
    else if (typeof def === "object") value = JSON.parse(str(form, "value"));
    await admin.updateSetting(await adminActor(), key, value);
    revalidatePath("/admin/pengaturan");
    return { ok: t("common.saved") };
  });
}

export async function holidayAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const a = await adminActor();
    if (str(form, "op") === "remove") await admin.removeHoliday(a, str(form, "date"));
    else await admin.addHoliday(a, str(form, "date"), str(form, "name"), (str(form, "kind") || "national") as "national");
    revalidatePath("/admin/pengaturan");
    return { ok: t("common.saved") };
  });
}

export async function demoClockAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const hours = Number(str(form, "hours")) || 0;
    const days = Number(str(form, "days")) || 0;
    const n = await admin.advanceDemoClock(await adminActor(), (days * 24 + hours) * 3600_000);
    revalidatePath("/admin");
    return { ok: t("admin.clockMoved", { n }) };
  });
}

export async function runJobsAction(_: ActionState): Promise<ActionState> {
  return run(async () => {
    await adminActor();
    const { tick } = await import("@/lib/jobs");
    return { ok: t("admin.jobsRun", { n: await tick() }) };
  });
}

