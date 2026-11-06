import { test, expect, type Page, type Browser } from "@playwright/test";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { adminLogin, expectAccessible, lastLink, login, logout, okAlert, sql } from "./helpers";

/**
 * Demo scripts D5 (before and during the event), D6 (after the event) and D7 (cancellation), PRD §13.1.
 * Continues from D1–D4: Rina's confirmed booking of Aula Sentosa for "Tech Expo Desember" (12–14 Dec).
 */
test.describe.configure({ mode: "serial" });

const BUDI = "budi.e2e@spot-in.test";
const BUDI_PW = "budi-password-123";
const RINA = "rina@spot-in.test";

async function bookingOf(event: string, space: string): Promise<{ id: string; eventId: string }> {
  const [r] = await sql`
    select b.id, b.event_id from bookings b join events e on e.id = b.event_id join spaces s on s.id = b.space_id
    where e.name = ${event} and s.name = ${space} order by b.created_at desc limit 1`;
  return { id: String(r!.id), eventId: String(r!.event_id) };
}

async function advanceClockTo(page: Page, target: Date) {
  const [o] = await sql`select value from settings where key = 'demo_clock_offset_ms'`;
  const appNow = Date.now() + Number(o?.value ?? 0);
  const ms = target.getTime() - appNow;
  if (ms <= 0) return;
  await adminLogin(page);
  await page.goto("/admin");
  await page.getByLabel("Hari").fill(String(Math.floor(ms / 86_400_000)));
  await page.getByLabel("Jam").fill(String(Math.ceil((ms % 86_400_000) / 3_600_000)));
  await page.getByRole("button", { name: "Majukan jam" }).click();
  await okAlert(page);
  await logout(page);
}

async function pilotPdf(page: Page, path: string) {
  const res = await page.request.get(path);
  expect(res.status()).toBe(200);
  const doc = await PDFDocument.load(await res.body());
  expect(doc.getKeywords()).toContain("PILOT");
}

async function registerAttendee(browser: Browser, url: string, name: string, email: string) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(url);
  await p.getByLabel("Nama lengkap").fill(name);
  await p.getByLabel("Email", { exact: true }).fill(email);
  await p.getByLabel("Saya berusia 18 tahun atau lebih.").check();
  await p.getByLabel(/Saya sudah membaca pemberitahuan pilot/).check();
  await p.getByRole("button", { name: "Daftar dan kirim kartu masuk" }).click();
  await expect(p.getByText("Satu langkah lagi: buka email Anda")).toBeVisible();
  await p.goto(await lastLink(email, "/masuk/tautan"));
  await p.getByRole("button", { name: "Lanjutkan masuk" }).click();
  await p.waitForURL(/\/kartu\/[A-Za-z0-9_-]+$/);
  await expect(p.getByText(/Kartu masuk · P-/)).toBeVisible();
  await expect(p.getByText("Pilot demo – bukan acara sungguhan").first()).toBeVisible();
  const passUrl = new URL(p.url()).pathname;
  await ctx.close();
  return passUrl;
}

test("D5 — documents approved, balance paid, event page live, two registrations, check-in from QR and from the list", async ({ page, browser }) => {
  const { id: bookingId, eventId } = await bookingOf("Tech Expo Desember", "Aula Sentosa");

  // Rina uploads the required document; Budi asks for a change, then approves (AC-M17-1)
  await login(page, RINA);
  await page.goto(`/pemesanan/${bookingId}`);
  const doc = page.getByTestId("doc-item").filter({ hasText: "Layout final" });
  await doc.getByLabel("Berkas").setInputFiles({ name: "layout.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% layout v1\n") });
  await doc.getByRole("button", { name: "Unggah" }).click();
  await okAlert(page);
  await logout(page);
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/pemesanan/${bookingId}`);
  const vdoc = page.getByTestId("doc-item").filter({ hasText: "Layout final" });
  await vdoc.getByLabel(/Catatan untuk penyelenggara/).fill("Tambahkan jalur evakuasi");
  await vdoc.getByRole("button", { name: "Minta perubahan" }).click();
  await okAlert(page);
  await logout(page);
  await login(page, RINA);
  await page.goto(`/pemesanan/${bookingId}`);
  await expect(page.getByText("Catatan pengelola: Tambahkan jalur evakuasi")).toBeVisible();
  await page.getByTestId("doc-item").filter({ hasText: "Layout final" }).getByLabel("Berkas").setInputFiles({ name: "layout-v2.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% layout v2\n") });
  await page.getByRole("button", { name: "Unggah versi baru" }).click();
  await okAlert(page);
  await logout(page);
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/pemesanan/${bookingId}`);
  await page.getByTestId("doc-item").filter({ hasText: "Layout final" }).getByRole("button", { name: "Setujui" }).click();
  await okAlert(page);
  await expect(page.getByTestId("doc-item").filter({ hasText: "Layout final" }).getByText("Disetujui")).toBeVisible();
  await expect(page.getByText(/Versi 2: layout-v2\.pdf/)).toBeVisible();
  await logout(page);

  // Demo clock to the balance request (21 days before the event); Rina pays it (AC-M15/M16-2)
  await advanceClockTo(page, new Date("2026-11-21T03:00:00Z"));
  await login(page, RINA);
  await page.goto(`/pemesanan/${bookingId}`);
  await page.getByRole("link", { name: "Bayar sekarang" }).click();
  await expect(page.getByRole("heading", { name: "Bayar Pelunasan" })).toBeVisible();
  await page.getByLabel("QRIS uji").check();
  await page.getByRole("button", { name: "Lanjutkan pembayaran" }).click();
  await page.getByRole("button", { name: "Tandai berhasil dibayar" }).click();
  await expect(page.getByText("Pembayaran diterima")).toBeVisible();
  await expect.poll(async () => (await sql`select status from bookings where id = ${bookingId}`)[0]!.status).toBe("fully_paid");

  // Event page: one session per booked day, venue locked, capacity limited (AC-…-1)
  await page.goto(`/acara/${eventId}/halaman`);
  await expect(page.getByText("Tempat dan peta tidak bisa diubah di halaman acara.")).toBeVisible();
  await page.getByLabel("Ringkasan").fill("Pameran gadget dan aksesori tiga hari di Aula Sentosa.");
  const cover = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "#0f5c4d" } }).png().toBuffer();
  await page.getByLabel("Gambar sampul").setInputFiles({ name: "sampul.png", mimeType: "image/png", buffer: cover });
  const caps = page.getByLabel("Kapasitas");
  await expect(caps).toHaveCount(3);
  for (let i = 0; i < 3; i++) await caps.nth(i).fill("100");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Tayangkan halaman" }).click();
  await expect(page.getByText("Halaman acara sudah tayang")).toBeVisible();
  const pageUrl = new URL(await page.getByTestId("page-link").inputValue()).pathname;
  await logout(page);

  // The public page is unlisted: noindex, nofollow, no structured data, robots disallowed (AC-…-2)
  await page.goto(pageUrl);
  await expect(page.getByRole("heading", { name: "Tech Expo Desember" })).toBeVisible();
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await expect(page.getByText("Pilot demo – bukan acara sungguhan").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Bagikan lewat WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await expectAccessible(page);
  expect(await (await page.request.get("/robots.txt")).text()).toContain("Disallow: /");

  // Two attendees register without a password; passes are emailed (AC-M1-8, AC-…-6)
  const maya = await registerAttendee(browser, pageUrl, "Maya Anggraini", "maya@tamu.test");
  const joko = await registerAttendee(browser, pageUrl, "Joko Susilo", "joko@tamu.test");
  expect((await sql`select count(*)::int as n from email_outbox where category = 'pass_issued'`)[0]!.n).toBe(2);

  // Logged out, a pass shows only the first name and the event (FR-M31-02)
  await page.goto(maya);
  await expect(page.getByRole("heading", { name: "Kartu masuk milik Maya" })).toBeVisible();
  await expect(page.getByText("Anggraini")).toHaveCount(0);

  // Rina checks Maya in by opening the QR; reopening shows who checked in (AC-…-7)
  await login(page, RINA);
  await page.goto(maya);
  await page.getByRole("button", { name: "Check-in Maya" }).click();
  await okAlert(page);
  await page.goto(maya);
  await expect(page.getByText(/Sudah check-in pukul .* oleh Rina Pratama/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Batalkan check-in" })).toBeVisible();

  // Joko from the attendee list; the printable list prints everyone
  await page.goto(`/acara/${eventId}/peserta`);
  await page.getByTestId("attendee-row").filter({ hasText: "Joko Susilo" }).getByRole("button", { name: "Check-in" }).click();
  await okAlert(page);
  await expect(page.getByTestId("attendee-row").filter({ hasText: "Joko Susilo" }).getByText("Sudah masuk")).toBeVisible();
  await expectAccessible(page);
  await page.goto(`/acara/${eventId}/peserta/cetak`);
  await expect(page.getByTestId("print-row")).toHaveCount(2);
  void joko;
  await logout(page);
});

test("D6 — after the event: window, problem reported and resolved by Admin, release and statement", async ({ page }) => {
  const { id: bookingId } = await bookingOf("Tech Expo Desember", "Aula Sentosa");

  // Event ends Mon 14 Dec 22:00 WIB → post-event window
  await advanceClockTo(page, new Date("2026-12-14T16:00:00Z"));
  await expect.poll(async () => (await sql`select status from bookings where id = ${bookingId}`)[0]!.status).toBe("post_event_window");
  await login(page, RINA);
  await page.goto(`/pemesanan/${bookingId}`);
  await expect(page.getByText(/Masa laporan masalah sampai/)).toBeVisible();
  await page.locator("summary", { hasText: "Laporkan masalah" }).click();
  await page.getByLabel("Apa yang terjadi?").fill("Listrik padam dua jam pada hari kedua.");
  await page.getByRole("button", { name: "Kirim laporan dan tahan pelepasan dana" }).click();
  await okAlert(page);
  await logout(page);

  // Release time passes but the problem holds it (AC-M15/M16-5)
  await advanceClockTo(page, new Date("2026-12-18T04:00:00Z"));
  await expect.poll(async () => (await sql`select status from bookings where id = ${bookingId}`)[0]!.status).toBe("on_hold");

  // Admin resolves: release as is → settled, ledger balanced, statement available (AC-M15/M16-4)
  await adminLogin(page);
  await page.goto("/admin/masalah");
  const item = page.getByTestId("problem-item").first();
  await item.getByLabel("Alasan dan catatan untuk kedua pihak").fill("Pengelola sudah memberi kompensasi langsung di lokasi.");
  await item.getByRole("button", { name: "Selesaikan laporan" }).click();
  await okAlert(page);
  await expect.poll(async () => (await sql`select status from bookings where id = ${bookingId}`)[0]!.status).toBe("settled");
  await page.goto("/admin/buku-besar");
  await expect(page.getByText("Semua pemesanan cocok")).toBeVisible();
  await logout(page);

  await login(page, BUDI, BUDI_PW);
  await page.goto(`/pemesanan/${bookingId}`);
  await expect(page.getByText("Dana sudah dilepas (simulasi)")).toBeVisible();
  await pilotPdf(page, `/api/documents/statement/${bookingId}`);
  const csv = await page.request.get(`/api/statement/${bookingId}`);
  expect(await csv.text()).toContain("Pelepasan dana (simulasi)");
  await logout(page);
});

test("D7 — cancellation: organizer 35 days out (Moderate) with the figure shown = executed; venue cancellation voids passes and emails registrants", async ({ page, browser }) => {
  // A new event in February on Atrium Sentosa
  await login(page, RINA);
  const [atrium] = await sql`select id from spaces where name = 'Atrium Sentosa'`;
  const book = async (eventName: string, day: string) => {
    await page.goto(`/acara/kirim?spaces=${atrium!.id}`);
    await page.getByRole("link", { name: "Buat acara baru" }).click();
    await page.getByLabel("Nama acara").fill(eventName);
    await page.getByLabel("Jenis acara").selectOption({ label: "Workshop" });
    await page.getByLabel("Kategori").selectOption({ label: "Teknologi" });
    await page.getByLabel("Perkiraan pengunjung").fill("80");
    await page.getByLabel("Tanggal").first().fill(day);
    await page.getByRole("button", { name: "Simpan dan lanjut kirim permintaan" }).click();
    await page.waitForURL(/\/acara\/[0-9a-f-]{36}\/kirim/);
    for (const ta of await page.locator("textarea").all()) await ta.fill("Workshop gadget");
    await page.getByRole("button", { name: "Kirim permintaan" }).click();
    await page.waitForURL(/sent=1/);
  };
  await book("Workshop Februari", "2027-02-20");
  await book("Meetup Maret", "2027-03-20");
  await logout(page);

  const confirm = async (eventName: string) => {
    const [q] = await sql`select q.id from enquiries q join events e on e.id = q.event_id where e.name = ${eventName}`;
    await login(page, BUDI, BUDI_PW);
    await page.goto(`/venue/enquiry/${q!.id}`);
    await page.getByRole("button", { name: "Buat penawaran" }).click();
    await page.waitForURL(/\/penawaran$/);
    await page.getByLabel("Kebijakan pembatalan").selectOption({ label: "Moderat" });
    await page.getByRole("button", { name: "Kirim penawaran" }).click();
    await expect(page.locator(".alert-ok")).toContainText("terkirim");
    await logout(page);
    await login(page, RINA);
    await page.goto(`/enquiry/${q!.id}`);
    await page.getByLabel(/Saya mengerti ini pemesanan pilot/).check();
    await page.getByRole("button", { name: "Terima penawaran ini" }).click();
    await page.waitForURL(/\/pemesanan\//);
    await page.getByLabel("Saya sudah membaca perjanjian contoh ini dan menyetujuinya.").check();
    await page.getByLabel("Ketik nama lengkap Anda").fill("Rina Pratama");
    await page.getByRole("button", { name: "Setujui perjanjian" }).click();
    await okAlert(page);
    await logout(page);
    const { id } = await bookingOf(eventName, "Atrium Sentosa");
    await login(page, BUDI, BUDI_PW);
    await page.goto(`/pemesanan/${id}`);
    await page.getByLabel("Saya sudah membaca perjanjian contoh ini dan menyetujuinya.").check();
    await page.getByLabel("Ketik nama lengkap Anda").fill("Budi Santoso");
    await page.getByRole("button", { name: "Setujui perjanjian" }).click();
    await okAlert(page);
    await logout(page);
    await login(page, RINA);
    await page.goto(`/pemesanan/${id}`);
    await page.getByRole("link", { name: "Bayar sekarang" }).click();
    await page.getByRole("button", { name: "Lanjutkan pembayaran" }).click();
    await page.getByRole("button", { name: "Tandai berhasil dibayar" }).click();
    await expect(page.getByText("Pembayaran diterima")).toBeVisible();
    await logout(page);
    return id;
  };
  const feb = await confirm("Workshop Februari");
  const mar = await confirm("Meetup Maret");

  // Rina publishes a page for the March event and someone registers
  const { eventId: marEvent } = await bookingOf("Meetup Maret", "Atrium Sentosa");
  await login(page, RINA);
  await page.goto(`/acara/${marEvent}/halaman`);
  await page.getByLabel("Ringkasan").fill("Meetup komunitas gadget.");
  await page.getByLabel("Gambar sampul").setInputFiles({ name: "s.png", mimeType: "image/png", buffer: await sharp({ create: { width: 800, height: 400, channels: 3, background: "#8a4b0f" } }).png().toBuffer() });
  await page.getByLabel("Kapasitas").fill("50");
  await page.getByRole("button", { name: "Tayangkan halaman" }).click();
  await expect(page.getByText("Halaman acara sudah tayang")).toBeVisible();
  const marUrl = new URL(await page.getByTestId("page-link").inputValue()).pathname;
  await logout(page);
  const passUrl = await registerAttendee(browser, marUrl, "Dewi Lestari", "dewi@tamu.test");

  // 35 days before 20 Feb: Moderate → 100% of the venue amount back, fee kept (AC-M18-1)
  await advanceClockTo(page, new Date("2027-01-16T03:00:00Z"));
  const [dep] = await sql`select venue_part from payment_requests where booking_id = ${feb} and kind in ('deposit', 'full')`;
  await login(page, RINA);
  await page.goto(`/pemesanan/${feb}`);
  await page.locator("summary", { hasText: /^Batalkan pemesanan$/ }).click();
  await expect(page.getByText(/Hari ini 35 hari sebelum acara/)).toBeVisible();
  const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`.replace(/,/g, ".");
  const row = page.locator("details").filter({ hasText: "Yang Anda terima kembali" }).locator("div.flex", { hasText: "Yang Anda terima kembali" }).last();
  await expect(row).toContainText(fmt(Number(dep!.venue_part)));
  await page.getByLabel("Alasan pembatalan").fill("Pembicara utama berhalangan.");
  await page.getByLabel(/Saya mengerti pembatalan tidak bisa diurungkan/).check();
  await page.getByRole("button", { name: "Batalkan pemesanan" }).click();
  await expect(page.getByText("Pemesanan dibatalkan oleh penyelenggara")).toBeVisible();
  const [cn] = await sql`select coalesce(sum(amount), 0)::bigint as v from receipts where booking_id = ${feb} and kind = 'credit_note'`;
  expect(Number(cn!.v)).toBe(Number(dep!.venue_part));
  await logout(page);

  // Budi (Owner) cancels the March booking: everything refunded; the page shows Dibatalkan, passes voided, registrant emailed (AC-M18-2, -3)
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/pemesanan/${mar}`);
  await page.locator("summary", { hasText: "Batalkan pemesanan (Pemilik)" }).click();
  await page.getByLabel("Alasan pembatalan").fill("Atrium dipakai untuk renovasi mendadak.");
  await page.getByLabel(/Saya mengerti pembatalan tidak bisa diurungkan/).check();
  await page.getByRole("button", { name: "Batalkan pemesanan" }).click();
  await expect(page.getByText("Pemesanan dibatalkan oleh pengelola")).toBeVisible();
  await logout(page);
  const [paid] = await sql`select coalesce(sum(amount), 0)::bigint as v from payments where booking_id = ${mar}`;
  const [cn2] = await sql`select coalesce(sum(amount), 0)::bigint as v from receipts where booking_id = ${mar} and kind = 'credit_note'`;
  expect(Number(cn2!.v)).toBe(Number(paid!.v));
  await page.goto(marUrl);
  await expect(page.getByText("Acara ini dibatalkan").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Daftar dan kirim kartu masuk" })).toHaveCount(0);
  expect((await sql`select 1 from email_outbox where to_email = 'dewi@tamu.test' and category = 'event_cancelled'`).length).toBe(1);
  void passUrl;

  // Ledger still reconciles for every booking
  await adminLogin(page);
  await page.goto("/admin/buku-besar");
  await expect(page.getByText("Semua pemesanan cocok")).toBeVisible();
});
