# Pilot data deletion runbook (FR-M38-05)

The pilot deletion date is an Admin setting (`pilot_deletion_date`, shown in the pilot notice).
On or after that date a named team member runs the deletion job against the **pilot** database.

1. Take a database backup and keep it only as long as the course requires (then delete it).
2. Dry run — prints what would be removed:
   `DATABASE_URL=… APP_ENV=pilot npm run pilot:delete`
3. Run it:
   `DATABASE_URL=… APP_ENV=pilot npm run pilot:delete -- --confirm`
4. Verify: `npm run pii-scan` reports 0 matches; `select count(*) from users where not is_admin and name <> ''` is 0.
5. Record the date, the person who ran it and the verification result in the course log (PRD §14 "Pilot end").

What the job does: deletes every uploaded file (storage and records), empties message text,
removes notifications, outbox, sessions, tokens, consent records and reports, and anonymizes users,
organizations, events, enquiries and property text. Only anonymized counts remain.
The job is covered by an automated test that runs it on a copy of pilot-like data (AC-M38-5).
