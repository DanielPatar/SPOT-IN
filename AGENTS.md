# AGENTS.md — Spot-In

## Source of truth
- Build only what is in `docs/PRD.md` (v1.2) and `docs/features.json`. Phase 2/3 items are out of scope until the team moves them in.
- If code and PRD disagree, the PRD wins. Propose a PRD change; don't diverge silently.

## Definition of done
- A feature is done only when all its acceptance criteria in `features.json` pass in the demo environment, through a demo-script step (D1–D7) or an automated test.
- Set `status: "done"` and `passes: true` only after that test passes. List the FR IDs you touched in every PR.

## Pilot mode (always on)
- Payments use test mode or the built-in simulator only. Never add live keys; the server must refuse them.
- Never add fields, uploads or logs for ID documents, selfies, NIK, NPWP, NIB, deeds, bank or card numbers.
- Every generated PDF and booking page carries the PILOT watermark or banner.
- Event pages stay unlisted: `noindex`, no sitemap entry, no structured data.
- Use seed data only in tests, fixtures and demos; never copy pilot users' data.

## Stack and conventions
- PostgreSQL + PostGIS + pg_trgm for data and search; no separate search engine.
- Maps: Leaflet/MapLibre with OSM tiles; geocode once on save, never per keystroke.
- Notifications: email and in-app only; no WhatsApp or SMS APIs.
- UI text in Bahasa Indonesia, every string in the message catalog; no hard-coded strings.
- Money is integer Rupiah, rounded half-up per line; ledger entries are append-only and must reconcile (PRD §11).
- Deadlines use the business-day helper, holiday calendar and app clock (PRD §11.6, FR-M38-10), never the system clock.
- Check permissions server-side on every request (PRD §4.3).
- Re-check availability and accept quotes in one transaction (FR-M6-07).
- Call external services only through adapters.
- Run tests and lint before you finish.
