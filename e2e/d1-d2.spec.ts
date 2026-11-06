import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { adminLogin, expectAccessible, lastLink, login, logout, okAlert, sql } from "./helpers";

/**
 * Demo script D1 (venue onboarding) and D2 (search and enquiry), PRD §13.1.
 * Runs against the demo seed with no manual database edits.
 */
test.describe.configure({ mode: "serial" });

const BUDI = "budi.e2e@spot-in.test";
const STAFF = "staff.e2e@spot-in.test";

test.afterAll(async () => {
  await sql.end();
});

test("D1 — venue onboarding: invite, sign-up and consent, property with pin, two spaces, verification, searchable", async ({ page, browser }) => {
  // Admin invites Budi and his colleague (FR-M38-02)
  await adminLogin(page);
  await page.goto("/admin/undangan");
  for (const email of [BUDI, STAFF]) {
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Undang" }).click();
    await okAlert(page);
  }
  await expect(page.getByRole("cell", { name: BUDI })).toBeVisible();
  await logout(page);

  // An uninvited email can't sign up (AC-M38-2)
  await page.goto("/daftar");
  await page.getByLabel("Nama lengkap").fill("Orang Asing");
  await page.getByLabel("Email", { exact: true }).fill("stranger@spot-in.test");
  await page.getByLabel("Saya berusia 18 tahun atau lebih.").check();
  await page.getByLabel(/Saya telah membaca dan menyetujui/).check();
  await page.getByRole("button", { name: "Daftar" }).click();
  await expect(page.locator(".alert-error")).toContainText("pilot tertutup");

  // Budi signs up from the invitation; the pilot notice names hosting and deletion date (AC-M38-3)
  await page.goto(await lastLink(BUDI, "/daftar"));
  await expect(page.getByRole("heading", { name: "Pemberitahuan pilot" })).toBeVisible();
  await expect(page.getByText(/Data disimpan pada penyedia hosting/)).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Nama lengkap").fill("Budi Santoso");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(BUDI);
  await page.getByLabel("Kata sandi (opsional)").fill("budi-password-123");
  await page.getByLabel("Saya berusia 18 tahun atau lebih.").check();
  await page.getByLabel(/Saya telah membaca dan menyetujui/).check();
  await page.getByRole("button", { name: "Daftar" }).click();
  await page.waitForURL(/\/mulai/);
  const consents = await sql`select document from consent_records c join users u on u.id = c.user_id where u.email = ${BUDI}`;
  expect(consents.length).toBe(3);

  // Verify the email
  await page.goto(await lastLink(BUDI, "/verifikasi"));
  await page.getByRole("button", { name: "Verifikasi email saya" }).click();
  await page.waitForURL(/verified=1/);

  // List spaces (FR-M1-06)
  await page.goto("/mulai");
  await page.getByLabel("Daftarkan ruang (saya pengelola venue)").check();
  await page.getByLabel("Cari ruang (saya penyelenggara acara)").uncheck();
  await page.getByLabel("Nama venue (nama tampilan)").fill("Mal Budi Sentosa");
  await page.getByLabel("Kota", { exact: true }).fill("Jakarta Selatan");
  await page.getByRole("button", { name: "Lanjutkan" }).click();
  await page.waitForURL(/\/venue$/);

  // Property with a map pin and required documents (FR-M4-01, FR-M4-08)
  await page.goto("/venue/properti");
  await page.getByLabel("Nama properti").fill("Mal Budi Sentosa");
  await page.getByLabel("Alamat").fill("Jl. Panglima Polim 10");
  await page.getByLabel("Kota", { exact: true }).fill("Jakarta Selatan");
  await page.getByLabel("Area / kecamatan").fill("Kebayoran Baru");
  await page.getByLabel("Lintang").fill("-6.2470");
  await page.getByLabel("Bujur").fill("106.7990");
  await page.getByLabel("Nama dokumen").first().fill("Layout final");
  await page.getByLabel("Wajib").first().check();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Simpan" }).last().click();
  await okAlert(page);
  const [prop] = await sql`select timezone, ST_Y(geo::geometry) as lat from properties p join organizations o on o.id = p.operator_id where o.display_name = 'Mal Budi Sentosa'`;
  expect(prop!.timezone).toBe("Asia/Jakarta");
  expect(Number(prop!.lat)).toBeCloseTo(-6.247, 3);

  // Two spaces with rate cards and photos
  const photo = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#2a7" } }).jpeg().toBuffer();
  for (const sp of [
    { name: "Aula Sentosa", type: "Hall / ballroom", price: "18000000", cap: "400" },
    { name: "Atrium Sentosa", type: "Atrium", price: "22000000", cap: "600" },
  ]) {
    await page.goto("/venue/ruang/baru");
    await page.getByLabel("Nama ruang").fill(sp.name);
    await page.getByLabel("Jenis ruang").selectOption({ label: sp.type });
    await page.getByLabel("Berdiri").fill(sp.cap);
    await page.getByLabel("Daya listrik (kVA)").fill("45");
    await page.getByLabel("Sampling makanan/minuman").check();
    await page.getByLabel("Pertanyaan 1").fill("Produk apa yang akan ditampilkan?");
    await page.getByRole("button", { name: "Simpan sebagai draf" }).click();
    await page.waitForURL(/\/venue\/ruang\/[0-9a-f-]{36}$/);
    await page.locator('input[name="photos"]').setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: photo });
    await page.getByRole("button", { name: "Simpan foto" }).click();
    await okAlert(page);
    await page.getByLabel("Harga hari kerja").fill(sp.price);
    await page.getByLabel("Harga akhir pekan").fill(String(Number(sp.price) + 3_000_000));
    await page.locator("form").filter({ has: page.getByLabel("Harga hari kerja") }).getByRole("button", { name: "Simpan" }).click();
    await okAlert(page);
    await page.getByRole("button", { name: "Ajukan untuk ditinjau" }).click();
    await expect(page.getByText("Ruang diajukan untuk ditinjau Admin.")).toBeVisible();
  }

  // Invite a colleague as Staff (FR-M2-03)
  await page.goto("/venue/tim");
  await page.locator("form").filter({ hasText: "Kirim undangan" }).getByLabel("Email", { exact: true }).fill(STAFF);
  await page.getByRole("button", { name: "Kirim undangan" }).click();
  await okAlert(page);
  const staffPage = await (await browser.newContext()).newPage();
  await staffPage.goto(await lastLink(STAFF, "/daftar"));
  await staffPage.getByLabel("Nama lengkap").fill("Staff Budi");
  await staffPage.getByLabel("Kata sandi (opsional)").fill("staff-password-123");
  await staffPage.getByLabel("Saya berusia 18 tahun atau lebih.").check();
  await staffPage.getByLabel(/Saya telah membaca dan menyetujui/).check();
  await staffPage.getByRole("button", { name: "Daftar" }).click();
  await staffPage.waitForURL(/\/mulai/);
  await staffPage.goto(await lastLink(STAFF, "/undangan"));
  await staffPage.getByRole("button", { name: "Terima undangan" }).click();
  await staffPage.waitForURL(/\/venue$/);
  await staffPage.close();
  await logout(page);

  // Not searchable before review
  await login(page, "rina@spot-in.test");
  await page.goto("/cari?q=sentosa");
  await expect(page.getByText("0 ruang ditemukan")).toBeVisible();
  await logout(page);

  // Admin verifies the operator (method recorded, no documents) and approves both spaces (FR-M3-*, FR-M4-10)
  await adminLogin(page);
  await page.goto("/admin/verifikasi");
  const item = page.getByTestId("verification-item").filter({ hasText: "Mal Budi Sentosa" });
  await item.getByLabel("Catatan").fill("Telepon dengan Budi, 6 Nov");
  await item.getByRole("button", { name: "Tandai terverifikasi" }).click();
  await expect(item).toHaveCount(0); // leaves the queue once verified
  await page.goto("/admin/ruang");
  for (const name of ["Aula Sentosa", "Atrium Sentosa"]) {
    const review = page.getByTestId("space-review-item").filter({ hasText: name });
    await review.getByRole("button", { name: "Setujui dan publikasikan" }).click();
    await expect(review).toHaveCount(0);
  }
  await page.goto("/admin/audit");
  await expect(page.getByText("org.verified").first()).toBeVisible();
  await expect(page.getByText("space.approved").first()).toBeVisible();
  await logout(page);

  // Spaces are searchable to pilot users, with the verified badge
  await login(page, "rina@spot-in.test");
  await page.goto("/cari?q=sentosa");
  await expect(page.getByText("2 ruang ditemukan")).toBeVisible();
  await expect(page.getByTestId("result").first().getByText("Terverifikasi Spot-In")).toBeVisible();
});

test("D2 — search with dates and filters, map, shortlist shared logged out, one enquiry to three spaces", async ({ page, browser }) => {
  await login(page, "rina@spot-in.test");

  // Search: Jakarta Selatan, hall, 12–14 Dec, 300 people, F&B sampling, power ≥ 30 kVA (§6.2)
  await page.goto("/cari");
  await page.getByLabel("Kota").selectOption("Jakarta Selatan");
  await page.getByLabel("Dari tanggal").fill("2026-12-12");
  await page.getByLabel("Sampai tanggal").fill("2026-12-14");
  await page.getByLabel("Pengunjung").fill("300");
  await page.getByText("Filter lainnya").click();
  await page.getByLabel("Daya min. (kVA)").fill("30");
  await page.getByLabel("Sampling makanan/minuman").check();
  await page.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(page.getByText(/ruang ditemukan/)).toBeVisible();
  const names = await page.getByTestId("result").locator("strong").allInnerTexts();
  expect(names).toEqual(expect.arrayContaining(["Aula Sentosa", "Atrium Sentosa", "Aula Kemang"]));
  expect(names).not.toContain("Hall Plaza Barat");
  await expectAccessible(page);

  // Typo-tolerant keyword (AC-M7/M8-2) and map view
  await page.goto("/cari?q=aul+jaksel");
  const typo = await page.getByTestId("result").locator("strong").allInnerTexts();
  expect(typo).toEqual(expect.arrayContaining(["Aula Kemang", "Aula Sentosa"]));
  expect(typo).not.toContain("Hall Plaza Barat");
  await page.getByRole("link", { name: "Peta" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();

  // Space page: calendar, rate card, estimate; save three spaces to a shortlist
  await page.goto("/cari?q=sentosa");
  await page.getByTestId("result").filter({ hasText: "Aula Sentosa" }).click();
  await expect(page.getByRole("heading", { name: "Ketersediaan" })).toBeVisible();
  await page.getByLabel("Tanggal").first().fill("2026-12-14");
  await page.getByRole("button", { name: "Hitung perkiraan" }).click();
  await expect(page.getByText("Perkiraan ini tidak mengikat")).toBeVisible();
  await page.getByLabel("Nama shortlist baru").fill("Expo Desember");
  await page.getByRole("button", { name: "Buat dan simpan" }).click();
  await okAlert(page);
  for (const [q, name] of [["sentosa", "Atrium Sentosa"], ["kemang", "Aula Kemang"]] as const) {
    await page.goto(`/cari?q=${q}`);
    await page.getByTestId("result").filter({ hasText: name }).click();
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await okAlert(page);
  }
  await page.goto("/shortlist");
  await page.getByRole("link", { name: "Expo Desember" }).click();
  await page.getByRole("button", { name: "Buat tautan berbagi" }).click();
  await okAlert(page);
  const shareUrl = await page.getByTestId("share-link").inputValue();

  // View-only link works logged out (FR-M8-02)
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(new URL(shareUrl).pathname);
  await expect(anon.getByTestId("shared-item")).toHaveCount(3);
  await expect(anon.getByText("Dibagikan oleh Rina Event Organizer")).toBeVisible();
  await anon.close();

  // One enquiry to the three shortlisted spaces with a proposal deck (FR-M8-04, FR-M9-03)
  await page.getByRole("button", { name: "Kirim enquiry ke ruang terpilih" }).click();
  await page.waitForURL(/\/acara\/kirim/);
  await page.getByRole("link", { name: "Buat acara baru" }).click();
  await page.getByLabel("Nama acara").fill("Tech Expo Desember");
  await page.getByLabel("Jenis acara").selectOption({ label: "Pameran" });
  await page.getByLabel("Kategori").selectOption({ label: "Teknologi" });
  await page.getByLabel("Perkiraan pengunjung").fill("300");
  await page.getByLabel("Anggaran maks. (Rp)").fill("100000000");
  await page.getByLabel("Tanggal").first().fill("2026-12-12");
  await page.getByRole("button", { name: "Tambah hari" }).click();
  await page.getByRole("button", { name: "Tambah hari" }).click();
  await page.locator('input[name="files"]').setInputFiles({ name: "proposal.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% Tech Expo proposal\n") });
  await page.getByRole("button", { name: "Simpan dan lanjut kirim enquiry" }).click();
  await page.waitForURL(/\/acara\/[0-9a-f-]{36}\/kirim/);
  for (const ta of await page.locator("textarea").all()) await ta.fill("Gadget dan aksesori");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Kirim enquiry" }).click();
  await page.waitForURL(/sent=3/);
  await expect(page.getByText("3 enquiry terkirim.")).toBeVisible();
  await expect(page.locator("table tr")).toHaveCount(3);

  // Three independent threads with their own deadlines; each venue was notified
  const rows = await sql`
    select q.id, q.response_deadline_at, t.id as thread from enquiries q join events e on e.id = q.event_id join threads t on t.enquiry_id = q.id
    where e.name = 'Tech Expo Desember'`;
  expect(rows.length).toBe(3);
  expect(new Set(rows.map((r) => r.thread)).size).toBe(3);
  const mail = await sql`select 1 from email_outbox where to_email = ${BUDI} and category = 'enquiry_new'`;
  expect(mail.length).toBe(2); // Budi's two spaces

  // Rina writes; contact details are masked before confirmation (FR-M10-03)
  await page.locator("table a").first().click();
  await page.getByLabel("Pesan").fill("Bisa hubungi saya di 0812-3456-7890 untuk 300 m²?");
  await page.getByRole("button", { name: "Kirim", exact: true }).click();
  await expect(page.getByTestId("message").last()).toContainText("[kontak disembunyikan]");
  await expect(page.getByTestId("message").last()).toContainText("300 m²");
  await expect(page.getByText("Detail kontak dalam pesan Anda disembunyikan")).toBeVisible();
  await expectAccessible(page);
});
