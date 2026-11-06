import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      APP_ENV: "demo",
      PILOT_MODE: "on",
      APP_URL: `http://127.0.0.1:${PORT}`,
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://spotin@127.0.0.1:5433/spotin_e2e",
      EMAIL_DRIVER: "outbox",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: "./storage-e2e",
      SCANNER_DRIVER: "eicar",
      GEOCODER_DRIVER: "fake",
      APP_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
      ADMIN_EMAILS: "admin@spot-in.test",
    },
  },
});
