# Public launch — open registration checklist

Opening sign-up is a deployment setting, not a code fork. `REGISTRATION_MODE=open` lets anyone create a
venue or organizer account without an Admin invite (FR-M38-02, proposed amendment). Everything else from
pilot mode stays on: test-mode payments only, PILOT banner and watermarks, the data rule, 18+ and consent,
email verification before sending enquiries, server-side permission checks and organization isolation.

## What changes when `REGISTRATION_MODE=open`

| Area                                        | Invite mode (default)                       | Open mode                                                     |
| ------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| Email + password sign-up (`/daftar`)        | Only Admin emails and pending pilot invites | Anyone                                                        |
| Google sign-in for a new email              | Refused (`not_invited`)                     | Sent to `/daftar` to accept consent and 18+                   |
| Team invites to a new email                 | Refused until the Admin adds the email      | Sent directly                                                 |
| Sign-up, home, footer and pilot-notice copy | "pilot tertutup", invite-only               | Open-to-the-public wording                                    |
| `/robots.txt`                               | Disallow everything                         | Allow `/`, `/daftar`, `/masuk`, `/bantuan`; disallow the rest |
| `/dev/mail` outbox viewer                   | Off in `pilot` only                         | Always off (it shows login and reset links)                   |
| Admin → Undangan pilot                      | Required step                               | Optional; a note says sign-up is open                         |

Search, space pages and dashboards still need a login (FR-M7-01). Shortlist share links and event pages work
logged out as before.

## Vercel environment variables (Production)

Set these in the Vercel project, Settings → Environment Variables, then redeploy.

| Variable                              | Value                                                    | Why                                                                                     |
| ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `REGISTRATION_MODE`                   | `open`                                                   | Turns on public sign-up                                                                 |
| `APP_ENV`                             | `pilot`                                                  | Removes the demo clock and seed tooling from production                                 |
| `PILOT_MODE`                          | `on`                                                     | Required; the server refuses to start otherwise                                         |
| `APP_URL`                             | `https://spot-in-r3tz.vercel.app` (or the custom domain) | Email links, Google callback, secure cookies                                            |
| `APP_SECRET`                          | 32+ random characters                                    | Cookies and signed file URLs                                                            |
| `DATABASE_URL`                        | Supabase session-pooler URL with `?sslmode=require`      | See `docs/ops/database.md`                                                              |
| `EMAIL_DRIVER`                        | `smtp`                                                   | With `outbox`, verification emails never reach users and they can't send enquiries      |
| `SMTP_URL`, `EMAIL_FROM`              | Transactional provider credentials and a verified sender | Same                                                                                    |
| `ADMIN_EMAILS`                        | Team admin emails                                        | Admin role and 2FA                                                                      |
| `STORAGE_DRIVER` + `S3_*`             | `s3` and bucket settings                                 | Vercel's filesystem is not persistent                                                   |
| `CRON_SECRET`, `DISABLE_JOB_TICKER=1` | Random secret, `1`                                       | Scheduled jobs on serverless                                                            |
| `XENDIT_SECRET_KEY`                   | Empty or an `xnd_development_` key                       | Live keys are refused                                                                   |
| `GOOGLE_CLIENT_ID/SECRET`             | Optional                                                 | Add `${APP_URL}/api/auth/google/callback` as an authorized redirect URI in Google Cloud |

## Other external steps

1. **Database migrations:** run `npm run db:migrate` against the production `DATABASE_URL` from a team machine
   (non-destructive; never `db:reset` on production).
2. **Admin settings:** in Admin → Pengaturan, fill `pilot_hosting_provider` and `pilot_hosting_country`
   (they still show "(diisi sebelum pilot)" by default) and bump `pilot_notice_version`, because the notice
   text changes in open mode and every new user accepts the versioned notice.
3. **Email deliverability:** verify the sending domain (SPF/DKIM) with the SMTP provider.
4. **Sign-up rate limit:** 10 sign-ups per IP per hour. A class demo behind one campus Wi-Fi address will hit
   it; stagger sign-ups or use mobile data.
5. **Legal:** PRD Q19 (PSE Lingkup Privat registration) was asked for a closed pilot; a public site changes the
   answer. Check with the course supervisor before announcing.

## Verifying a deployment

- `GET /api/health` → `{"ok":true,"env":"pilot","pilotMode":true}`
- `/robots.txt` lists `Allow: /daftar`.
- Sign up with a fresh email, receive the verification email, choose Find or List spaces, land on `/cari`
  or `/venue`.
- `/dev/mail` returns 404.

To go back to invite-only, set `REGISTRATION_MODE=invite` (or remove it) and redeploy.
