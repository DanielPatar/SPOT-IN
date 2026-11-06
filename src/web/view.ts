import "server-only";
import { redirect } from "next/navigation";
import { signedFileUrl } from "@/adapters/storage";
import { requireSession, memberships } from "./session";
import { formatRupiah } from "@/lib/money";

export function fileUrl(fileId: string): string {
  return signedFileUrl(fileId);
}

export function coverUrl(media: unknown): string | null {
  const list = (media as { fileId: string; cover?: boolean }[] | null) ?? [];
  const c = list.find((m) => m.cover) ?? list[0];
  return c ? signedFileUrl(c.fileId) : null;
}

export function rp(v: unknown): string {
  return v == null ? "—" : formatRupiah(typeof v === "bigint" ? v : Number(v));
}

/** Venue pages need a venue membership; sends users without one to onboarding. */
export async function requireVenuePage(path: string) {
  const s = await requireSession(path);
  const m = await memberships(s.userId);
  if (!m.venue) redirect("/mulai");
  return { session: s, venue: m.venue };
}

export async function requireOrganizerPage(path: string) {
  const s = await requireSession(path);
  const m = await memberships(s.userId);
  if (!m.organizer) redirect("/mulai");
  return { session: s, organizer: m.organizer };
}
