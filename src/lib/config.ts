import { z } from "zod";

/**
 * Environment configuration with the pilot guard (FR-M38-07, FR-M14-13).
 * Loading the config throws — and so the server refuses to start — when pilot mode
 * is off or a live payment key is configured.
 */
const schema = z.object({
  APP_ENV: z.enum(["development", "test", "demo", "pilot"]).default("development"),
  PILOT_MODE: z.string().default("on"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1),
  EMAIL_DRIVER: z.enum(["outbox", "smtp"]).default("outbox"),
  EMAIL_FROM: z.string().default("Spot-In <no-reply@spot-in.test>"),
  SMTP_URL: z.string().optional(),
  ADMIN_EMAILS: z.string().default(""),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  SCANNER_DRIVER: z.enum(["eicar", "clamd"]).default("eicar"),
  CLAMD_HOST: z.string().default("127.0.0.1"),
  CLAMD_PORT: z.coerce.number().default(3310),
  GEOCODER_DRIVER: z.enum(["nominatim", "fake"]).default("nominatim"),
  NOMINATIM_URL: z.string().default("https://nominatim.openstreetmap.org"),
  NOMINATIM_USER_AGENT: z.string().default("Spot-In course pilot"),
  MAP_TILE_URL: z.string().default("https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
  MAP_TILE_ATTRIBUTION: z.string().default("© OpenStreetMap contributors"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  XENDIT_SECRET_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema> & { pilotMode: true; demoClockEnabled: boolean };

export class PilotGuardError extends Error {}

/** Pure check so it can be unit tested. */
export function assertPilotSafe(env: Record<string, string | undefined>): void {
  const pilot = (env.PILOT_MODE ?? "on").toLowerCase();
  if (pilot !== "on" && pilot !== "true" && pilot !== "1") {
    throw new PilotGuardError("PILOT_MODE must be on for the MVP (FR-M38-07). Refusing to start.");
  }
  const key = env.XENDIT_SECRET_KEY ?? "";
  if (key && !key.startsWith("xnd_development_")) {
    throw new PilotGuardError(
      "A live payment key is configured while pilot mode is on (FR-M14-13). Only xnd_development_ keys are allowed. Refusing to start.",
    );
  }
}

let cached: AppConfig | undefined;

export function config(): AppConfig {
  if (cached) return cached;
  assertPilotSafe(process.env);
  const parsed = schema.parse(process.env);
  cached = { ...parsed, pilotMode: true, demoClockEnabled: parsed.APP_ENV === "demo" || parsed.APP_ENV === "test" };
  return cached;
}

export function resetConfigForTests(): void {
  cached = undefined;
}

export function adminEmails(): string[] {
  return config()
    .ADMIN_EMAILS.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
