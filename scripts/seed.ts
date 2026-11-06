/**
 * Demo seed for D1/D2 (PRD §13.1). Creates the Admin (password + known TOTP secret
 * for the demo), Rina (organizer, verified), Sari (organizer) and three published
 * venues in Jakarta. Budi is only invited, because D1 shows his onboarding.
 * Refuses to run in the pilot environment: seed data never mixes with pilot users.
 */
import sharp from "sharp";
import { db, closeDb } from "../src/lib/db";
import { now } from "../src/lib/clock";
import { signUp, verifyEmail } from "../src/server/accounts";
import { createOrganization } from "../src/server/orgs";
import { invitePilotUser, verifyOrganization, approveSpace } from "../src/server/admin";
import { saveProperty, createSpace, setRateCard, addSpacePhotos, submitSpace, saveAddOn, setTaxSettings } from "../src/server/listings";
import { adminEmails } from "../src/lib/config";

export const DEMO_PASSWORD = "spotin-demo-2026";
export const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

async function token(email: string) {
  const [m] = await db()`select text_body from email_outbox where to_email = ${email} order by created_at desc limit 1`;
  return new URL(String(m!.text_body).match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
}

async function photo(hue: number) {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30 + hue, g: 120, b: 100 + (hue % 100) } } }).jpeg().toBuffer();
}

async function user(email: string, name: string, admin?: { userId: string }) {
  if (admin) await invitePilotUser(admin, email, "both");
  const { userId } = await signUp({ name, email, password: DEMO_PASSWORD, ageConfirmed: true, acceptedPilotNotice: true });
  await verifyEmail(await token(email));
  await db()`update users set intent_chosen_at = ${await now()}, intents = '{find,list}' where id = ${userId}`;
  return { userId };
}

export async function seed(): Promise<void> {
  if (process.env.APP_ENV === "pilot") throw new Error("Refusing to seed the pilot environment (FR-M38-06).");
  const [exists] = await db()`select 1 from users limit 1`;
  if (exists) {
    console.log("Database already has users — skipping seed.");
    return;
  }
  const adminEmail = adminEmails()[0] ?? "admin@spot-in.test";
  const admin = await user(adminEmail, "Admin Spot-In");
  await db()`update users set totp_secret = ${DEMO_TOTP_SECRET}, totp_enabled_at = ${await now()} where id = ${admin.userId}`;

  const venues = [
    { email: "venue.selatan@spot-in.test", name: "Mal Selatan Raya", city: "Jakarta Selatan", area: "Kebayoran Baru", lat: -6.2441, lon: 106.8001, spaces: [
      { name: "Atrium Utama", type: "atrium", standing: 600, power: 60, price: 25_000_000, weekend: 30_000_000, acts: ["selling", "fnb_sampling", "live_music"] },
      { name: "Grand Ballroom", type: "event_hall", standing: 800, power: 80, price: 40_000_000, weekend: 45_000_000, acts: ["fnb_sampling", "live_music"] },
    ] },
    { email: "venue.kemang@spot-in.test", name: "Gedung Serbaguna Kemang", city: "Jakarta Selatan", area: "Mampang Prapatan", lat: -6.2607, lon: 106.8137, spaces: [
      { name: "Aula Kemang", type: "event_hall", standing: 350, power: 40, price: 15_000_000, weekend: 18_000_000, acts: ["selling", "fnb_sampling"] },
    ] },
    { email: "venue.barat@spot-in.test", name: "Plaza Barat", city: "Jakarta Barat", area: "Kebon Jeruk", lat: -6.1914, lon: 106.7681, spaces: [
      { name: "Hall Plaza Barat", type: "event_hall", standing: 500, power: 30, price: 20_000_000, weekend: 22_000_000, acts: ["selling"] },
    ] },
  ];
  let hue = 0;
  for (const v of venues) {
    const owner = await user(v.email, `Pengelola ${v.name}`, admin);
    const orgId = await createOrganization(owner, { kind: "venue_operator", displayName: v.name, legalName: `PT ${v.name}`, city: v.city });
    await saveProperty(owner, {
      name: v.name, type: v.spaces[0]!.type === "atrium" ? "mall" : "hall", addressText: `Jl. Contoh No. ${10 + hue}`, city: v.city, area: v.area, lat: v.lat, lon: v.lon,
      operatingHours: { mon: { open: "10:00", close: "22:00" }, tue: { open: "10:00", close: "22:00" }, wed: { open: "10:00", close: "22:00" }, thu: { open: "10:00", close: "22:00" }, fri: { open: "10:00", close: "22:00" }, sat: { open: "10:00", close: "22:00" }, sun: { open: "10:00", close: "22:00" } },
      houseRules: "Loading barang pukul 22:00–06:00. Dilarang menempel di dinding.",
      requiredDocs: [{ name: "Layout final", mandatory: true, dueOffsetDays: 7 }, { name: "Asuransi tanggung gugat", mandatory: true, dueOffsetDays: 5 }],
    });
    await setTaxSettings(owner, { isPkp: true, serviceChargeBps: 0 });
    await saveAddOn(owner, { name: "Listrik tambahan", unit: "per_kva_day", price: 50_000, taxable: true, mandatory: false });
    await saveAddOn(owner, { name: "Keamanan", unit: "per_day", price: 1_500_000, taxable: true, mandatory: true });
    for (const s of v.spaces) {
      const id = await createSpace(owner, {
        name: s.name, type: s.type, capacities: { standing: s.standing, theatre: Math.round(s.standing * 0.6), booth: Math.round(s.standing / 20) },
        powerKva: s.power, permittedActivities: s.acts, areaM2: Math.round(s.standing * 1.2), environment: "indoor", wifi: true,
        enquiryQuestions: ["Produk atau kegiatan apa yang akan ditampilkan?"],
      });
      await setRateCard(owner, id, { unit: "day", weekdayPrice: s.price, weekendPrice: s.weekend, showFullRateCard: true });
      await addSpacePhotos(owner, id, [{ name: "foto.jpg", bytes: await photo((hue += 37)) }]);
      await submitSpace(owner, id);
      await verifyOrganization(admin, orgId, { method: "call", note: "Seed demo" }).catch(() => {});
      await approveSpace(admin, id);
    }
  }
  const rina = await user("rina@spot-in.test", "Rina Pratama", admin);
  await createOrganization(rina, { kind: "organizer", displayName: "Rina Event Organizer", legalName: "CV Rina Kreasi" });
  const sari = await user("sari@spot-in.test", "Sari Wulandari", admin);
  await createOrganization(sari, { kind: "organizer", displayName: "Komunitas Sari", isIndividual: true });
  await invitePilotUser(admin, "budi@spot-in.test", "venue"); // D1 starts here
  console.log(`Seeded. Admin ${adminEmail} / ${DEMO_PASSWORD} (TOTP secret ${DEMO_TOTP_SECRET}); Rina, Sari and venue users share the password; Budi is invited.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}
