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
