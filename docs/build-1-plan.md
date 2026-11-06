# Plan — Spot-In scaffold + Build 1 (D1 venue onboarding, D2 search & enquiry)

## Context
PRD v1.2 (`docs/PRD.md`), `docs/features.json` and `AGENTS.md` are ready; no code exists yet. This run sets up the project and delivers **Build 1** from PRD §14: modules M1–M10, M24 basics, the M25 string catalog and the M38 invite-only/consent parts, so demo scenarios **D1** and **D2** pass. Stack: **Next.js + TypeScript**, pushed to a **new GitHub repo**. Every rule in `AGENTS.md` applies (PRD wins, definition of done, pilot mode, PostgreSQL-only, email-only, Bahasa Indonesia catalog, integer Rupiah, app clock, server-side permissions, adapters).

## 0. Blockers to clear before execution
1. **Package installs are blocked in this session** (npm can't reach the registry; PostGIS isn't installed locally). Turn on package installs in your network settings and **start a new chat** with this plan; a running chat may not pick up the change. Without it I can only write untested code, which fails the definition of done.
2. **GitHub repo**: create an empty repo and give me `owner/repo`; I'll attach it with push access.
3. Hosting (Q21) is not needed for Build 1 — everything runs locally and in CI.

## 1. Stack decisions
- Next.js (App Router) + TypeScript strict; server actions and route handlers; zod for validation.
- PostgreSQL 16 with PostGIS, pg_trgm, btree_gist; **Drizzle ORM** + drizzle-kit migrations (raw SQL where Drizzle can't express geography types and exclusion constraints).
- Auth.js v5: email magic link + email/password (argon2) + Google; TOTP (otplib) for Admin 2FA.
- next-intl with one catalog `messages/id.json`; ESLint rule failing on literal UI strings (FR-M25-05).
- react-leaflet + OSM-based tiles; Nominatim geocoding server-side, cached, ≤ 1 req/s (FR-M4-01, §10).
- Email via SMTP adapter (Mailpit in dev); storage via S3 adapter (MinIO in dev); virus scan adapter (ClamAV in dev); images to WebP with sharp.
- Jobs: pg-boss (Postgres-backed queue) for deadlines, reminders, hold expiry, daily admin email — all reading the **app clock**.
- Tests: Vitest (unit + integration on a real Postgres), Playwright (e2e D1, D2), axe for accessibility.
- `docker-compose.yml` for dev: postgis/postgis:16, Mailpit, MinIO, ClamAV.

## 2. Steps
1. **Scaffold repo**: Next.js app, `AGENTS.md` at root, `docs/` (PRD, features.json, review log, archive), README with setup, `.env.example`, docker-compose, ESLint/Prettier, Vitest/Playwright config.
2. **Platform core** (`src/lib/`): config with pilot guard (refuses to boot if `PILOT_MODE` is off or a live payment key is present); `clock.ts` app clock with demo offset (enabled only when `APP_ENV=demo`, FR-M38-10); `businessDays.ts` (§11.6) using the holiday table; `money.ts` (integer Rupiah, half-up per line); `permissions.ts` from the §4.3 matrix; `audit.ts`; Postgres-backed rate limiter; adapter interfaces (email, storage, scanner, geocoder).
3. **Schema + migrations** for Build 1 entities from PRD §9.1: users, consent_records, pilot_invites, sessions, organizations, memberships, properties (geography point, timezone), spaces, rate_cards, add_ons, tax_settings, calendar_entries (`tstzrange` + exclusion constraint per space for holds/booked/blocked), shortlists + share links, events, enquiries, threads/messages, reports, holiday_calendar, settings, notifications, audit_log. **No columns for blocked data** (FR-M38-04); `scripts/pii-scan.ts` scans for them and for 16-digit NIK/card-like numbers.
4. **Accounts — M1** (FR-M1-01…11): invite-only sign-up, email verification, password/magic link/Google, sessions list/revoke, idle logout, profile with optional phone (hidden until a booking exists — Build 2), intent chooser, context switcher, account deletion with Owner check, consent capture, 18+ confirmation, quick attendee account (used by Build 3; built now in auth).
5. **Organizations & roles — M2** (FR-M2-01…14): create operator (one property) or organizer org, profile without NPWP/NIB, invites with 7-day expiry, approval threshold setting, Owner rules, member removal with reassignment, org audit log, server-side checks returning a non-revealing permission error.
6. **Admin basics — M24/M3** (FR-M3-02/03/08/09, FR-M24-01…12 minus ledger view): one Admin role with required TOTP; queues for verification, space review and reports; manual "Verified by Spot-In" with date/method; approve/reject with reason; suspend/unsuspend; search; settings (fees, deadlines, hold durations, cancellation policies, invite list, deletion date); holiday calendar seeded for 2026–2027 from the official SKB list (looked up and cited at execution); daily reminder email for items waiting > 2 business days; demo-clock control (demo env only).
7. **Properties, spaces, pricing — M4/M5** (FR-M4-01…16, FR-M5-01…07): property form with required map pin and time zone prefilled from the pin; space specs and capacities by layout; ≤ 15 photos (scanned, WebP); required documents; ≤ 5 enquiry questions; status flow Draft → In review → Published; duplicate; rate cards with weekday/weekend and seasons; add-ons; PKP/PPN settings; "from" price; quick estimate as a pure function shared later with the quote builder.
8. **Calendar & holds — M6** (FR-M6-01…08): venue calendar UI; blocks incl. weekly recurring; tentative holds with expiry and notifications; buffer hours; atomic placement relying on the exclusion constraint inside a transaction; booking-hold/booked states modeled now, used in Build 2.
9. **Search & shortlists — M7/M8** (FR-M7-01…13, FR-M8-01/02/04): one SQL query with filters, availability anti-join on calendar_entries, PostGIS distance, pg_trgm + full-text + synonym table ("jaksel" → "Jakarta Selatan"); list and map views; sorts; "near me" with permission and city fallback; property page; shortlists, view-only share link with revoke, send enquiry from a shortlist.
10. **Events & enquiries — M9** (FR-M9-01…08, 11): event form and proposal files (≤ 5 × 10 MB, scanned); fan-out with limits (5 per send, 10 open per event, 20 per day); space questions; pre-submit warnings; status machine; 2-business-day deadline with reminders at 24 h and 4 h before and expiry job; decline reasons; withdraw; venue internal notes.
11. **Messaging — M10** (FR-M10-01…09): thread per enquiry; polling every 5 s; attachments (types, 10 MB, scan, preview); masking function per FR-M10-03 with the AC-M9/M10-5 string table as tests; saved replies; inbox filters; report; 10-minute edit; soft delete.
12. **Minimal notifications** (pulled forward from M21 because enquiries need them): in-app list + email for Build 1 events; transactional vs optional flags.
13. **Pilot mode parts — M38** (FR-M38-02/03/04/05/06/09/10): invite list, pilot notice with version (hosting provider/country as a setting to fill before the pilot), global pilot banner, data export JSON, documented deletion job script, separate demo/pilot environments in config.
14. **Seed data**: D1/D2 actors (Admin, Budi, Rina, Sari) and a 5,000-space performance seed.
15. **CI** (GitHub Actions): lint incl. string rule, typecheck, unit, integration against a PostGIS service, Playwright e2e, gitleaks secret scan, `npm audit`.

## 3. Deferred to Build 2 (needs quotes/bookings)
FR-M8-05 comparison PDF, FR-M9-09 quote flagging on event edit, FR-M9-10 "mark others Lost" on acceptance, phone reveal after confirmation, watermarking of PDFs. Their `features.json` entries stay `not_started`.

## 4. Verification
- `npm run lint && npm run typecheck && npm test` (unit + integration) pass, including: business-day example (Friday 16:00 → Wednesday 23:59 with Monday holiday), masking string table, permission matrix, concurrent tentative holds (exactly one succeeds), ID-revealing URL returns permission error.
- `npx playwright test` runs D1 and D2 end to end against docker-compose services; emails checked in Mailpit.
- axe check on sign-up, property form, search and enquiry pages: no critical issues.
- Search p95 ≤ 500 ms on the 5,000-space seed (script prints timings).
- `npm run pii-scan` reports zero matches.
- In `features.json`, set `status: "done"` / `passes: true` only for requirements whose every listed AC passes; ACs that need Build 2 parts stay false. Report the list of done FR IDs.
- Push to the repo as one PR "Build 1" with commits per step; CI green.
