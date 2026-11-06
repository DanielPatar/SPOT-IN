"use server";
import { t } from "@/lib/i18n";
import * as msg from "@/server/messaging";
import { formFiles } from "@/server/files";
import { run, str } from "../action";
import { actor } from "../session";

export async function postMessageAction(form: FormData): Promise<{ error?: string; masked?: boolean }> {
  let masked = false;
  const r = await run(async () => {
    const a = await actor();
    const res = await msg.postMessage(a, str(form, "enquiryId"), { body: str(form, "body"), files: await formFiles(form, "files") });
    masked = res.masked;
  });
  return { error: r.error, masked };
}

export async function editMessageAction(form: FormData): Promise<{ error?: string }> {
  const r = await run(async () => {
    await msg.editMessage(await actor(), str(form, "messageId"), str(form, "body"));
  });
  return { error: r.error };
}

export async function deleteMessageAction(form: FormData): Promise<{ error?: string }> {
  const r = await run(async () => {
    await msg.deleteMessage(await actor(), str(form, "messageId"));
  });
  return { error: r.error };
}

export async function reportMessageAction(form: FormData): Promise<{ error?: string }> {
  const r = await run(async () => {
    await msg.reportMessage(await actor(), str(form, "messageId"), str(form, "reason") || "inappropriate");
    return { ok: t("thread.reported") };
  });
  return { error: r.error ?? undefined };
}
