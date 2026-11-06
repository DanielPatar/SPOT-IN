import { expect, type Page } from "@playwright/test";
import postgres from "postgres";
import { generate } from "otplib";
import AxeBuilder from "@axe-core/playwright";

export const PASSWORD = "spotin-demo-2026";
export const TOTP = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
export const sql = postgres(process.env.E2E_DATABASE_URL ?? "postgres://spotin@127.0.0.1:5433/spotin_e2e", { max: 2, onnotice: () => {} });

export async function lastLink(email: string, contains?: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const rows = await sql`select text_body from email_outbox where to_email = ${email} order by created_at desc limit 5`;
    for (const r of rows) {
      const m = String(r.text_body).match(/https?:\/\/\S+/);
      if (m && (!contains || m[0].includes(contains))) return new URL(m[0]).pathname + new URL(m[0]).search;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no email with link for ${email}`);
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/masuk");
  const form = page.locator("form").filter({ has: page.getByLabel("Kata sandi") });
  await form.getByLabel("Email", { exact: true }).fill(email);
  await form.getByLabel("Kata sandi").fill(password);
  await form.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/masuk"));
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL(/\/masuk/);
}

export async function adminLogin(page: Page) {
  await login(page, "admin@spot-in.test");
  await page.goto("/admin");
  if (page.url().includes("/admin/2fa")) {
    await page.getByLabel("Kode 6 digit").fill(await generate({ secret: TOTP }));
    await page.getByRole("button", { name: "Verifikasi kode" }).click();
    await page.waitForURL(/\/admin$/);
  }
}

/** WCAG 2.1 AA check (NFR accessibility): no critical violations. */
export async function expectAccessible(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude(".leaflet-container").analyze();
  const critical = r.violations.filter((v) => v.impact === "critical");
  expect(critical.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function okAlert(page: Page) {
  await expect(page.locator(".alert-ok").first()).toBeVisible();
}
