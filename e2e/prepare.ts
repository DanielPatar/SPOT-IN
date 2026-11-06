/** Resets the e2e database and loads the demo seed before Playwright starts the server. */
import { migrate } from "../scripts/migrate";

const url = process.env.E2E_DATABASE_URL ?? "postgres://spotin@127.0.0.1:5433/spotin_e2e";
process.env.DATABASE_URL = url;
process.env.APP_ENV = "demo";
process.env.PILOT_MODE = "on";
process.env.APP_SECRET ??= "e2e-secret-e2e-secret-e2e-secret-e2e";
process.env.EMAIL_DRIVER = "outbox";
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_DIR = "./storage-e2e";
process.env.GEOCODER_DRIVER = "fake";
process.env.ADMIN_EMAILS = "admin@spot-in.test";
process.env.APP_URL = `http://127.0.0.1:${process.env.E2E_PORT ?? 3100}`;

async function main() {
  await migrate(url, { reset: true, quiet: true });
  const { seed } = await import("../scripts/seed");
  const { closeDb } = await import("../src/lib/db");
  await seed();
  await closeDb();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
