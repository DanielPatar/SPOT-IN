# Spot-In

Web marketplace connecting event organizers with malls, venues and space owners in Indonesia.
This repository is the **course pilot MVP** described in [`docs/PRD.md`](docs/PRD.md) (v1.2). Rules for
contributors and coding agents are in [`AGENTS.md`](AGENTS.md); requirement status lives in
[`docs/features.json`](docs/features.json).

**Status: Build 1 — listings and enquiries** (PRD §14). Demo scenarios D1 (venue onboarding) and
D2 (search and enquiry) pass end to end. Quotes, agreements, sandbox payments (Build 2) and event
pages, cancellations, post-event release (Build 3) are not built yet.

## Stack

- Next.js 16 (App Router, server actions) + TypeScript strict
- PostgreSQL 16 with PostGIS, pg_trgm, btree_gist — data, availability, distance and fuzzy search (no separate search engine)
- SQL migrations in `db/migrations`, queries with [postgres.js](https://github.com/porsager/postgres)
- Bahasa Indonesia only, every string in `messages/id.json` (next-intl); ESLint fails on literal JSX strings
- Leaflet + OpenStreetMap tiles; Nominatim geocoding once on save
- Vitest (unit + integration on a real database) and Playwright + axe (end to end, accessibility)

## Run it locally

Requirements: Node 22, PostgreSQL 16 with PostGIS (or Docker).

```bash
npm install
cp .env.example .env              # defaults work for local development
./scripts/local-db.sh             # or: docker compose up -d postgres
npm run db:migrate
npm run db:seed                   # demo actors and venues (refuses to run in the pilot environment)
npm run dev                       # http://localhost:3000
```

Seeded logins (password `spotin-demo-2026`): `admin@spot-in.test` (TOTP secret
`JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP`, add it to an authenticator app), `rina@spot-in.test`,
`sari@spot-in.test`, `venue.selatan@spot-in.test`. `budi@spot-in.test` is invited but not signed up, ready for D1.
Emails are written to the outbox; read them at `/dev/mail` (not available in the pilot environment).

## Tests and checks

```bash
npm run lint && npm run typecheck
npm test                  # unit + integration (needs the spotin_test database)
npm run build && npm run e2e   # D1 and D2 in Chromium against the demo seed (spotin_e2e database)
npm run pii-scan          # FR-M38-04: no blocked fields or NIK/card-like numbers
npm run db:seed:perf && npm run perf:search   # 5,000 spaces / 50,000 calendar entries; prints p50/p95
```

## Environments and pilot safety

- `APP_ENV`: `development`, `test`, `demo`, `pilot`. The demo clock (FR-M38-10) exists only in `demo`/`test`.
- The server refuses to start when `PILOT_MODE` is not `on` or a non-test payment key is configured (FR-M38-07).
- Seed scripts refuse the `pilot` environment; demo and pilot data live in separate databases (FR-M38-06).
- Scheduled work (deadlines, holds, reminders, daily admin email) runs from a PostgreSQL job table on the
  application clock. The Node server ticks every 30 s; hosts can also call `POST /api/cron/tick` with
  `Authorization: Bearer $APP_SECRET`.
- Pilot data deletion: see [`docs/pilot-deletion.md`](docs/pilot-deletion.md).

## Code map

| Path | What |
|---|---|
| `src/lib` | Config and pilot guard, app clock, business days, time zones, money, permissions, masking, pricing, jobs |
| `src/adapters` | Email, storage, virus scan, geocoder — every external call goes through these |
| `src/server` | Domain services (one file per module group); framework-free and covered by integration tests |
| `src/web` | Session, server actions and view helpers |
| `src/app` | Pages and API routes (Bahasa Indonesia slugs) |
| `db/migrations` | Schema, reference data (holiday calendar from the SKB lists, search synonyms), search index |
| `tests`, `e2e` | Vitest integration tests; Playwright D1/D2 |
