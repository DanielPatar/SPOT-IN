# Hosted database (Supabase)

Decision: Supabase (PostgreSQL) for the pilot and demo databases. Hosting provider and region for Q21 must
still be written into the pilot notice (FR-M38-03). Pick the region first; it cannot be changed later.
Real pilot users' data may leave Indonesia, so the notice must state the provider and country (PRD-review #18).

## 1. Create projects (owner does this in the Supabase dashboard)
- Two separate projects, so seed data never shares a database with pilot data (FR-M38-06):
  `spotin-demo` and `spotin-pilot`.
- Choose the region nearest Indonesia (Southeast Asia / Singapore) and a strong generated database password.
- Store each password in a password manager. Do not paste it in chat, a PR or a file in this repo.

## 2. Connection strings (Project > Connect)
| Use | String | Notes |
|---|---|---|
| Migrations, seed, one-off scripts | Direct connection, or Session pooler (port 5432) | Needs `?sslmode=require`. Direct may be IPv6-only; use the session pooler if your network is IPv4. |
| App runtime | Session pooler (port 5432) | Works with the app's transactions (FR-M6-07). |
| Serverless runtime only | Transaction pooler (port 6543) | Also set `DB_PREPARE=false`. |

Put the value in `DATABASE_URL` in the host's secret store (and in a local, git-ignored `.env` for migrations).

## 3. Extensions
Migration `001_core.sql` runs `create extension if not exists` for postgis, pg_trgm, btree_gist, citext and
unaccent. All five are available on Supabase. If a migration fails on permissions, enable them under
Database > Extensions and re-run.

## 4. Apply the schema
```bash
DATABASE_URL='<direct or session-pooler url>' npm run db:migrate
```
- Never run `db:reset` or the seed scripts against the pilot project (they refuse when `APP_ENV=pilot`; set it).
- `db:seed` is for the demo project only.
- Do not run `npm test` or `npm run e2e` against a hosted database; they need their own empty databases.

## 5. Verify
```bash
DATABASE_URL='<url>' npm run pii-scan   # FR-M38-04: zero matches
```
Then open the app with that `DATABASE_URL` and sign in as a seeded user (demo project only).

## 6. Security checklist (PRD AC-M38-6)
- Row Level Security: the app connects as a server-side role through `DATABASE_URL`; do not expose the
  project's public API/anon key for these tables. Keep Data API / Realtime off for this project unless needed.
- Only named team members get access to the Supabase organization; each access is logged.
- Test a backup restore before the pilot and record it (AC-NFR-2). Free tier has no PITR.
- Rotate the database password if it was ever shared in plain text.

## 7. Data API
Turn **Settings > Data API > Enable Data API** off. The app holds no Supabase SDK; it connects only through
`DATABASE_URL` with postgres.js, and every permission check is server-side (PRD §4.3). Leaving the
auto-generated REST/GraphQL endpoints on would expose the tables over HTTP with the anon key and bypass those
checks. Migrations and the Table Editor are unaffected. If it is ever needed, enable RLS on every table first.

## 8. Deploying on Vercel
Environment variables (Production, Preview and Development):

| Key | Value |
|---|---|
| `DATABASE_URL` | Session pooler string with `?sslmode=require` |
| `APP_SECRET` | 32+ random bytes; the same value used when seeding |
| `APP_ENV` | `demo` on the demo project, `pilot` on the pilot project |
| `PILOT_MODE` | `on` |
| `APP_URL` | the deployment URL |
| `DB_POOL_MAX` | `3` — each serverless instance opens its own pool |
| `DISABLE_JOB_TICKER` | `1` — the in-process ticker cannot run on serverless |
| `CRON_SECRET` | random string; Vercel Cron sends it as the bearer token |
| `ADMIN_EMAILS` | admin addresses, comma separated |
| `EMAIL_DRIVER` | `outbox` until an email provider is chosen (`docs/ops/email.md`) |
| `SCANNER_DRIVER` | `eicar` (ClamAV has no serverless host) |
| `GEOCODER_DRIVER` | `nominatim` |
| `NOMINATIM_USER_AGENT` | must carry a real contact address, per Nominatim's policy |

Leave `XENDIT_SECRET_KEY` unset; the pilot guard refuses anything but an `xnd_development_` key (FR-M14-13).

Run the migration from a shell with those values (`npx vercel env pull .env.local` fetches them), not from the
build: the build must not mutate the schema.

### Scheduled work
`src/instrumentation.ts` ticks every 30 s, which only works on a long-lived Node server. On Vercel,
`vercel.json` schedules `GET /api/cron/tick` every 5 minutes and Vercel sends `CRON_SECRET` as the bearer
token; the route also still accepts `APP_SECRET` for an external scheduler. Without this, holds never expire
and deadlines and reminders never fire (FR-M6-05, FR-M24-10). Check a deployment's cron logs once after
release.

### File uploads
`STORAGE_DRIVER=local` writes to disk and fails on Vercel's read-only filesystem. Use Supabase Storage through
the existing S3 adapter: create a bucket, then Storage > S3 Configuration > enable the S3 connection and
generate an access key.

| Key | Value |
|---|---|
| `STORAGE_DRIVER` | `s3` |
| `S3_ENDPOINT` | `https://<ref>.storage.supabase.co/storage/v1/s3` |
| `S3_BUCKET` | the bucket name |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | from the generated access key |
| `S3_REGION` | the project region, e.g. `ap-southeast-1` |

The secret is shown once. These keys bypass Storage RLS and are server-side only; never expose them to the
browser. Keep the bucket private — the app serves files through its own signed, expiring URLs.
