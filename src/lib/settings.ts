import { db, type Tx } from "./db";

/**
 * Admin settings (FR-M24-03) with pilot defaults from PRD §11. Records snapshot the
 * values they need when created, so changes apply only to records created afterwards.
 */
export const DEFAULT_SETTINGS = {
  commission_bps: 1000,
  organizer_fee_bps: 300,
  organizer_fee_min: 50_000,
  organizer_fee_max: 2_500_000,
  response_deadline_business_days: 2,
  tentative_hold_default_days: 5,
  tentative_hold_max_days: 14,
  min_deposit_bps: 2000,
  ppn_rate_bps: 1200,
  ppn_dpp_numerator: 11,
  ppn_dpp_denominator: 12,
  post_event_window_hours: 72,
  session_idle_days: 30,
  admin_review_target_business_days: 2,
  cancellation_policies: {
    flexible: [
      { minDays: 30, refundBps: 10000 },
      { minDays: 14, refundBps: 10000 },
      { minDays: 7, refundBps: 5000 },
      { minDays: 0, refundBps: 0 },
    ],
    moderate: [
      { minDays: 30, refundBps: 10000 },
      { minDays: 14, refundBps: 5000 },
      { minDays: 7, refundBps: 0 },
      { minDays: 0, refundBps: 0 },
    ],
    strict: [
      { minDays: 30, refundBps: 5000 },
      { minDays: 14, refundBps: 0 },
      { minDays: 7, refundBps: 0 },
      { minDays: 0, refundBps: 0 },
    ],
  },
  pilot_notice_version: "2026-11-pilot-1",
  terms_version: "2026-11-pilot-1",
  privacy_version: "2026-11-pilot-1",
  pilot_deletion_date: "2027-03-31",
  pilot_hosting_provider: "(diisi sebelum pilot)",
  pilot_hosting_country: "(diisi sebelum pilot)",
  pilot_contact_email: "group4.spotin@example.com",
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export async function getSettings(sql: Tx = db()): Promise<Settings> {
  const rows = await sql`select key, value from settings`;
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (String(r.key) in DEFAULT_SETTINGS) out[String(r.key)] = r.value;
  }
  return out as Settings;
}

export async function getSetting<K extends SettingKey>(key: K, sql: Tx = db()): Promise<Settings[K]> {
  const rows = await sql`select value from settings where key = ${key}`;
  return (rows[0]?.value as Settings[K] | undefined) ?? DEFAULT_SETTINGS[key];
}

export async function setSetting(key: SettingKey, value: unknown, actorId: string | null, sql: Tx = db()): Promise<void> {
  await sql`
    insert into settings (key, value, changed_by, changed_at)
    values (${key}, ${sql.json(value as never)}, ${actorId}, now())
    on conflict (key) do update set value = excluded.value, changed_by = excluded.changed_by, changed_at = now()`;
}
