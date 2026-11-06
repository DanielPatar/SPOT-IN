# Spot-In UI mock-ups (PRD v1.2)

High-fidelity, clickable mock-ups for every user flow in `docs/PRD.md` §6.1–§6.12. The app is a small, self-contained React + TypeScript + Vite project that uses shadcn/ui (Radix primitives) and Tailwind CSS v4. All data is fictional. All UI copy is in Bahasa Indonesia (FR-M25-01).

**46 screens** (45 product screens plus one design-foundations page) with **183 states** in total, covering default, empty, loading, error and permission states from PRD §12.

## How to run

```bash
cd docs/mockups
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks (tsc -b) and builds static files to dist/
npm run preview    # serves dist/
```

`dist/` uses relative paths, so you can open it from any static host or a subfolder.

**Using the viewer**
- The home page is the gallery. It lists every screen, grouped by PRD flow section, with its role, device and number of states.
- When you open a screen, a bar at the top shows the PRD section and requirement IDs, plus a **state switcher**. The chips are links (`#/screen-id?state=state-id`), so each state can be shared directly. Chips that show a PRD reference (for example `§12.1` or `AC-M12-3`) illustrate that edge case or acceptance criterion.
- Organizer, owner and attendee screens render in a 390 px phone frame (mobile-first, PRD §8). Venue dashboards and admin screens render in a laptop frame.
- Dialogs and sheets open inside the frame. "Sebelumnya" and "Berikutnya" step through screens in demo-script order.

## Screen inventory

Device: M = mobile, D = desktop/laptop.

| # | Screen (id) | PRD flow | Dev. | Requirements | States |
|---|---|---|---|---|---|
| 0 | Fondasi desain (`foundations`) | §8, §7.18 | D | FR-M25-01/02, FR-M38-01, NFR accessibility | Tokens |
| 1 | Daftar dari undangan (`signup`) | §6.1.2 | M | FR-M1-01, -09, -11, FR-M38-02, -03, -09 | Form, field errors, uninvited email (§12.6), expired invite (§12.6) |
| 2 | Verifikasi email (`verify-email`) | §6.1.2 | M | FR-M1-02, FR-M21-07 | Waiting (spam hint), resent, verified, expired link, email provider down |
| 3 | Masuk (`login`) | §6.1 | M | FR-M1-01, -04 | Password, magic link, link sent, failed login |
| 4 | Sesi berakhir (`session-expired`) | §12.7 | M | FR-M1-04 | Re-login dialog, draft kept |
| 5 | Pilih peran (`role`) | §6.1.3 | M | FR-M1-06, -07 | Find, list, both |
| 6 | Penyiapan: profil tempat (`onb-operator`) | §6.1.3 | M | FR-M2-01, -02, FR-M1-05 | Form |
| 7 | Penyiapan: properti + titik peta (`onb-property`) | §6.1.4 | M | FR-M4-01, -04, -08 | Filled, no pin (error summary), map provider down, offline |
| 8 | Penyiapan: ruang (`onb-space`) | §6.1.5 | M | FR-M4-02, -03, -04, -09, -11, -16 | Filled, 15-photo limit |
| 9 | Penyiapan: harga, layanan tambahan, kebijakan (`onb-pricing`) | §6.1.5 | M | FR-M5-01, -02, -04, -05, -06, FR-M18-03, FR-M2-06 | As Owner, as Staff (no threshold access) |
| 10 | Penyiapan: dokumen wajib (`onb-docs`) | §6.1.4 | M | FR-M4-08, FR-M38-04 | Filled, empty |
| 11 | Penyiapan: undang tim (`onb-team`) | §6.1.6 | M | FR-M2-03, -08 | Form, sent, already a member |
| 12 | Penyiapan: kirim untuk ditinjau (`onb-submit`) | §6.1.7 | M | FR-M4-10, FR-M3-02, -03 | Ready, loading, incomplete, in review |
| 13 | Admin: antrean verifikasi (`admin-verify`) | §6.1.7 | D | FR-M3-02, -09, FR-M24-01, -04, -10 | Queue with overdue item, verification sheet, reject without reason, loading, empty |
| 14 | Admin: tinjauan ruang (`admin-space`) | §6.1.7 | D | FR-M4-10, FR-M3-03, -08 | Review, return with note, operator unverified |
| 15 | Admin: pengaturan, hari libur, jam demo (`admin-settings`) | §6.1, §11.6 | D | FR-M24-03, -11, FR-M38-10, -02 | Fees and deadlines, holidays, demo clock, clock moved +3 days |
| 16 | Admin: buku besar dan masalah (`admin-ledger`) | §6.10.4 | D | FR-M24-05, -02, FR-M16-08 | All reconciled, mismatch (§12.4) |
| 17 | Cari ruang (`search`) | §6.2.1 | M | FR-M7-01, -02, -03, -04, -10, -12, -13 | Typo-corrected list, filter sheet, map, loading, no results, server error |
| 18 | Halaman ruang (`space`) | §6.2.2 | M | FR-M4-03, FR-M5-06, -07, FR-M6-02, FR-M3-08, FR-M7-06 | Page, non-binding estimate, loading, not found |
| 19 | Daftar pilihan + bagikan (`shortlist`) | §6.2.3 | M | FR-M8-01, -02, -04 | List, share sheet, empty |
| 20 | Tautan daftar pilihan (`shortlist-public`) | §6.2.3 | M | FR-M8-02 | Logged out view, revoked link |
| 21 | Buat acara + kirim permintaan (`enquiry`) | §6.2.4 | M | FR-M9-01, -02, -03, -04, -05, FR-M1-02 | Form, pre-submit warnings, field errors, file rejected by scan, daily limit, email unverified, sent |
| 22 | Kotak masuk pengelola (`venue-inbox`) | §6.3.1 | D | FR-M10-07, FR-M9-06, -07, FR-M2-14 | List, loading, empty, permission denied |
| 23 | Detail permintaan (`venue-enquiry`) | §6.3.1–2 | D | FR-M9-07, -08, -11, FR-M6-04, FR-M10-04 | Detail, request info (sheet), tentative hold (dialog), hold placed, decline with reason (dialog), declined, as Viewer |
| 24 | Percakapan (`thread`) | §6.3 | M | FR-M10-01, -02, -03, -09 | Thread, contact masked, after confirmation, loading, send failed |
| 25 | Penyusun penawaran (`quote-builder`) | §6.3.3–4 | D | FR-M12-01–05, FR-M2-06, FR-M3-03, FR-M12-13 | Staff draft, pending approval, Owner view, will be backup quote, dates booked, balance too close, operator unverified |
| 26 | Dasbor alur pengelola (`venue-pipeline`) | §6.3 | D | FR-M22-01, -02, -03 | Dashboard |
| 27 | Penawaran untuk penyelenggara (`quote`) | §6.4.1–4 | M | FR-M12-06–11, FR-M9-09, -10 | v2, diff from v1, revision sheet, accept confirmation, mark others lost, dates just taken, superseded, expired, event changed |
| 28 | Bandingkan penawaran (`compare`) | §6.4.3 | D | FR-M8-05 | 3 quotes, only 1 received |
| 29 | Perjanjian contoh (pilot) (`agreement`) | §6.5.1–2 | M | FR-M13-02, -05, -07, -09, -10, FR-M38-01 | Not accepted, errors, organizer accepted, venue's turn, generating, generation failed (§12.3) |
| 30 | Pembayaran sandbox (`payment`) | §6.5.3–4, §6.7.3 | M | FR-M14-01, -02, -03, -06, -08, FR-M15-01 | Method choice, test VA, processing, confirmed + pilot receipt, balance, card declined, VA expired, provider down |
| 31 | Penawaran cadangan (`backup-quote`) | §6.6 | M | FR-M12-13 | Dates held, hold released, lost the race, dates booked |
| 32 | Acara saya (`organizer-dashboard`) | §6.7 | M | FR-M22-06 | List, empty |
| 33 | Ruang kerja pemesanan (`workspace`) | §6.7 | D | FR-M17-01–04, FR-M15-09, FR-M1-05 | Organizer, venue reviewing, request changes, 7 days out and incomplete |
| 34 | Buat halaman acara (`event-editor`) | §6.8.1–3 | M | FR-M28-01–05, -09, FR-M30-02, -08 | Draft, live with link, change time (notify N people), capacity below registrations, sensitive question rejected |
| 35 | Halaman acara + pendaftaran (`event-page`) | §6.8.4–5 | M | FR-M28-13, -17, FR-M30-01, -04, -09, FR-M1-10, FR-M36-04, FR-M18-10 | Form, errors, check email, already registered, registration full, cancelled, removed |
| 36 | Daftar pendaftar (`attendees`) | §6.8 | D | FR-M30-11, -08, FR-M2-10 | As Owner, as Member (export disabled) |
| 37 | Kartu masuk saya (`my-passes`) | §6.8.4 | M | FR-M31-01, FR-M30-07 | List, empty |
| 38 | Kartu masuk QR (`pass`) | §6.9 | M | FR-M31-01–03, -07, FR-M32-01, -03, -08 | Holder, opened by someone else, organizer check-in, undo within 5 min, already checked in, other session, voided |
| 39 | Check-in dari daftar (`checkin`) | §6.9 | M | FR-M32-01, -12, FR-M30-11 | List, search, loading, offline |
| 40 | Setelah acara (`after-event`) | §6.10 | M | FR-M16-01, -07, -08, -09, FR-M15-07 | Report window open, report a problem, release on hold, released with statement |
| 41 | Pembatalan oleh penyelenggara (`cancel-organizer`) | §6.11 | M | FR-M18-03, -04, -05, -10, FR-M14-09 | 35 days out, 20 days out, confirm dialog, Member (not allowed) |
| 42 | Pembatalan oleh pengelola (`cancel-venue`) | §6.12 | D | FR-M18-06, -10, FR-M38-08 | Form, missing reason, done |
| 43 | Notifikasi (`notifications`) | cross-flow | M | FR-M21-01, -02, -05, -07 | List, loading, empty, email bounced |
| 44 | Pengaturan akun (`settings`) | cross-flow | D | FR-M1-03, -04, -05, -08, FR-M21-02, FR-M38-05 | Sessions, enable 2FA, email preferences, data export, delete account, delete blocked |
| 45 | Keadaan umum (`generic`) | §12.7 | M | §12.7, FR-M2-14 | Offline, permission denied, not found, server error with reference ID |

### PRD §12 edge cases shown

- **§12.1 availability:** dates just taken (`quote:taken`, `backup-quote:lost`), quoting booked dates blocked (`quote-builder:blocked`), backup quote on held dates (`quote-builder:backup`, `backup-quote`), backup quote expires when dates are booked.
- **§12.2 enquiries and quotes:** superseded version, event changed, enquiry limits, file rejected by virus scan, contact masking, Owner approval pending.
- **§12.3 agreement:** generating, generation failed with retry.
- **§12.4 payments:** VA expired, processing ("Diproses", never "Gagal" before the provider confirms), test card declined, adapter down, ledger mismatch.
- **§12.5 events:** registration full, already registered, pass opened by a stranger, pass used twice, capacity below registrations, cancelled event, page removed.
- **§12.6 accounts:** uninvited email, expired invite, delete blocked for the only Owner, bounced email.
- **§12.7 generic:** offline bar, session expired, permission denied, not found, provider down (maps, email, payments), inline validation with error summary, server error with reference ID.

### Data used

All amounts follow PRD §11.2 (worked example): rental + add-ons Rp 81.000.000, PPN Rp 8.910.000, venue total Rp 89.910.000, Spot-In fee Rp 2.430.000, total Rp 92.340.000, deposit Rp 47.385.000, balance Rp 44.955.000. The settlement uses commission Rp 8.100.000, venue payable Rp 81.810.000 and Spot-In revenue Rp 10.530.000. Quote version 1 (before revision) is Rp 27.000.000/day plus cleaning, and its Spot-In fee is capped at Rp 2.500.000 (§11.1).

Timeline: today is Fri 6 Nov 2026. The enquiry deadline is Tue 10 Nov. v2 is sent 10 Nov and valid until 17 Nov. Acceptance and agreement are on 13 Nov; the deposit deadline is 16 Nov. Balance is requested 21 Nov and due Sat 28 Nov (14 days before the event). The event runs Sat–Mon 12–14 Dec 2026 at 10.00–22.00 WIB. The report window ends Thu 17 Dec 22.00 and release runs Fri 18 Dec 10.00 (§11.7). Cancellation examples use a second booking (BK-0093, 9–11 Jan 2027) with the same amounts, so the 35-day and 20-day tiers from AC-M18-1 fall after its confirmation date. The amounts are a 44.955.000 refund and 0 refund, with the Spot-In fee kept.

## Research and conclusions

### shadcn/ui and choosing an overlay
- shadcn/ui is copy-in source built on Radix primitives, which handle focus trapping, Esc, `aria-modal`, and labelling via `Title`/`Description`. Every Dialog, AlertDialog and Sheet here has a title and a description. The Sheet component "extends the Dialog component to display content that complements the main content of the screen" ([shadcn/ui Sheet](https://ui.shadcn.com/docs/components/sheet)).
- NN/g recommends modal dialogs for critical warnings and irreversible actions, and for information needed to continue a task the user started. It advises against modals for high-stakes flows such as checkout, for complex decisions that need information the modal hides, and for errors that are easier to fix inline ([NN/g, Modal & Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/)).
- GitHub's Primer explains that toasts disappear before people finish reading, are often not keyboard reachable, break reading order and can cover content. It recommends showing results in place, using persistent banners, and notifying by email for long tasks ([Primer: Accessible notifications](https://primer.style/accessibility/toasts/)).

**Rules applied**

| Pattern | Used for | Examples |
|---|---|---|
| Inline `Alert` (Notice) | Anything that must stay visible: errors, deadlines, status changes, results of an action | "Tanggal ini baru saja diambil", "Menunggu persetujuan Pemilik", "Pemesanan terkonfirmasi" |
| `AlertDialog` | Irreversible or consequential confirmation only | Cancel booking, delete account, notify N registrants, mark other enquiries Lost |
| `Dialog` | Short blocking task the user started | Re-login after session expiry, tentative hold, decline with reason |
| `Sheet` (side on desktop, bottom on mobile) | Supporting task without losing context | Filters, request info, revision comments, accept-quote terms, share link, admin verification, report a problem |
| `Popover` | Small in-place input | Date picker |
| `Tooltip` | Naming icon-only buttons and explaining terms; never the only place information lives | Save to shortlist, attachment rules, space status |
| Toast | **Not used.** Every result appears on the page that caused it, and the transactional ones are also emailed (FR-M21-02). | — |

Payment and accepting a quote are full pages or bottom sheets with the money visible, not modals (NN/g: avoid modals in high-stakes flows).

### Visual hierarchy and consistency
- One primary action per area (filled brand green). The secondary action is outlined, the tertiary is a text button, and destructive red appears only inside the final confirmation step.
- Page titles state the situation; there are no eyebrow labels above titles. The only label-above-content devices are the booking step indicator and the setup step counter, because both are real sequences (§9.2 booking state machine, §6.1 setup steps).
- Structure comes from type size and weight, spacing and a single hairline border. There are no stacked shadows, gradients or glass effects. The one raised object is the document preview, because it stands in for a printed page.
- Status is always shown the same way: an icon plus text inside a pill, with fixed meanings. Green means done or positive, warm means waiting or held, red means a problem, neutral means not started.
- The same concept always uses the same component: `MoneyRow` for every amount, `DocPreview` (with watermark) for every generated document, `Notice` for every inline message.

### Accessibility (WCAG 2.1 AA)
References: [W3C WCAG 2.1](https://www.w3.org/TR/WCAG21/), [GOV.UK guide to WCAG](https://alphagov.github.io/guide-to-wcag), [WCAG 2.1 AA checklist](https://wcag.dock.codes/documentation/wcag21aa), [Non-text contrast 1.4.11](https://testparty.ai/blog/wcag-1-4-11-non-text-contrast-2025-guide), [Designing focus indicators](https://www.craftcms.com/blog/designing-custom-focus-indicators).

- **Contrast (1.4.3, 1.4.11).** Ratios were computed with the WCAG relative-luminance formula. Ink on background is 15.79:1, muted text on background 5.25:1, brand on white 7.90:1, danger on white 6.57:1. The brand accent `#d9822b` is only 2.93:1 on white, so it is **never used for text**: pilot labels use `#8a4b0f` (6.79:1) on `#fbeedd`. The light line color `#e2dccf` fails the 3:1 non-text contrast requirement, so form-control borders use `#8f8778` (3.56:1).
- **Focus (2.4.7).** Every interactive element keeps shadcn's visible 3 px brand-colored focus ring, and links get a 2 px outline.
- **Labels and instructions (1.3.1, 3.3.2).** The `Field` component pairs every control with a `<label>`. Hints and errors are linked with `aria-describedby`, and invalid fields get `aria-invalid`. Optional fields are marked "(opsional)" rather than marking required fields with asterisks.
- **Error identification (3.3.1, 3.3.3).** Errors appear inline next to the field and say how to fix it. Long forms also get an error summary at the top that links to each field (PRD §12.7).
- **Use of color (1.4.1).** Statuses, calendar states and diffs pair color with an icon, text or strikethrough.
- **Status messages (4.1.3).** Notices use `role="status"`, and urgent ones such as dates just taken or payment declined use `role="alert"`. Loading skeletons use `aria-busy` with a screen-reader label.
- **Keyboard.** Radix provides keyboard support for dialogs, sheets, selects, tabs, radios and switches. Selectable cards are real `<label>`s around native inputs.
- **Other.** Touch targets are at least 40–44 px on mobile. `prefers-reduced-motion` is respected, `lang="id"` is set, and money uses tabular figures.

### UX writing
References: [NN/g Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/), [WFP design system: how to write UX copy](https://designsystem.wfp.org/how-tos/how-to-write-ux-copy), [Siemens iX: messages](https://ix.siemens.io/docs/guidelines/language/messaging/messages-overview), [Built In: 16 rules of UX writing](https://builtin.com/articles/effective-ux-writing).

- **Titles state the situation.** For example "Penawaran ini sudah kedaluwarsa" or "Tanggal ini baru saja diambil", not "Oops!" or "Error".
- **Body text gives context and the fix.** For example "Masa berlakunya habis Selasa, 17 Nov 2026. Minta Mal Cempaka Raya mengirim ulang jika Anda masih tertarik." Error copy names the problem, avoids blame words such as "invalid" or "salah", has no humor, and keeps the user's input (NN/g).
- **Buttons say exactly what happens, in 2–4 words starting with a verb.** For example "Terima penawaran ini", "Kirim ke 3 ruang", "Bayar Rp 47.385.000 (uji)", "Tolak dan beri tahu pengelola". The name of an action stays the same through the flow: "Batalkan pemesanan" leads to the confirmation "Batalkan pemesanan?". Cancel buttons in confirmations say what is kept, for example "Tetap pertahankan pemesanan".
- **Whether to show a CTA.** Informational notices have no button, for example the masking notice. A notice gets a button only when there is a real next step.
- **Tone.** Conversational and polite, using "Anda". No exclamation marks or slang. Specific numbers, dates and names are used in place of vague words such as "segera".
- **Pilot honesty.** Every money screen says the payment is a test, documents say they are not binding, and receipts say they are not tax invoices.

### Glossary (one term per concept)

| Concept (PRD) | UI term |
|---|---|
| Enquiry | **Permintaan** |
| Quote / version | **Penawaran** / **versi** |
| Backup quote | **Penawaran cadangan** |
| Tentative hold | **Tahanan tanggal** (verb: *tahan tanggal*) |
| Booking hold | Tanggal "ditahan untuk Anda" (shown as a consequence of acceptance) |
| Booking | **Pemesanan** |
| Confirmed / lapsed | **Terkonfirmasi** / **batal otomatis** |
| Organizer | **Penyelenggara** |
| Venue operator (organization) | **Pengelola** (the place itself: *tempat*) |
| Property / space | **Properti** / **ruang** |
| Shortlist | **Daftar pilihan** |
| Pilot agreement | **Perjanjian contoh (pilot)** |
| Deposit / balance | **Uang muka** / **pelunasan** |
| Spot-In organizer fee | **Biaya layanan Spot-In** |
| Add-ons | **Layanan tambahan** |
| Sandbox / test | **Uji** (for example *virtual account uji*); simulated money: **simulasi** |
| Required documents | **Dokumen wajib** |
| Event page / registration / pass | **Halaman acara** / **pendaftaran** / **kartu masuk** |
| Release (settlement) | **Pencairan** (simulasi) |
| Report a problem | **Laporkan masalah** |
| Roles Owner / Staff / Viewer / Member | **Pemilik** / **Staf** / **Pengamat** / **Anggota** |
| Decline (venue) / reject (admin) | **Tolak** |
| Cancel (booking) | **Batalkan** |
| Lost | **Tidak dilanjutkan** |

## Design decisions

- **Brand tokens are taken from the brief and nothing else.** Deep green carries all actions and positive states. Warm orange is reserved for one meaning, pilot mode: the persistent banner, the "Pilot demo – bukan acara sungguhan" label, the PILOT stamp and "waiting/held" statuses. It is never used decoratively. The page background is the warm off-white `#f7f5f0`, with white work surfaces.
- **Typeface: Plus Jakarta Sans,** self-hosted through `@fontsource-variable`. It was originally drawn for Jakarta's city identity, so it fits an Indonesian product. It is legible at small sizes and has tabular figures for Rupiah columns. One family is used throughout, and hierarchy comes from weight and size.
- **Pilot mode cannot be missed (FR-M38-01, FR-M28-17).** A non-dismissible banner appears on every booking-flow page. Every document preview (quote, agreement, receipt, statement, pass) carries a diagonal PILOT watermark and a PILOT stamp. Event pages, registration forms and passes carry the pilot-demo label.
- **No stock imagery.** Venue photos are flat architectural placeholders and the map is a stylised OSM-like canvas with attribution, so the mock-ups never pass off fake photos as real venues. The real build uses uploaded photos and Leaflet/MapLibre with OSM tiles (PRD §10).
- **No fake metrics or marketing sections.** Dashboard numbers come from the seed story (one enquiry → quote → booking loop). The gallery is a working index, not a landing page.
- **Mobile-first where the PRD says so.** Organizer, owner and attendee flows use a 390 px frame with sticky bottom action bars. Venue inbox, quote builder, comparison, workspace and admin screens use a laptop frame with a summary sidebar that stays visible while editing.
- **Privacy by design is visible.** The forms never ask for NIK, NPWP or bank data. The relevant forms say so, the event editor refuses sensitive questions, and contact details stay masked until confirmation (FR-M38-04, FR-M10-03).
- **Money stays visible at decision points.** Accepting a quote, paying and cancelling all show the exact Rupiah outcome before the confirming button, and the button repeats the amount where it matters.
- **Permissions are shown, not hidden silently.** When a role cannot act (Staff editing the threshold, Viewer replying, Member exporting or cancelling), the UI shows the reason and who can do it, as §12.7 requires.

## Project structure

```
docs/mockups/
  index.html, vite.config.ts, tsconfig.json, components.json
  src/
    App.tsx              gallery + viewer (device frame, state switcher)
    registry.ts          ScreenDef type and section list
    index.css            brand tokens mapped onto shadcn variables, watermark, reduced motion
    lib/data.ts          seed data and §11.2 amounts
    lib/portal.ts        lets dialogs/sheets render inside the device frame
    components/ui/       shadcn/ui components (generated by the shadcn CLI)
    components/kit.tsx   product pieces: PilotBanner, Field, Notice, Status, MoneyRow, DocPreview, ...
    screens/*.tsx        one file per flow group; each exports ScreenDef[]
```

To add a screen, export a `ScreenDef` from a file in `src/screens/` and add it to `src/screens/index.ts`. The gallery and the state switcher pick it up automatically.

**Changes to generated shadcn components** (recorded so they can be reapplied after `shadcn add --overwrite`):
- Dialog, Sheet and AlertDialog portal into the device frame, through `lib/portal.ts`.
- Viewport breakpoints (`sm:`, `md:`, `lg:`) are rewritten to container queries (`@xl:`, `@3xl:`, `@5xl:`), and the device frame is the `@container`. Phone mock-ups therefore always get the mobile layout, even on a wide monitor. A production app would keep normal viewport breakpoints.
- AlertDialog headers are left-aligned to match Dialog and Sheet.
- The screen-reader close label is translated to "Tutup".
- Inactive tab text uses the muted token (5.25:1) instead of `foreground/60`.
- Alert titles wrap instead of being clamped to one line, because Indonesian titles run long.

## Known gaps

- Mock-ups are static and state-driven. Forms do not validate live, and maps, calendars and QR codes are illustrations, not working widgets.
- The venue availability calendar management screen (blocking dates, recurring blocks) is shown only through the hold dialog and the space calendar, not as its own screen.
- Message reporting (FR-M10-08), saved-reply management, the help page and "Hubungi kami" (FR-M26-01/02), and the Admin reports queue for event pages (FR-M36-04) appear only as entry points or tabs, not as full screens.
- Copy is hard-coded in the components for review. The production build must move every string into the message catalog (FR-M25-05).
