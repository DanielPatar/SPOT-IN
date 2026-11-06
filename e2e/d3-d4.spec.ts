import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { adminLogin, expectAccessible, lastLink, login, logout, okAlert, sql } from "./helpers";

/**
 * Demo scripts D3 (quote to acceptance) and D4 (confirmation and backup quote), PRD §13.1.
 * Continues from D1/D2 state (Budi's venue, Rina's "Tech Expo Desember" enquiries), no manual database edits.
 */
test.describe.configure({ mode: "serial" });

const BUDI = "budi.e2e@spot-in.test";
const BUDI_PW = "budi-password-123";
const STAFF = "staff.e2e@spot-in.test";
const STAFF_PW = "staff-password-123";

async function enquiryId(event: string, space: string): Promise<string> {
  const [r] = await sql`
    select q.id from enquiries q join events e on e.id = q.event_id join spaces s on s.id = q.space_id
    where e.name = ${event} and s.name = ${space} order by q.created_at desc limit 1`;
  return String(r!.id);
}

async function bookingId(event: string, space: string): Promise<string> {
  const [r] = await sql`
    select b.id from bookings b join events e on e.id = b.event_id join spaces s on s.id = b.space_id
    where e.name = ${event} and s.name = ${space} order by b.created_at desc limit 1`;
  return String(r!.id);
}

async function expectPilotPdf(page: Page, path: string) {
  const res = await page.request.get(path);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/pdf");
  const doc = await PDFDocument.load(await res.body());
  // Every generated document is marked as a pilot document (AC-M38-1).
  expect(doc.getKeywords()).toContain("PILOT");
  expect(doc.getTitle()).toContain("(PILOT)");
}

/** Sari enquires one of Budi's spaces for the Tech Expo dates. */
async function sariEnquires(page: Page, space: string, eventName: string) {
  await page.goto(`/cari?q=${encodeURIComponent(space)}`);
  await page.getByTestId("result").filter({ hasText: space }).first().click();
  await page.getByRole("link", { name: /Kirim permintaan/ }).first().click();
  await page.waitForURL(/\/acara\/kirim/);
  await page.getByRole("link", { name: "Buat acara baru" }).click();
  await page.getByLabel("Nama acara").fill(eventName);
  await page.getByLabel("Jenis acara").selectOption({ label: "Bazar" });
  await page.getByLabel("Kategori").selectOption({ label: "Kuliner" });
  await page.getByLabel("Perkiraan pengunjung").fill("200");
  await page.getByLabel("Tanggal").first().fill("2026-12-12");
  await page.getByRole("button", { name: "Tambah hari" }).click();
  await page.getByRole("button", { name: "Tambah hari" }).click();
  await page.getByRole("button", { name: "Simpan dan lanjut kirim permintaan" }).click();
  await page.waitForURL(/\/acara\/[0-9a-f-]{36}\/kirim/);
  for (const ta of await page.locator("textarea").all()) await ta.fill("Bazar kuliner");
  await page.getByRole("button", { name: "Kirim permintaan" }).click();
  await page.waitForURL(/sent=1/);
}

test("D3 — quote above threshold, Owner approval, revision with diff, comparison PDF, Rina accepts v2", async ({ page }) => {
  const aula = await enquiryId("Tech Expo Desember", "Aula Sentosa");

  // Budi (Owner) sets an approval threshold (FR-M2-06)
  await login(page, BUDI, BUDI_PW);
  await page.goto("/venue/pengaturan");
  const thresholdForm = page.locator("form").filter({ has: page.getByLabel("Jumlah (Rupiah)") });
  await thresholdForm.getByLabel("Jumlah (Rupiah)").fill("50000000");
  await thresholdForm.getByRole("button", { name: "Simpan" }).click();
  await okAlert(page);
  await logout(page);

  // Staff builds a quote from the rate card; it is above the threshold so it goes to the Owner (AC-M2-4)
  await login(page, STAFF, STAFF_PW);
  await page.goto(`/venue/enquiry/${aula}`);
  await page.getByRole("button", { name: "Buat penawaran" }).click();
  await page.waitForURL(/\/penawaran$/);
  await expect(page.getByRole("heading", { name: /Penawaran untuk Tech Expo Desember/ })).toBeVisible();
  await expect(page.getByText("Penawaran mulai Rp 50.000.000 perlu disetujui Pemilik")).toBeVisible();
  await expect(page.getByText("Total dibayar penyelenggara")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Kirim penawaran" }).click();
  await expect(page.locator(".alert-ok")).toContainText("dikirim ke Pemilik");
  await page.reload();
  await expect(page.getByText("Menunggu persetujuan Pemilik").first()).toBeVisible();
  const [pending] = await sql`select status from quotes where enquiry_id = ${aula} order by version desc limit 1`;
  expect(pending!.status).toBe("pending_approval");
  await logout(page);

  // Rina sees nothing until it is approved
  await login(page, "rina@spot-in.test");
  await page.goto(`/enquiry/${aula}`);
  await expect(page.getByText("Belum ada penawaran.")).toBeVisible();
  await logout(page);

  // Owner approves and it is sent
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/venue/enquiry/${aula}/penawaran`);
  await page.getByRole("button", { name: "Setujui dan kirim" }).click();
  await expect(page.locator(".alert-ok")).toContainText("disetujui dan dikirim");
  await logout(page);

  // Rina asks for a revision with a per-line comment (AC-M12-2)
  await login(page, "rina@spot-in.test");
  await page.goto(`/enquiry/${aula}`);
  await expect(page.getByRole("heading", { name: "Penawaran versi 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Unduh PDF penawaran" })).toBeVisible();
  await page.getByText("Minta revisi", { exact: true }).click();
  await page.getByLabel("Apa yang perlu diubah?").fill("Mohon potongan harga untuk sewa tiga hari.");
  await page.getByLabel(/Komentar untuk/).first().fill("Bisa diskon 5 juta?");
  await page.getByRole("button", { name: "Kirim permintaan revisi" }).click();
  await okAlert(page);
  await logout(page);

  // Owner sends v2 with a discount (Owner quotes are approved automatically)
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/venue/enquiry/${aula}`);
  await page.getByRole("button", { name: "Buat penawaran" }).click();
  await page.waitForURL(/\/penawaran$/);
  await expect(page.getByText("Penyelenggara meminta revisi versi 1")).toBeVisible();
  await expect(page.getByText("Komentar penyelenggara: Bisa diskon 5 juta?")).toBeVisible();
  await page.getByLabel("Diskon (Rp)").first().fill("5000000");
  await page.getByRole("button", { name: "Kirim penawaran" }).click();
  await expect(page.locator(".alert-ok")).toContainText("terkirim ke penyelenggara");
  await logout(page);

  // Rina sees v2 with what changed, compares, downloads the comparison PDF and accepts v2 (AC-M12-1/3, AC-M7/M8-4)
  await login(page, "rina@spot-in.test");
  await page.goto(`/enquiry/${aula}`);
  await expect(page.getByRole("heading", { name: "Penawaran versi 2" })).toBeVisible();
  await expect(page.getByText("Yang berubah dari versi 1")).toBeVisible();
  await expect(page.getByText(/· berubah/).first()).toBeVisible();
  await expectAccessible(page);
  const [ev] = await sql`select event_id from enquiries where id = ${aula}`;
  await page.goto(`/acara/${ev!.event_id}/bandingkan`);
  await expect(page.getByRole("heading", { name: "Bandingkan penawaran" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Aula Sentosa/ })).toBeVisible();
  await expectAccessible(page);
  await expectPilotPdf(page, `/api/documents/compare/${ev!.event_id}`);
  const [q2] = await sql`select id from quotes where enquiry_id = ${aula} and version = 2`;
  await expectPilotPdf(page, `/api/documents/quote/${q2!.id}`);

  await page.goto(`/enquiry/${aula}`);
  await page.getByLabel(/Saya mengerti ini pemesanan pilot/).check();
  await page.getByRole("button", { name: "Terima penawaran ini" }).click();
  await page.waitForURL(/\/pemesanan\/[0-9a-f-]{36}\?accepted=1/);
  await expect(page.getByText("Penawaran diterima, tanggal ditahan untuk Anda")).toBeVisible();
  await expect(page.getByText(/Anda masih punya 2 permintaan lain/)).toBeVisible();
  await expectAccessible(page);

  // The calendar now carries a booking hold for those dates (AC-M6-2)
  const holds = await sql`select kind from calendar_entries where enquiry_id = ${aula} and released_at is null`;
  expect(holds.map((h) => h.kind)).toEqual(["booking_hold", "booking_hold", "booking_hold"]);
});

test("D4 — backup quote, agreement both sides, sandbox deposit, confirmed; a lapse frees the dates for the backup", async ({ page }) => {
  const booking = await bookingId("Tech Expo Desember", "Aula Sentosa");

  // Sari enquires the same dates; Budi can only send a backup quote (AC-M12-4)
  await login(page, "sari@spot-in.test");
  await sariEnquires(page, "Aula Sentosa", "Bazar Kuliner Sari");
  await logout(page);
  const sariAula = await enquiryId("Bazar Kuliner Sari", "Aula Sentosa");
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/venue/enquiry/${sariAula}`);
  await page.getByRole("button", { name: "Buat penawaran" }).click();
  await page.waitForURL(/\/penawaran$/);
  await expect(page.getByText("Tanggal sedang ditahan untuk penyelenggara lain")).toBeVisible();
  await page.getByRole("button", { name: "Kirim sebagai penawaran cadangan" }).click();
  await expect(page.locator(".alert-ok")).toContainText("terkirim");
  await logout(page);

  await login(page, "sari@spot-in.test");
  await page.goto(`/enquiry/${sariAula}`);
  await expect(page.getByText("Penawaran cadangan: tanggal sedang ditahan")).toBeVisible();
  await expect(page.getByRole("button", { name: "Terima penawaran ini" })).toHaveCount(0);
  await logout(page);

  // Rina accepts the agreement first; contacts stay hidden until confirmation (AC-M13-1, FR-M1-05)
  await login(page, "rina@spot-in.test");
  await page.goto(`/pemesanan/${booking}`);
  await expect(page.getByText("Nomor telepon kedua pihak terlihat setelah pemesanan terkonfirmasi")).toBeVisible();
  await expectPilotPdf(page, `/api/documents/agreement/${booking}`);
  await page.getByLabel("Saya sudah membaca perjanjian contoh ini dan menyetujuinya.").check();
  await page.getByLabel("Ketik nama lengkap Anda").fill("Rina Salah");
  await page.getByRole("button", { name: "Setujui perjanjian" }).click();
  await expect(page.locator(".alert-error")).toContainText("Rina Pratama");
  await page.getByLabel("Saya sudah membaca perjanjian contoh ini dan menyetujuinya.").check();
  await page.getByLabel("Ketik nama lengkap Anda").fill("rina pratama");
  await page.getByRole("button", { name: "Setujui perjanjian" }).click();
  await okAlert(page);
  await logout(page);

  // Venue accepts second
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/pemesanan/${booking}`);
  await page.getByLabel("Saya sudah membaca perjanjian contoh ini dan menyetujuinya.").check();
  await page.getByLabel("Ketik nama lengkap Anda").fill("Budi Santoso");
  await page.getByRole("button", { name: "Setujui perjanjian" }).click();
  await okAlert(page);
  await logout(page);

  // Rina pays the deposit in the sandbox (AC-M14-1)
  await login(page, "rina@spot-in.test");
  await page.goto(`/pemesanan/${booking}`);
  await page.getByRole("link", { name: "Bayar sekarang" }).click();
  await expect(page.getByText("Mode uji: tidak ada uang yang berpindah")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Lanjutkan pembayaran" }).click();
  await expect(page.getByText("Nomor virtual account")).toBeVisible();
  await page.getByRole("button", { name: "Tandai berhasil dibayar" }).click();
  await expect(page.getByText("Pembayaran diterima")).toBeVisible();
  const receipt = page.getByRole("link", { name: /Unduh kuitansi PILOT-/ });
  await expect(receipt).toBeVisible();
  await expectPilotPdf(page, (await receipt.getAttribute("href"))!);
  await page.getByRole("link", { name: "Kembali ke pemesanan" }).last().click();
  await expect(page.getByText("Pemesanan terkonfirmasi").first()).toBeVisible();
  await expect(page.getByText("Budi Santoso").first()).toBeVisible(); // contacts after confirmation
  await expectAccessible(page);
  await logout(page);

  // Sari's backup quote expires because the dates are booked (AC-M12-5)
  await login(page, "sari@spot-in.test");
  await page.goto(`/enquiry/${sariAula}`);
  await expect(page.getByText("Penawaran ini sudah kedaluwarsa")).toBeVisible();
  await expect(page.getByText("Tanggal ini sudah dipesan penyelenggara lain.")).toBeVisible();
  await logout(page);

  // Ledger reconciles (FR-M24-05)
  await adminLogin(page);
  await page.goto("/admin/buku-besar");
  await expect(page.getByText("Semua pemesanan cocok")).toBeVisible();
  await logout(page);

  // Repeat with a lapse: Rina accepts the Atrium quote but never pays; Sari holds a backup quote
  const atrium = await enquiryId("Tech Expo Desember", "Atrium Sentosa");
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/venue/enquiry/${atrium}`);
  await page.getByRole("button", { name: "Buat penawaran" }).click();
  await page.waitForURL(/\/penawaran$/);
  await page.getByRole("button", { name: "Kirim penawaran" }).click();
  await expect(page.locator(".alert-ok")).toContainText("terkirim");
  await logout(page);

  await login(page, "rina@spot-in.test");
  await page.goto(`/enquiry/${atrium}`);
  await page.getByLabel(/Saya mengerti ini pemesanan pilot/).check();
  await page.getByRole("button", { name: "Terima penawaran ini" }).click();
  await page.waitForURL(/\/pemesanan\//);
  await logout(page);

  await login(page, "sari@spot-in.test");
  await sariEnquires(page, "Atrium Sentosa", "Bazar Kuliner Sari 2");
  await logout(page);
  const sariAtrium = await enquiryId("Bazar Kuliner Sari 2", "Atrium Sentosa");
  await login(page, BUDI, BUDI_PW);
  await page.goto(`/venue/enquiry/${sariAtrium}`);
  await page.getByRole("button", { name: "Buat penawaran" }).click();
  await page.waitForURL(/\/penawaran$/);
  await page.getByRole("button", { name: "Kirim sebagai penawaran cadangan" }).click();
  await expect(page.locator(".alert-ok")).toContainText("terkirim");
  await logout(page);

  // Demo clock +4 days: the deposit deadline passes, the booking lapses and the dates are released (AC-M38-7)
  await adminLogin(page);
  await page.goto("/admin");
  await page.getByLabel("Hari").fill("4");
  await page.getByRole("button", { name: "Majukan jam" }).click();
  await okAlert(page);
  await logout(page);
  const atriumBooking = await bookingId("Tech Expo Desember", "Atrium Sentosa");
  const [lapsed] = await sql`select status from bookings where id = ${atriumBooking}`;
  expect(lapsed!.status).toBe("lapsed");

  await login(page, "sari@spot-in.test");
  await page.goto(`/enquiry/${sariAtrium}`);
  await expect(page.getByText("Tanggal sudah bebas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Terima penawaran ini" })).toBeVisible();
  expect(await lastLink("sari@spot-in.test")).toContain("/enquiry/");
});
