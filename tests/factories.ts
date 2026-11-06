import sharp from "sharp";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { signUp, verifyEmail, type Actor } from "@/server/accounts";
import { createOrganization } from "@/server/orgs";
import { invitePilotUser, verifyOrganization, approveSpace } from "@/server/admin";
import { saveProperty, createSpace, setRateCard, addSpacePhotos, submitSpace, saveAddOn, setTaxSettings } from "@/server/listings";
import { sha256 } from "@/lib/tokens";

export const ADMIN_EMAIL = "admin@spot-in.test";

/** Latest token sent to an address, read back from the outbox link. */
export async function lastLink(email: string): Promise<string> {
  const [m] = await db()`select text_body from email_outbox where to_email = ${email} order by created_at desc, id desc limit 1`;
  const match = String(m?.text_body ?? "").match(/https?:\/\/\S+/);
  if (!match) throw new Error(`no link mailed to ${email}`);
  return match[0];
}

export function tokenFrom(link: string): string {
  return new URL(link).searchParams.get("token") ?? "";
}

export async function makeAdmin(): Promise<Actor> {
  const { userId } = await signUp({ name: "Admin", email: ADMIN_EMAIL, password: "admin-password-123", ageConfirmed: true, acceptedPilotNotice: true });
  await verifyEmail(tokenFrom(await lastLink(ADMIN_EMAIL)));
  return { userId, ip: "127.0.0.1" };
}

export async function makeUser(admin: Actor, email: string, name = email.split("@")[0]!): Promise<Actor> {
  await invitePilotUser(admin, email, "both");
  const { userId } = await signUp({ name, email, password: "password-123456", ageConfirmed: true, acceptedPilotNotice: true });
  await verifyEmail(tokenFrom(await lastLink(email)));
  return { userId, ip: "10.0.0.1" };
}

export async function pngBytes(color = "#3366ff"): Promise<Buffer> {
  return sharp({ create: { width: 40, height: 30, channels: 3, background: color } }).png().toBuffer();
}

/** A verified venue with one published space (Jakarta Selatan hall), like Budi's in D1. */
export async function makeVenue(admin: Actor, email: string, opts: { name?: string; city?: string; area?: string; lat?: number; lon?: number; spaceName?: string; spaceType?: string; capacity?: number; powerKva?: number; price?: number; activities?: string[]; pkp?: boolean } = {}) {
  const owner = await makeUser(admin, email);
  const orgId = await createOrganization(owner, { kind: "venue_operator", displayName: opts.name ?? "Mall A", legalName: "PT Mall A", city: opts.city ?? "Jakarta Selatan" });
  await saveProperty(owner, {
    name: opts.name ?? "Mall A",
    type: "mall",
    addressText: "Jl. Sudirman 1",
    city: opts.city ?? "Jakarta Selatan",
    area: opts.area ?? "Kebayoran Baru",
    lat: opts.lat ?? -6.2297,
    lon: opts.lon ?? 106.8,
    requiredDocs: [{ name: "Final layout", mandatory: true, dueOffsetDays: 7 }],
  });
  if (opts.pkp) await setTaxSettings(owner, { isPkp: true, serviceChargeBps: 0 });
  const spaceId = await createSpace(owner, {
    name: opts.spaceName ?? "Grand Hall",
    type: opts.spaceType ?? "event_hall",
    capacities: { standing: opts.capacity ?? 500, theatre: Math.round((opts.capacity ?? 500) * 0.6) },
    powerKva: opts.powerKva ?? 40,
    permittedActivities: opts.activities ?? ["selling", "fnb_sampling"],
    enquiryQuestions: [],
  });
  await setRateCard(owner, spaceId, { unit: "day", weekdayPrice: opts.price ?? 25_000_000, weekendPrice: null, showFullRateCard: true });
  await addSpacePhotos(owner, spaceId, [{ name: "hall.png", bytes: await pngBytes() }]);
  await submitSpace(owner, spaceId);
  await verifyOrganization(admin, orgId, { method: "call", note: "test" });
  await approveSpace(admin, spaceId);
  return { owner, orgId, spaceId };
}

export async function makeOrganizer(admin: Actor, email: string, name = "EO Rina") {
  const owner = await makeUser(admin, email);
  const orgId = await createOrganization(owner, { kind: "organizer", displayName: name });
  return { owner, orgId };
}

export async function sessionRow(token: string) {
  const [s] = await db()`select * from sessions where token_hash = ${sha256(token)}`;
  return s;
}

export async function addElectricity(owner: Actor) {
  await saveAddOn(owner, { name: "Listrik", unit: "per_kva_day", price: 50_000, taxable: true, mandatory: false });
}

export { now };
