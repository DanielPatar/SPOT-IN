# Spot-In — Product Requirements Document

| | |
|---|---|
| **Product** | Spot-In — web marketplace connecting event organizers with malls, venues and space owners, with public event pages and registration for booked events |
| **Version** | 1.2 (draft for review) |
| **Date** | 5 November 2026 |
| **Team / context** | Group4 — small student team; MVP is a course project graded on this PRD, the build and a live demo, followed by a small invite-only pilot |
| **Launch market** | Indonesia (IDR, Bahasa Indonesia) |
| **Status** | Draft — open questions in §15 |

### Change log

| Version | Date | Change |
|---|---|---|
| 1.2 | 5 Nov 2026 | Applied the 22 decisions of the critical review (`docs/PRD-review.md`; traceability in Appendix A). The MVP is now a **course pilot**: one venue-booking loop end to end, sandbox payments only, pilot mode on every document, email only, Bahasa Indonesia only, no sensitive identity or bank data, OpenStreetMap and PostgreSQL only, minimal back office. The events side is reduced to unlisted "pilot demo" pages with free RSVP and a QR pass for events booked on Spot-In. Also cut from the MVP under decision #1 (one demo loop): site visits, reviews, change requests, claims and disputes, security deposits, handover records, roadshows. All cut features stay in the Phase 2/3 backlog (§7.20) and keep their v1.1 requirement IDs; their detailed v1.1 wording is archived in `docs/archive/PRD-v1.1.md`. New: backup quotes on held dates, a business-day definition, release after the post-event window, pilot NFRs, a demo script as the acceptance standard. |
| 1.1 | 5 Nov 2026 | Added the public events side (listings, discovery, RSVP, check-in) and paid ticketing (Phase 2). |
| 1.0 | 30 Oct 2026 | Venue marketplace: request → quote → contract → escrowed payment → event → payout. |

---

## Table of contents

1. [Summary](#1-summary)
2. [Market research and feature inventory](#2-market-research-and-feature-inventory)
3. [Goals, non-goals and success measures](#3-goals-non-goals-and-success-measures)
4. [Users, organizations and roles](#4-users-organizations-and-roles)
5. [Scope and phasing](#5-scope-and-phasing)
6. [User flows (MVP)](#6-user-flows-mvp)
7. [Functional requirements](#7-functional-requirements)
8. [Non-functional requirements (pilot)](#8-non-functional-requirements-pilot)
9. [Data model](#9-data-model)
10. [Integrations](#10-integrations)
11. [Business rules: money, fees, tax and time](#11-business-rules-money-fees-tax-and-time)
12. [Edge cases and error states](#12-edge-cases-and-error-states)
13. [Acceptance criteria and demo script](#13-acceptance-criteria-and-demo-script)
14. [Release plan](#14-release-plan)
15. [Risks, assumptions and open questions](#15-risks-assumptions-and-open-questions)
16. [Appendix: research sources](#16-appendix-research-sources)
17. [Appendix A: review decision traceability](#appendix-a-review-decision-traceability)

---

## 1. Summary

### 1.1 Problem

Booking a mall atrium, an event hall or an outdoor space in Indonesia today runs on WhatsApp, email, PDFs of rate cards and phone calls.

- **Event organizers (EOs), brands and community organizers** have no single place to see what spaces exist, what they cost and whether they are free on a date. Quotes arrive slowly and in different formats, so they are hard to compare. After booking, the event is promoted and registered through separate tools (Instagram posts, Google Forms) that have no link to the booking.
- **Malls and venue owners** leave casual-leasing and event space empty because it isn't marketed online, and spend most of their time on low-quality enquiries, manual quoting and chasing payments.
- **Attendees** find event information scattered and often register through ad-hoc forms with no confirmation or entry pass.

### 1.2 Solution

Spot-In is a responsive web app with two sides in the MVP and a third added later:

- **Venues** list spaces with specs, photos, a map pin, rate cards and live availability, then answer enquiries and send structured quotes.
- **Organizers** search and compare spaces, send one enquiry to several venues, negotiate quotes, accept one, agree to the booking terms and pay a deposit and balance. Once confirmed, they can create an event page for the booked event and take free registrations with a QR pass.
- **Attendees** (MVP: only through a shared link) register for a booked event and receive a pass by email. Public event discovery and paid ticketing are Phase 2.

**Booking model:** request → quote → revise → accept → agree to terms → pay deposit → confirmed → pay balance → event → settlement. There is no instant booking.

**MVP context:** the MVP is a course project and a small invite-only pilot. Payments run in the payment provider's **test mode**; every booking is a **non-binding practice booking** labeled as such (pilot mode, §7.19). The full commercial product (real escrow, e-signature, tax documents, public discovery, ticketing) is described as Phase 2 and 3.

### 1.3 How Spot-In will make money (after the pilot)

1. Booking commission charged to the venue on each confirmed booking.
2. Organizer service fee added to the rental at checkout.
3. Promoted listings and events (P2).
4. Ticketing fee on paid tickets (P2).

In the MVP these fees are computed and shown in the sandbox ledger so the money model can be demonstrated, but no real money is charged (§11).

### 1.4 Glossary

| Term | Meaning |
|---|---|
| **Operator** | A venue organization (MVP: one property). |
| **Property** | A physical site — a mall, hall building or outdoor site. |
| **Space** | A bookable unit within a property (MVP: no child spaces). |
| **Event (project)** | The organizer's internal record of an event (dates, attendance, budget, proposal files) used to enquire and book. Not public. |
| **Enquiry** | One Event sent to one Space; creates its own thread. |
| **Quote** | A venue's priced offer for an enquiry; each sent revision is a new version. |
| **Backup quote** | A quote sent for dates currently held by another organizer; it can't be accepted until the hold is released (FR-M12-13). |
| **Tentative hold / booking hold** | A venue-placed temporary reservation for an enquiry / the reservation created automatically on quote acceptance. |
| **Booking** | The record created when a quote is accepted; **Confirmed** once terms are agreed and the deposit is paid. |
| **Pilot agreement** | The generated "Sample agreement (pilot)" PDF the parties click to accept; not legally binding (§7.19). |
| **Sandbox payment** | A payment made with the provider's test methods; no real money moves. |
| **Ledger** | Spot-In's internal record of amounts paid, held, released and refunded per booking. |
| **Event page** | The page for a booked event, unlisted in the MVP. |
| **Registration / pass** | A free sign-up to an event page / the QR admission for one attendee. |
| **Business day** | Monday–Friday excluding Indonesian national holidays and cuti bersama, in the property's time zone (§11.6). |
| **Pilot mode** | The set of rules that mark all MVP output as practice, collect only minimal data and limit access to invited users (§7.19). |

---

## 2. Market research and feature inventory

The research below is unchanged from v1.1. Section 2.2 replaces v1.1's long inventory tables with a grouped view of where each feature lands after the review.

### 2.1 Comparable products reviewed

**Venue and space booking**

| Product | Model | What it teaches Spot-In |
|---|---|---|
| **Peerspace** (US) | Hourly marketplace for unique spaces; instant book on eligible listings plus request-to-book; funds held until after the booking | Request-to-book with an authorization hold, a time-boxed host response window (requests expire after two business days and hurt the host's response rate), saved "boards" for shortlists, host phone revealed only after confirmation, split / installment payment options, platform-held funds paid out after the event |
| **Tagvenue** (UK/AU/SG) | Enquiry-based venue marketplace; free listing; separate venue CRM (Tagvenue Pro) | One enquiry to multiple venues, upfront price guidance (min spend, per-person, starting price) on listings, shareable shortlists for internal sign-off, quote amendment, manual payment tracking, "Supervenue" badge for responsive venues, calendar sync, a lead hub and AI-assisted enquiry handling for venue managers |
| **Hire Space** (UK) | Venue booking platform with commission per booking and a corporate concierge (Hire Space 360) | Commission-only model (no listing fee), streamlined quote → confirm, managed sourcing for corporate clients, standardized contracting and payments, later addition of instant booking with live availability |
| **Appear Here** (UK/US/FR) | Marketplace for short-term retail and pop-up space, bookable by the day, week or month | Curated/vetted listings, pop-up focus, concierge help, landlord–brand direct messaging, curated collections and destination guides, commission per booking |
| **Spacewise** (CH/US) | White-label specialty-leasing platform for mall owners (e.g., Regency Centers) | Branded booking portal per landlord, digital qualification of tenants, insurance, licensing, payments, renewals, user roles and team structures for leasing teams |
| **Yardi Retail Manager, Hyperin, Pickspace, Squarefeet** | Mall management / specialty leasing software | Short-term licence agreements for casual leasing, reservation diagrams and floor plans per property, specialty leasing + promotional media in one place, invoicing through to accounting |
| **Space Pick, Wisp, Spazious** | Floor-plan booking tools | Clickable floor plans with annotated areas to prevent double bookings, 3D/diagram layouts |
| **SpotQoe** (Indonesia) | Local online booking for meeting and event rooms | Evidence of local demand for online event-space booking; meeting-room oriented, not mall/atrium-focused — the gap Spot-In targets |

**Event discovery, registration and ticketing**

| Product | Model | What it teaches Spot-In |
|---|---|---|
| **Eventbrite** (global) | Self-service ticketing plus a consumer discovery app; fees per paid ticket, free events free | Paid, free and donation ticket types; ticket sections with their own capacity; hidden tickets unlocked by promo codes; early-bird and group tickets; organizer chooses to absorb or pass on fees; per-ticket check-in windows; organizer app with QR scanning, manual lookup and offline sync; embedded checkout; event ads; payouts before the event for some organizers |
| **Luma** (global) | Community event pages and calendars; free to use, paid tier removes platform fees | Clean event pages; registration questions; approval-required registration; capacity with waitlist; calendar invite sent on confirmation; public/private/member-only visibility; unlock codes; group registration; host-set tax rate on receipts; co-hosts; reminders by email/SMS/WhatsApp; event insights (traffic sources) |
| **Peatix / Meetup** (global, strong in Asia) | Group-centred community events with discovery | Organizer "groups" that attendees follow; followers are notified automatically of new events and before the event; recommendations to existing users; zero booking fees for attendees; payout after the event |
| **DICE** (UK/EU/US/IN) | App-first music ticketing and discovery | All-in upfront pricing; locked tickets whose QR only appears shortly before doors; waiting list for sold-out shows where returned tickets go back at face value; transfers only inside the platform; personalized recommendations |
| **Ticketmaster** (global) | Primary ticketing for large venues | Rotating encrypted barcodes tied to a fan account (screenshots fail); virtual queue with live position for on-sales; registration-based presales to filter demand; verified in-platform transfer and resale |
| **LOKÉT / Loket.com** (Indonesia) | Leading local self-service ticketing and event management | Local payment methods; e-tickets in-app; affiliate promotion and invitations; buyer protection; organizers can sell on their own sites |
| **GOERS** (Indonesia) | Ticket marketplace for events, attractions and activities, with organizer tools | Real-time settlement, onsite point-of-sale, an embeddable widget, digital promotions, "send ticket" to another person, contactless check-in to prevent over-capacity and fake tickets |
| **tiket.com "To Do"** (Indonesia) | OTA selling event and activity tickets | Events sold alongside travel; the platform acts as a sales agent; flexible-date vouchers |

**Indonesian infrastructure researched:** **Xendit xenPlatform** (sub-accounts, split rules, marketplace routing), **Privy / Mekari Sign / VIDA** (certified e-signature + Peruri e-meterai via API), **Coretax** (DJP's mandatory tax system since end-2025; e-Faktur submitted via H2H/API or a licensed PJAP), **PPh Final Pasal 4(2)** (10% on gross rent of land/buildings, withheld by corporate tenants), **UU PDP No. 27/2022 + PP 33/2026** (data protection; implementing regulation effective 16 January 2027), and **PBJT jasa kesenian dan hiburan** (regional entertainment tax under UU HKPD; capped at 10% for concerts and shows, set by each region — DKI Jakarta and Kota Bandung apply 10%; concert tickets are not subject to PPN, but merchandise is).

**Local ticketing practice observed:** big concerts sell tickets named to the buyer's NIK (KTP number), with limits such as one or a few tickets per NIK and per transaction, and check the ID at entry; e-tickets are often exchanged for wristbands at redemption points before the show, which causes long queues; popular on-sales ("war tiket") use virtual queues with hundreds of thousands of people.


### 2.2 Feature inventory and v1.2 placement

| Feature group | Seen in | MVP (course pilot) | Phase 2 | Phase 3 / Out |
|---|---|---|---|---|
| Space search, filters, map, availability | Peerspace, Tagvenue, Hire Space | Filters, date availability, map with pins, distance sort (PostgreSQL/PostGIS, OSM tiles) | Saved searches, SEO landing pages, interactive floor plans, 360° tours, separate search engine if needed | — |
| Listings | All | One level of spaces, specs, photos, rate card, house rules, required documents | Child spaces, floor-plan pins, setup/dismantle windows, shared-resource conflicts, bilingual content | — |
| Shortlists and comparison | Peerspace, Tagvenue | Named shortlists, view-only share link, quote comparison | Collaborators and comments | — |
| Enquiry → quote | Tagvenue, Hire Space, venue CRMs | Multi-venue enquiry, proposal files, response deadline, structured quotes, revisions with diff, one approval threshold, tentative and backup holds | Approval chains, site visits, saved-reply variables, AI drafting (P3) | Instant book (Out) |
| Messaging | All | Threads with attachments, text contact masking | Email-to-thread, attachment OCR masking | — |
| Contract | Joinways, Spacewise | Generated pilot agreement with click-to-accept | Certified e-signature, e-meterai, addenda, custom templates | — |
| Payments and escrow | Peerspace, Xendit xenPlatform | Sandbox deposit + balance, sandbox ledger, simulated release and refunds | Real escrow, payouts, invoices/VA for companies, chargebacks | BNPL (P3) |
| Tax | Indonesia-specific | PPN shown on quotes if venue is PKP; pilot receipts (not tax invoices) | Faktur Pajak via Coretax/PJAP, PPh 4(2) withholding, PBJT on tickets | — |
| Event operations | Venue practice | Required-document checklist with approve/request changes | Handover records, incident log, rundown builder, crew passes, claims, disputes | Embedded insurance (P3) |
| Changes and cancellations | Peerspace, Tagvenue | Cancellation by either side with policy-based sandbox refund | Change requests and addenda, force majeure flow | — |
| Reviews and badges | Peerspace, Tagvenue | — | Two-way reviews, responsiveness badges, attendee reviews | — |
| Teams and roles | Spacewise | Venue Owner/Staff/Viewer; organizer Owner/Member | Full v1.1 role matrices, groups, property scoping | White-label portals (P3) |
| Event pages and registration | Eventbrite, Luma, Peatix | Unlisted pilot-demo page for a booked event, free RSVP with capacity, QR pass by email, check-in from pass link or list | Public discovery, follows, waitlist, approval mode, guests, scanner app, announcements, analytics, moderation pipeline | — |
| Paid ticketing | Eventbrite, Loket, GOERS, DICE, Ticketmaster | — | Ticket types and tiers, promo codes, limits and named tickets, waiting room, rotating QR, transfers, refunds, payouts, PBJT | Face-value resale, door sales, lottery (P3); reserved seating, open resale, online events (Out) |
| Notifications | All | Email + in-app | WhatsApp templates, SMS OTP, web push, digests | — |
| Admin | — | One Admin role, approve/suspend, search, settings, audit log | Full internal roles, queues, CMS, act-as | — |
| Promotion and growth | Hire Space, Eventbrite Ads | — | Promoted listings and events, widgets, collections | Lead and vendor marketplaces, concierge (P3) |

---

## 3. Goals, non-goals and success measures

### 3.1 MVP (course pilot) goals

| ID | Goal |
|---|---|
| PG1 | A venue and an organizer complete enquiry → quote → revision → acceptance → pilot agreement → sandbox deposit → **Confirmed** → sandbox balance, without leaving Spot-In. |
| PG2 | An organizer sends one enquiry to several venues and compares the returned quotes side by side. |
| PG3 | A confirmed booking produces an unlisted event page where invited people register and receive a QR pass, and the organizer checks them in. |
| PG4 | At least one real venue sends a real quote through Spot-In during the pilot. |
| PG5 | No sensitive personal data (ID documents, NIK, NPWP, bank numbers, selfies) is stored, and every pilot user has accepted the pilot notice. |
| PG6 | The money model is demonstrable: fees, PPN, deposit/balance, hold, release and refund amounts reconcile to the Rupiah in the sandbox ledger. |

### 3.2 Post-course goals (from v1.1, not measured in the MVP)

| ID | Goal |
|---|---|
| G1 | An organizer goes from search to a signed, paid, confirmed booking entirely inside Spot-In with real money. |
| G2 | The venue's median time from enquiry to first quote is under 24 business hours. |
| G3 | Organizer funds are held in licensed escrow until the event is delivered; venues are guaranteed payment for confirmed bookings. |
| G4 | Compliance with certified e-signature, e-meterai, Faktur Pajak via Coretax, PPh 4(2), PBJT on tickets and UU PDP at full scale. |
| G5 | Support how malls work: multiple properties, team roles, approval chains, sub-divisible spaces, night setup windows, approval of public event content. |
| G6 | Verified venues in Jabodetabek, then Surabaya, Bandung, Bali, Medan. |
| G7 | Revenue from commission, organizer fee, promoted listings/events and ticketing fees. |
| G8 | A public guide to what's on at malls and venues. |
| G9 | One organizer workflow from booking a space to filling it, including paid tickets. |
| G10 | Fair ticketing: all-in prices, anti-scalping limits, guaranteed refunds on cancellation. |

### 3.3 Non-goals for the MVP

| ID | Non-goal | Why |
|---|---|---|
| NG-P1 | Real money, payouts, refunds or escrow | Requires licensed escrow (Q2), company documents and provider contracts the team can't obtain; sandbox demonstrates the flow (decision #2). |
| NG-P2 | Binding agreements | Pilot bookings are practice runs; the agreement template has no legal review (decision #12). |
| NG-P3 | Collecting ID documents, selfies, NIK, NPWP, deeds or bank account numbers | Pilot data rule (decision #5). |
| NG-P4 | Public event discovery, indexing by search engines, external-venue events | Practice bookings must not advertise events that may not happen (decision #13). |
| NG-P5 | WhatsApp, SMS and phone OTP | No WhatsApp Business or SMS access (decision #8). |
| NG-P6 | English and bilingual documents | One language, i18n-ready (decision #14). |
| NG-P7 | Paid ticketing | Phase 2 as decided in v1.1. |
| NG-P8 | Multi-property groups and full role matrices | One venue, small team (decision #4). |

The v1.1 product-level non-goals still apply to later phases: no instant booking of spaces, no media/ad-space booking, no permanent tenancy, no native apps (responsive web/PWA), IDR only, Spot-In is not an ERP, funds never on Spot-In's balance sheet, no PBJT filing or permit applications on behalf of organizers, no access-control hardware, no reserved seating, open resale, online events or paid memberships.

### 3.4 Success measures

**Course demo (MVP):**

| Measure | Target |
|---|---|
| Demo script scenarios (§13.1) | All 7 pass live without manual database edits |
| MVP acceptance criteria (§13.2) | 100% pass in the demo environment, each covered by a demo step or automated test |
| Sandbox ledger | Zero mismatches between ledger totals and quote/receipt totals across all demo and pilot bookings |
| Pilot | ≥ 1 real venue sends a real quote; ≥ 3 organizers send enquiries; ≥ 20 registrations on pilot event pages |
| Data | Zero records containing the fields blocked by NG-P3 (checked by a script before the demo) |

**Post-course business metrics** (GMV, net revenue, enquiry → quote ≥ 70%, quote → booking ≥ 25%, median first response ≤ 24 business hours, repeat organizers ≥ 30%, leakage ≤ 10%, disputes ≤ 2%, payment success ≥ 95%, event and ticketing metrics) remain as defined in v1.1 §3.3 and are not tracked in the MVP.

---

## 4. Users, organizations and roles

### 4.1 Personas

| Persona | Description | MVP jobs |
|---|---|---|
| **Rina — project manager at an EO** | Runs brand activations and exhibitions; books 5–30 venues a year; needs client sign-off | Find spaces, enquire to several, compare quotes, accept, pay (sandbox), publish the event page, check people in |
| **Sari — community / bazaar organizer** | Price-sensitive; runs bazaars and workshops | Find an affordable space, simple booking, free registrations |
| **Budi — venue staff (mall casual leasing or hall manager)** | Handles enquiries for one property | Answer enquiries quickly, quote from a rate card, track bookings, review the organizer's documents |
| **Pak Hendra — individual owner** | One hall or rooftop; does everything himself | Simple setup on a phone, reliable booking records |
| **Maya — attendee** | Gets an event link from an organizer | Register in a minute, get a pass by email, show it at the door |
| **Spot-In Admin (1–2 team members)** | Runs the pilot | Approve operators and spaces, suspend abuse, manage invites, settings and holidays, check the ledger |

Mall groups with many properties (Dewi in v1.1) and paid-ticket buyers are Phase 2 personas.

### 4.2 Account structure (MVP)

```
User (one login, email-verified)
 ├─ Membership in at most one Venue Operator and/or one Organizer Organization
 └─ As an attendee: Registrations → Passes (no organization needed)

Venue Operator (one Property)
 └─ Spaces (one level)

Organizer Organization (individual or company name only)
 └─ Events (projects) → Enquiries → Quotes → Bookings → Event page → Registrations → Passes
```

- A user may belong to one operator and one organizer organization at the same time (e.g., a hall owner who also runs events), switching with a context selector; they cannot enquire to their own operator's spaces.
- Individuals get an organization of one automatically.
- Only invited emails can create accounts during the pilot, except attendees registering through an event-page link (§7.19).

### 4.3 Roles and permissions (MVP)

**Venue roles**

| Permission | Owner | Staff | Viewer |
|---|---|---|---|
| Edit operator profile, invite/remove members, change roles | ✓ | | |
| Set the quote approval threshold and cancellation policy | ✓ | | |
| Create/edit property and spaces, pricing; submit for review; publish/unpublish | ✓ | ✓ | |
| Block dates, place/release tentative holds | ✓ | ✓ | |
| Respond to enquiries, message, decline | ✓ | ✓ | view |
| Draft and send quotes (below threshold) | ✓ | ✓ | |
| Approve quotes at or above threshold | ✓ | | |
| Review required documents | ✓ | ✓ | |
| Cancel a confirmed booking | ✓ | | |
| View bookings, sandbox ledger and dashboard | ✓ | ✓ | ✓ |

**Organizer roles**

| Permission | Owner | Member |
|---|---|---|
| Edit organization profile, invite/remove members | ✓ | |
| Search, shortlist, share shortlist links | ✓ | ✓ |
| Create events and enquiries, message venues | ✓ | ✓ |
| Accept quotes, accept pilot agreement, pay (sandbox) | ✓ | ✓ |
| Upload required documents | ✓ | ✓ |
| Cancel a booking | ✓ | |
| Create/edit event page, view registrations, check in | ✓ | ✓ |
| Export attendee list | ✓ | |

**Attendee:** register through an event-page link, view and cancel own registration and pass.

**Spot-In Admin:** single internal role with 2FA (§7.18).

All permissions are enforced server-side on every request. The full v1.1 role matrices (8 venue roles with property scoping, 6 organizer roles, check-in staff, 7 internal roles) move to Phase 2.

---

## 5. Scope and phasing

### 5.1 Phase overview

| Phase | Theme | Scope |
|---|---|---|
| **MVP — course pilot** | One working booking loop, demonstrated live and tried by a few invited users | Modules in §5.2, sandbox only, pilot mode on |
| **Phase 2 — real launch (Jabodetabek)** | Real money and compliance, full venue tooling, public events | Real escrow and payouts, certified e-signature and e-meterai, Faktur Pajak, PPh 4(2), claims and disputes, change requests, reviews, site visits, full roles and groups, WhatsApp, English, public discovery, events tooling, paid ticketing, promoted listings (backlog §7.20) |
| **Phase 3 — scale** | Differentiation | AI assistance, concierge, white-label portals, lead/vendor marketplaces, BNPL, insurance, public API, resale via waitlist, door sales, early payouts |

### 5.2 MVP modules

Module IDs are kept from v1.1 so requirements trace across versions. Modules not listed are Phase 2 or 3.

| Module | Name | Section | Change vs v1.1 |
|---|---|---|---|
| M1 | Accounts and authentication | §7.1 | Email only; no phone OTP |
| M2 | Organizations and roles | §7.2 | 3 venue roles, 2 organizer roles, one property per operator |
| M3 | Verification | §7.3 | Manual "verified by Spot-In" flag; no document upload |
| M4 | Properties and spaces | §7.4 | One level of spaces; map pin; no floor plans or setup windows |
| M5 | Pricing and rate cards | §7.5 | Unchanged core; no packages or discounts |
| M6 | Availability calendar and holds | §7.6 | Unchanged core; backup quotes added |
| M7, M8 | Search, shortlists and comparison | §7.7 | PostgreSQL only; no collaborators |
| M9 | Events and enquiries | §7.8 | No setup/dismantle windows, no roadshow |
| M10 | Messaging | §7.9 | Text-only masking with defined patterns |
| M12 | Quotes and approval | §7.10 | One threshold; backup quotes |
| M13 | Pilot agreement | §7.11 | Click-to-accept sample agreement instead of e-signature |
| M14 | Sandbox payments | §7.12 | Provider test mode |
| M15, M16 | Pilot documents, ledger and simulated settlement | §7.13 | Receipts not tax invoices; simulated release and refunds |
| M17 | Booking workspace and required documents | §7.14 | No handover, incident log or rundown |
| M18 | Cancellations | §7.15 | Cancellation only; change requests P2 |
| M28, M30, M31, M32, M36 | Event page, registration, passes, check-in, reports | §7.16 | Unlisted pages for booked events only |
| M21, M22 | Notifications and dashboards | §7.17 | Email + in-app; basic counts |
| M24, M25, M26 | Admin, localization, help | §7.18 | One Admin role; Bahasa Indonesia; help page + email |
| M38 | Pilot mode (new) | §7.19 | Watermarks, invite-only, consent, data rule |

---

## 6. User flows (MVP)

### 6.1 Pilot setup and venue onboarding

1. A Spot-In Admin adds Budi's email to the pilot invite list (§7.19) and sends the invitation.
2. Budi opens the link, creates an account with email + password (or Google), verifies his email and accepts the pilot notice and terms (who runs the pilot, what is stored, where it is hosted, the deletion date, that bookings are practice runs).
3. He chooses **I list spaces**, enters the operator's display name, legal/company name (text only), city and a contact phone (not verified).
4. He creates the property: name, type, address text, city/area, **pin on the map** (required), time zone (prefilled from the pin), operating hours, house rules, photos and required documents (e.g., "Final layout", "Liability insurance", due N days before the event).
5. He adds spaces with specs, photos, rate card, add-ons and the cancellation policy, and sets an optional approval threshold (e.g., quotes ≥ Rp 50.000.000 need the Owner).
6. He invites a colleague as **Staff**.
7. He submits the operator and spaces for review. The Admin checks them on a call or chat (no documents uploaded), sets **Verified by Spot-In**, and approves the spaces → they become searchable to pilot users.

Individual owner variant: same steps; no team.

### 6.2 Organizer search → enquiry

1. Rina (invited) searches "Jakarta Selatan · Hall · 12–14 Dec · 300 people · ≤ Rp 100 jt", filters "allows F&B sampling" and power ≥ 30 kVA, switches to map view.
2. She opens a space: photos, specs, map, rate card or "from" price, calendar showing Available/Unavailable, house rules, required documents, cancellation policy.
3. She saves three spaces to a shortlist and shares a view-only link with her client.
4. She clicks **Send enquiry**, creates the Event (name, type, category, dates and times, expected attendance, budget, description), attaches the proposal deck and selects the three spaces → three independent enquiry threads, each with its own response deadline (2 business days).

### 6.3 Venue reviews → quote → approval

1. Budi gets an email and an in-app notification; opens the enquiry; can **Request more info**, **Decline** (reason required) or **Create quote**.
2. Optionally places a **tentative hold** (default 5 days).
3. Builds the quote from the rate card: rental per day × days, add-ons (electricity, security, cleaning), service charge, PPN if the venue is PKP, organizer service fee (shown as Spot-In fee), payment schedule (deposit 50% due in 3 days, balance due 14 days before the event), validity 7 days, cancellation policy, special terms.
4. The total is above the threshold → **Pending approval** → the Owner approves (or returns it with a comment) → the quote is sent.

### 6.4 Revision, comparison and acceptance

1. Rina opens the quote: she can **Accept**, **Request revision** (general and per-line comments) or **Decline**.
2. Budi sends version 2; Rina sees a diff; only v2 can be accepted.
3. Rina compares the three venues' latest quotes side by side (total, per day, inclusions, deposit terms, cancellation summary, response time) and exports the table to PDF for her client.
4. She accepts Mall A's v2 → availability is re-checked atomically → a **booking hold** blocks the dates until the deposit deadline; other venues' enquiries in the same event get a prompt to mark them Lost.

### 6.5 Pilot agreement → deposit → confirmed

1. The **pilot agreement** PDF (titled "Sample agreement (pilot)", watermarked) is generated from the accepted quote, the event and both parties.
2. Rina accepts it (checkbox + typed full name); then Budi (Owner or Staff) accepts it. Acceptance records name, user, time and IP.
3. Rina pays the deposit with a sandbox method (test VA, test QRIS, test card). The ledger records the deposit as **held**.
4. When both acceptances and the deposit are in → booking **Confirmed**; dates show as booked; competing enquiries and backup quotes for overlapping dates are notified; organizer and venue contact phones become visible in the booking.
5. If the agreement or deposit misses its deadline → booking **Lapsed**, hold released, both notified, any sandbox payment refunded in the ledger.

### 6.6 Backup quote on held dates

1. Another organizer, Sari, enquires for the same dates while Rina's booking hold is active.
2. Budi sends Sari a quote; Spot-In marks it **Backup quote — dates currently on hold**, and Sari can't accept it yet.
3. If Rina's booking lapses, Sari and every other backup-quote holder are notified at once; Accept becomes available and the first acceptance wins; Sari's quote validity is extended to at least 2 business days after the release.
4. If Rina's booking is confirmed, Sari's backup quote expires with reason "Dates booked".

### 6.7 Pre-event documents and balance

1. The booking workspace shows the required-document checklist with due dates computed from the event start.
2. Rina uploads each document; Budi approves it or requests changes with a comment.
3. The balance invoice (a pilot receipt request) is issued **7 days before the balance due date** (by default 21 days before the event start), with reminders 3 days and 1 day before due. Rina pays in sandbox.
4. Seven days and three days before the event, the system warns both sides about missing mandatory documents or unpaid balance.

### 6.8 Event page → registration → pass

1. From the confirmed booking Rina clicks **Create event page**. The page is prefilled with the event title, dates, venue and map, and a capacity ceiling equal to the space's capacity for the chosen layout.
2. She adds a cover image, description, age note ("18+ only" in the pilot) and registration settings (capacity, closing time).
3. The page is **unlisted** and labeled **"Pilot demo – not a real event"**. Rina copies the link and shares it with invited testers.
4. Maya opens the link, enters her name and email, confirms she is 18 or older and accepts the pilot notice, then clicks the email link to verify → registration **Confirmed**, and a QR pass is emailed and shown in **My passes**.
5. When capacity is reached, the page shows "Registration full".

### 6.9 Event-day check-in

1. Rina (logged in) opens the attendee list for the session, or scans a pass's QR with her phone camera — the QR opens the pass URL.
2. For a logged-in organizer member, the pass page shows **Check in**; for anyone else, it shows only the pass.
3. The pass page and the list show "Checked in at 10:42 by Rina" if it was already used; check-in can be undone within 5 minutes.
4. A printable attendee list (name, registration time, status) is available as a fallback.

### 6.10 After the event: post-event window and simulated release

1. When the event's last day ends, a **72-hour post-event window** opens. During it, the venue or the organizer can use **Report a problem**, which places a hold on the booking's funds and alerts the Admin.
2. If no hold is open, the ledger schedules the simulated release at 10:00 (property time) on the first business day after the window ends. Example: event ends Sunday 22:00 → window ends Wednesday 22:00 → release Thursday 10:00.
3. At release, the ledger moves rental minus commission to "venue payable (simulated)" and records the organizer fee and commission as Spot-In revenue; a settlement statement is generated (watermarked).
4. An Admin resolves any reported problem manually and records the outcome; the release then runs.

### 6.11 Cancellation by the organizer

1. Rina (Owner) chooses **Cancel booking** and a reason.
2. The system shows the refund computed from the cancellation policy tier for today's date, what the venue keeps, and the Spot-In fee rule.
3. On confirmation, the booking is **Cancelled by organizer**, the sandbox refund is recorded, the dates are freed, the event page shows "Cancelled" and registrants are emailed.

### 6.12 Cancellation by the venue

1. Budi (Owner) cancels with a reason; the system warns that the organizer gets a full refund.
2. The booking is **Cancelled by venue**; the ledger records a full sandbox refund including the Spot-In fee; the event page shows "Cancelled" and registrants are emailed. (Venue penalties are off in the pilot.)

---

## 7. Functional requirements

Requirement IDs use `FR-<module>-<nn>` and keep their v1.1 numbers where a requirement survives (its wording may be simplified); new MVP requirements take the next free number. Every requirement in §7.1–7.19 is **MVP** and must have at least one acceptance criterion in §13.2 (decision #7). Phase 2/3 items are listed in §7.20.

### 7.1 M1 — Accounts and authentication

| ID | Requirement |
|---|---|
| FR-M1-01 | Sign up / log in with email + password or Google. Email magic-link login is offered as an alternative to a password. |
| FR-M1-02 | A verified email is required before sending an enquiry, sending a quote, accepting a quote, paying or registering for an event. |
| FR-M1-03 | 2FA (TOTP authenticator app) is required for Spot-In Admins and optional for everyone else. |
| FR-M1-04 | Password reset by email; list and revoke active sessions; automatic logout after 30 days of inactivity (configurable). |
| FR-M1-05 | Profile: name, photo, contact phone (optional, not verified, shown to the other party only after a booking is confirmed), notification preferences. |
| FR-M1-06 | On first login the user chooses **Find spaces**, **List spaces** or both; attendees who arrive through an event page skip this step. |
| FR-M1-07 | Context switcher when the user belongs to both a venue operator and an organizer organization; the current context is always visible. |
| FR-M1-08 | Account deletion: the user can request deletion in settings; it is blocked while the user is the only Owner of an organization with an active booking; on completion personal fields are erased and authored records show "Deleted user". |
| FR-M1-09 | Consent capture at sign-up: Spot-In pilot terms, privacy and pilot notice (FR-M38-03); stored with version and timestamp. No marketing opt-in in the pilot. |
| FR-M1-10 | Quick attendee account: registering for an event page creates an account from name + email, completed by clicking the emailed verification link; no password needed. |
| FR-M1-11 | Sign-up is limited to invited emails (FR-M38-02), except quick attendee accounts created through an event-page link. |

### 7.2 M2 — Organizations and roles

| ID | Requirement |
|---|---|
| FR-M2-01 | Create a venue operator (one property) or an organizer organization (individual or company). |
| FR-M2-02 | Profile: display name, legal/company name (free text), logo, city, contact email. No NPWP, NIB or address of record in the pilot. |
| FR-M2-03 | Invite members by email with a role; invites expire after 7 days; resend and revoke. |
| FR-M2-06 | Venue approval threshold (optional): quotes with a total at or above an amount set by the Owner need Owner approval before sending. |
| FR-M2-08 | At least one Owner must always exist; ownership can be transferred to another member. |
| FR-M2-09 | Removing a member requires choosing who takes over their open enquiries, quotes and bookings (default: an Owner). |
| FR-M2-10 | Organization audit log of membership, role and threshold changes and attendee-list exports. |
| FR-M2-14 | Roles and permissions as in §4.3, enforced server-side; a direct URL to a record of another organization returns a permission error without revealing whether the record exists. |

### 7.3 M3 — Verification

| ID | Requirement |
|---|---|
| FR-M3-02 | Verification queue for the Admin: operators and organizer organizations awaiting review, with notes and approve/reject (reason required). Target: reviewed within 2 business days; items waiting longer are included in the daily admin reminder (FR-M24-10). |
| FR-M3-03 | Spaces can't be published and quotes can't be sent until the operator is **Verified by Spot-In**. |
| FR-M3-08 | A "Verified by Spot-In" badge on verified operators' spaces. |
| FR-M3-09 | Verification is a manual check by the Admin (call or chat with the venue). No identity, company or right-to-rent documents are uploaded or stored; the Admin records only the date, method and outcome. |

### 7.4 M4 — Properties and spaces

| ID | Requirement |
|---|---|
| FR-M4-01 | Property fields: name, type (mall, hall/venue building, convention centre, outdoor site, other), address text, city and area (from a list), **map pin (required)**, time zone (WIB/WITA/WIT, prefilled from the pin and editable), operating hours, parking and transport notes, loading access notes, house rules, photos. |
| FR-M4-02 | Space types: atrium, booth/promo spot, pop-up unit, event hall/ballroom, function/meeting room, outdoor area, other. |
| FR-M4-03 | Space fields: name, type, level/zone (text), area (m²), ceiling height, capacity by layout (standing, theatre, classroom, banquet, booth count), power (kVA), indoor/outdoor/covered, Wi-Fi, accessibility notes, permitted activities (selling, F&B sampling, cooking/open flame, live music, vehicles), prohibited categories (text), min/max booking duration (days). |
| FR-M4-04 | Media: up to 15 photos per space (resized server-side, WebP), a cover photo, captions; one optional video link. |
| FR-M4-08 | Required documents per property: name, mandatory flag, due offset (days before event start). |
| FR-M4-09 | Up to 5 enquiry questions per space that the organizer must answer. |
| FR-M4-10 | Space status: Draft → In review → Published → Unpublished / Suspended. Changes to price or capacity of a published space go live immediately and don't affect sent quotes. |
| FR-M4-11 | Duplicate a space. |
| FR-M4-16 | One level of spaces only (no parent/child spaces) and no setup/dismantle windows in the MVP; a booking covers whole event days. |

### 7.5 M5 — Pricing and rate cards

| ID | Requirement |
|---|---|
| FR-M5-01 | Pricing unit per space: per hour, per half-day or per day; minimum booking length and optional minimum spend. |
| FR-M5-02 | Rate variations: weekday/weekend and date-range seasons (e.g., Lebaran, year-end) with custom date overrides. |
| FR-M5-04 | Add-on catalog per property: name, unit (per day, per kVA per day, per person, per item), price, taxable flag, mandatory/optional. |
| FR-M5-05 | Tax settings per operator: PKP status (yes/no), PPN rate and DPP rule from admin settings (§11.4), service charge %, prices entered tax-exclusive. |
| FR-M5-06 | Public price display: show the full rate card or a "from" price; a "from" price is always required. |
| FR-M5-07 | Quick estimate on the space page: for chosen dates and add-ons, show an indicative total labeled non-binding. |

### 7.6 M6 — Availability calendar and holds

| ID | Requirement |
|---|---|
| FR-M6-01 | Calendar per space (day granularity; hour granularity for hourly spaces) with states: Available, Tentative hold, Booking hold, Booked, Blocked, Closed. |
| FR-M6-02 | Organizers see only Available / Unavailable; holds show as "Limited availability – enquire". |
| FR-M6-03 | Venue can block dates with a private reason, including weekly recurring blocks. |
| FR-M6-04 | Tentative hold: venue places one hold per enquiry with an expiry (default 5 days, max 14); one hold per date range at a time; holder notified on placing, 24 h before expiry and on expiry. |
| FR-M6-05 | Booking hold: created on quote acceptance; blocks the dates exclusively until the agreement and deposit deadline. |
| FR-M6-06 | Booked: on confirmation; released on cancellation or lapse. |
| FR-M6-07 | Availability is re-validated atomically (in one database transaction with a row or range lock) when a hold is placed, a quote is accepted and a booking is confirmed; conflicts fail with a clear message (§12.1). |
| FR-M6-08 | Buffer time between bookings per space (default 0, configurable in hours); bookings that violate it can't be quoted. |

### 7.7 M7, M8 — Search, shortlists and comparison

| ID | Requirement |
|---|---|
| FR-M7-01 | Search (for logged-in pilot users) by city/area or distance from a point, space type, event type, dates, attendance, budget range, indoor/outdoor. |
| FR-M7-02 | Filters: power ≥ kVA, permitted activities, verified only. |
| FR-M7-03 | List view and map view (OpenStreetMap-based tiles, clustered pins); sort by relevance, indicative price, distance, newest. |
| FR-M7-04 | When dates are given, spaces unavailable on any of those dates are hidden (toggle "Show limited availability" includes held spaces). |
| FR-M7-06 | The property page lists all its published spaces. |
| FR-M7-10 | Typo-tolerant keyword search on space, property, city and area names using PostgreSQL trigram similarity and full-text search, plus a synonym table for common Indonesian abbreviations (e.g., "jaksel" → "Jakarta Selatan", "jakbar" → "Jakarta Barat"). |
| FR-M7-12 | Search runs entirely in PostgreSQL (with PostGIS for distance); availability is computed from calendar entries in the same query so results never show a booked space as available. |
| FR-M7-13 | "Near me" uses browser location only after the user allows it; otherwise the city filter is used. |
| FR-M8-01 | Save spaces to named shortlists. |
| FR-M8-02 | Share a shortlist by a view-only link (no login) showing spaces, notes and indicative prices; the link can be revoked. |
| FR-M8-04 | Send an enquiry to all or selected spaces of a shortlist. |
| FR-M8-05 | Quote comparison table for the latest quotes in one event: total, per day, inclusions, deposit %, payment deadlines, cancellation summary, venue response time; export to PDF (watermarked). |

### 7.8 M9 — Events and enquiries

| ID | Requirement |
|---|---|
| FR-M9-01 | Event (project) owned by an organizer organization: name, type, brand/client name, category, description, expected attendance, event dates and daily start/end times, budget range, required facilities, attachments. |
| FR-M9-02 | Proposal files: PDF/JPG/PNG, max 10 MB each, max 5 per event, virus-scanned; shared with each enquired venue. |
| FR-M9-03 | One send creates one independent enquiry per selected space (max 5 per send, max 10 open enquiries per event, max 20 new enquiries per organization per day). |
| FR-M9-04 | The enquiry form prefills from the event and asks the space's questions (FR-M4-09). |
| FR-M9-05 | Pre-submit warnings (not blocks): dates outside operating days, length outside min/max, attendance above capacity, required facilities missing. |
| FR-M9-06 | Enquiry statuses: Submitted → Viewed → Info requested ⇄ Responded → Quoted → Accepted / Declined / Expired / Withdrawn / Lost. |
| FR-M9-07 | Response deadline: the venue must reply (message, request info, quote or decline) within **2 business days** (§11.6); reminders 24 h and 4 h before the computed deadline; on expiry the enquiry becomes Expired, the organizer is notified and the venue's response rate is updated. |
| FR-M9-08 | Declining requires a reason (dates unavailable, capacity, proposal not suitable, other) shown to the organizer. |
| FR-M9-09 | Editing the event notifies all enquired venues and marks open quotes "Event changed – review"; such quotes can't be accepted until the venue re-sends or revises them. |
| FR-M9-10 | The organizer can withdraw an enquiry; accepting one venue's quote prompts the organizer to mark the event's other open enquiries as Lost (optional feedback). |
| FR-M9-11 | Venue internal notes on an enquiry (not visible to the organizer). |

### 7.9 M10 — Messaging

| ID | Requirement |
|---|---|
| FR-M10-01 | One thread per enquiry/booking between the organizer's and venue's members; new messages appear without reload (polling or websocket); thread-level read status. |
| FR-M10-02 | Attachments: PDF, JPG, PNG, DOCX, XLSX; max 10 MB each; virus-scanned; image preview. |
| FR-M10-03 | Contact masking until a booking is confirmed, in **message text only**: email addresses; Indonesian phone numbers (prefix +62, 62 or 08, 9–13 digits, allowing spaces, dots and dashes); wa.me and api.whatsapp.com links; any run of 10 or more digits. Amounts in Rupiah ("Rp …"), areas ("… m²") and dates are not masked. Masked parts show as "[kontak disembunyikan]"; the sender sees a notice. Attachments are not scanned; before confirmation the upload dialog says "Jangan bagikan detail kontak di dalam file." |
| FR-M10-04 | Venue saved replies (plain text, no variables). |
| FR-M10-07 | Inbox with filters: unreplied, awaiting me, by space. |
| FR-M10-08 | Report a message (sent to the Admin). |
| FR-M10-09 | Messages can be edited for 10 minutes; deletion is soft (kept for the Admin). |

### 7.10 M12 — Quotes and approval

| ID | Requirement |
|---|---|
| FR-M12-01 | Quote builder prefilled from the rate card for the enquiry's dates: editable line items (rental, add-ons, custom items), quantity × unit price, per-line discount, service charge, PPN (if PKP), Spot-In organizer fee; totals computed per §11. |
| FR-M12-02 | Payment schedule: deposit % (minimum 20%, default 50%) due N days after acceptance (1–7, default 3); balance due N days before the event start (default 14, minimum 3); or one full payment. If acceptance falls inside the balance window, the full amount is due at acceptance. |
| FR-M12-03 | Terms: validity (default 7 days), cancellation policy (from the operator's policies), inclusions/exclusions, special terms (free text). |
| FR-M12-04 | Quote templates per space (saved line items). |
| FR-M12-05 | Approval: a quote at or above the operator's threshold goes Draft → Pending approval → Approved → Sent; the Owner can approve, edit (creating a new draft) or return it with a comment. |
| FR-M12-06 | Organizer actions: Accept, Request revision (general and per-line comments), Decline (reason). |
| FR-M12-07 | Each sent revision is a new read-only version; the organizer sees a diff from the previous version; only the latest version can be accepted. |
| FR-M12-08 | At validity end the quote expires; the venue can re-issue. |
| FR-M12-09 | Quote PDF download with the venue's logo, Spot-In reference and the pilot watermark. |
| FR-M12-10 | Accepting a quote requires a verified email and acceptance of the Spot-In pilot booking terms. |
| FR-M12-11 | Acceptance re-validates availability atomically (FR-M6-07); on conflict, acceptance fails and both parties are told. |
| FR-M12-13 | **Backup quote:** a quote whose dates overlap another organizer's tentative or booking hold is sent as a backup quote labeled "Tanggal sedang ditahan" ("Dates currently on hold"); Accept is disabled while the hold exists. When the hold is released or lapses, every backup-quote holder for those dates is notified at the same time, Accept is enabled, the first acceptance wins atomically, and each backup quote's validity is extended to at least 2 business days after the release. When the hold becomes a confirmed booking, backup quotes expire with reason "Tanggal sudah dipesan" ("Dates booked"). A quote can't be sent at all for dates that are already **Booked** or **Blocked**. |

### 7.11 M13 — Pilot agreement

| ID | Requirement |
|---|---|
| FR-M13-02 | On acceptance, generate the agreement PDF from the accepted quote version, the event, both parties, the payment schedule, the cancellation policy, house rules and required documents. Generated within 60 seconds. |
| FR-M13-05 | Agreement statuses: Generated → Accepted by organizer → Accepted by both / Voided (on lapse or cancellation). |
| FR-M13-07 | The PDF is stored read-only with a SHA-256 hash; both parties can download it; the acceptance record (user, typed name, time, IP) is shown on the last page. |
| FR-M13-09 | Click-to-accept: the organizer accepts first, then the venue (Owner or Staff), each by ticking "Saya telah membaca dan menyetujui" and typing their full name. The acceptance deadline is the deposit deadline. |
| FR-M13-10 | The agreement is titled "Sample agreement (pilot)", carries the pilot watermark on every page and states that it is not a binding contract (FR-M38-01). No e-signature, identity check or e-meterai in the MVP. |

### 7.12 M14 — Sandbox payments

| ID | Requirement |
|---|---|
| FR-M14-01 | Payment methods shown are the provider's **test-mode** methods: test virtual account, test QRIS, test e-wallet and test card. |
| FR-M14-02 | The payment schedule follows the accepted quote: deposit request on acceptance; balance request issued 7 days before the balance due date (FR-M15-09). |
| FR-M14-03 | Every payment is recorded in the ledger as **held** against the booking (FR-M16-07). |
| FR-M14-05 | Payment reminders 3 days and 1 day before each due date and on the due date. |
| FR-M14-06 | Late payment: a missed deposit lapses the booking (§6.5). A missed balance lets the venue Owner either extend once (up to 3 days) or cancel under the organizer-cancellation policy; both sides are notified. |
| FR-M14-08 | Payment status and receipts visible to organizer members; receipts emailed. |
| FR-M14-09 | Refunds are recorded in the ledger and shown as "Refund (simulated)"; no money is sent. |
| FR-M14-12 | All payment calls go through an internal adapter so a real provider integration (Phase 2) replaces only the adapter. |
| FR-M14-13 | Only test-mode API keys are accepted; the server refuses to start with live keys while pilot mode is on (FR-M38-07). If test-mode access isn't available, the adapter uses a built-in simulator with the same states (pending, paid, expired, failed). |

### 7.13 M15, M16 — Pilot documents, ledger and simulated settlement

| ID | Requirement |
|---|---|
| FR-M15-01 | Each payment has a pilot receipt showing the venue's rental lines (with PPN if PKP) and a separate Spot-In fee line. Receipts are titled "Pilot receipt – not a tax invoice". |
| FR-M15-02 | Receipt numbers are sequential per issuer with a `PILOT-` prefix; a cancelled receipt gets a credit note, never deletion. |
| FR-M15-09 | Balance request timing: issued 7 days before the balance due date (by default 21 days before the event start); if acceptance happens less than 7 days before the balance due date, it is issued immediately. |
| FR-M15-07 | Per-booking statement (payments, refunds, fees, PPN, simulated release) downloadable as CSV and watermarked PDF. |
| FR-M16-01 | Release rule: rental funds are released (simulated) at 10:00 property time on the first business day after the post-event window ends, if no reported problem is open (§6.10). |
| FR-M16-07 | Double-entry ledger per booking with accounts: organizer paid, held, venue payable (simulated), Spot-In commission, Spot-In organizer fee, PPN collected, refunds. Entries are append-only; every balance reconciles to the quote and receipts to the Rupiah. |
| FR-M16-08 | Post-event window: 72 hours from the end of the event's last day. During it, either party can **Report a problem** (description + optional photos), which places a hold on release and alerts the Admin; the Admin records the outcome (release as is, or record a manual adjustment with reason) and closes the hold. |
| FR-M16-09 | Simulated settlement statement per booking (watermarked) when release runs. |

### 7.14 M17 — Booking workspace and required documents

| ID | Requirement |
|---|---|
| FR-M17-01 | Each booking has a workspace: summary, dates, contacts (shown after confirmation), payment schedule and status, agreement, document checklist, event page link and registration count, message thread, timeline of all actions. |
| FR-M17-02 | The document checklist is created from the property's required documents with due dates computed from the event start. |
| FR-M17-03 | Each item: upload (versions kept, PDF/JPG/PNG, 10 MB), status (Not started, Submitted, Changes requested, Approved, Waived), reviewer comment. |
| FR-M17-04 | Warnings by email and in-app at 7 and 3 days before the event for missing mandatory documents or unpaid balance; the venue can mark the booking "At risk". |

### 7.15 M18 — Cancellations

| ID | Requirement |
|---|---|
| FR-M18-03 | Cancellation policies: three standard policies (Flexible, Moderate, Strict) defined in admin settings as tiers of days-before-event → % of rental refundable; the venue picks one per space. No custom policies in the MVP. |
| FR-M18-04 | Organizer cancellation shows the refund for today's tier and what the venue keeps before confirmation; the executed (simulated) refund equals the amount shown. |
| FR-M18-05 | Spot-In organizer fee: refunded if the organizer cancels within 24 hours of confirmation and at least 14 days before the event; otherwise kept; always refunded when the venue cancels. |
| FR-M18-06 | Venue cancellation (Owner only, reason required): full simulated refund to the organizer including the Spot-In fee. Venue penalties and ranking effects are off in the pilot. |
| FR-M18-08 | An organizer no-show is treated as cancellation on the event day. |
| FR-M18-10 | On any cancellation the event page shows "Dibatalkan" (Cancelled), registration closes, passes are voided and registrants are emailed. |

### 7.16 M28, M30, M31, M32, M36 — Event page, registration, passes, check-in and reports

| ID | Requirement |
|---|---|
| FR-M28-01 | An event page belongs to one Event with a **Confirmed** booking of the same organizer organization. Fields: title, summary (≤ 160 characters), description, cover image (required), category, age note, house rules (from the property), organizer display name. |
| FR-M28-02 | Sessions: one per booked event day, created automatically with that day's start and end times; times shown in the property's time zone. |
| FR-M28-03 | Venue, address and map come from the booking and can't be edited on the page. External venues aren't allowed in the MVP. |
| FR-M28-04 | Capacity is required per session and can't exceed the space's capacity for the chosen layout. |
| FR-M28-05 | Visibility is **unlisted only**: reachable by its link, marked `noindex, nofollow`, excluded from sitemaps, search and any list of events, and with no structured data. |
| FR-M28-07 | Event page statuses: Draft → Live → Registration closed → Ended; or Cancelled (booking cancelled) or Removed (Admin). |
| FR-M28-09 | Changing a session's time or the description after registrations exist asks for confirmation ("N orang akan diberi tahu") and emails registrants with what changed. |
| FR-M28-13 | The page shows title, cover, dates and times with time-zone label, venue with map, organizer name, spots left, status, the registration form, a "Bagikan" (share) button with copy-link and a WhatsApp share link (wa.me, no API), and a "Laporkan" (report) link. |
| FR-M28-17 | Every event page, registration form and pass shows "Pilot demo – bukan acara sungguhan" ("Pilot demo – not a real event"). |
| FR-M30-01 | Registering creates (or uses) an account (FR-M1-10) and one registration with one pass; one registration per email per session. |
| FR-M30-02 | Registration form: name, email, up to 3 custom questions (short text, single choice, yes/no). Questions can't ask for ID numbers, health, religion or similar sensitive data; the form shows a fixed note to that effect for organizers. |
| FR-M30-04 | Capacity is enforced atomically per session; a registration that would exceed it fails with "Pendaftaran penuh". |
| FR-M30-07 | The attendee can cancel until the session starts; capacity is released. |
| FR-M30-08 | Registration closes at a set time, when full, or manually; the organizer can reopen if capacity remains. |
| FR-M30-09 | Attendees must confirm they are 18 or older; under-18 registration is not possible in the pilot (FR-M38-09). |
| FR-M30-10 | Abuse limits: max 10 registrations per IP per hour per event page; email verification required before the pass is issued. |
| FR-M30-11 | Organizer attendee list: search, status filter, cancel a registration with a message; export CSV (Owner only; logged in the organization audit log). |
| FR-M31-01 | Each confirmed registration has a pass emailed to the attendee and shown in **My passes**. |
| FR-M31-02 | The QR encodes the pass URL with a random, unguessable token (≥ 128 bits); the pass page shows nothing beyond the attendee's first name and the event to people who aren't logged in as the holder or an organizer member. |
| FR-M31-03 | Pass content: event title, session date and time with time-zone label, venue and map link, attendee name, pass number, the pilot label. |
| FR-M31-07 | Pass statuses: Issued → Checked in; or Cancelled / Voided. |
| FR-M32-01 | Organizer members check attendees in from the attendee list (search by name or email) or by opening a pass URL (scanning the QR with the phone camera) while logged in. |
| FR-M32-03 | An already-used pass shows "Sudah check-in pukul {time} oleh {member}"; a cancelled or voided pass shows its status; a pass for another session shows the correct session. |
| FR-M32-08 | A check-in can be undone within 5 minutes; the undo is logged. |
| FR-M32-12 | A printable attendee list per session (name, status, blank tick column) is available as a fallback. |
| FR-M36-04 | Anyone can report an event page or a space (reason + text); reports go to the Admin queue; the Admin can dismiss, remove the page (registrants emailed) or suspend the organization. |

### 7.17 M21, M22 — Notifications and dashboards

| ID | Requirement |
|---|---|
| FR-M21-01 | Channels: in-app (bell + list) and email. |
| FR-M21-02 | Notification catalog with defaults (list below); users can turn off non-transactional emails; transactional ones (payment due, agreement to accept, booking confirmed/lapsed/cancelled, pass issued, event changed/cancelled) can't be turned off. |
| FR-M21-05 | Every notification links to its record and respects permissions. |
| FR-M21-07 | Email sending uses a domain with SPF, DKIM and DMARC set; bounces are recorded and shown on the user's profile to the Admin; the sign-up and registration screens tell users to check their spam folder. |
| FR-M22-01 | Venue pipeline (list and kanban): New, In discussion, Quoted, Pending approval, Accepted (awaiting agreement/deposit), Confirmed, Lost/Declined; overdue-reply badges. |
| FR-M22-02 | Venue "This week": upcoming events, documents to review, balances due. |
| FR-M22-03 | Venue counts for a chosen period: enquiries, quotes, bookings, conversion, median first-response time (business hours), simulated revenue; CSV export. |
| FR-M22-06 | Organizer events dashboard: each event with enquiries, quotes, booking status, next action, registrations vs capacity. |

Notification events (MVP): new enquiry; enquiry deadline approaching/expired; info requested; message received; quote sent/revised/expiring/accepted/declined; backup quote now acceptable/expired; approval needed; hold placed/expiring/expired; agreement ready/accepted; payment due/received/failed; booking confirmed/lapsed/cancelled; document submitted/approved/changes requested; readiness warnings; problem reported/resolved; simulated release done; verification approved/rejected; space approved/rejected; registration confirmed/cancelled; pass issued; event changed/cancelled/removed.

### 7.18 M24, M25, M26 — Admin, localization and help

| ID | Requirement |
|---|---|
| FR-M24-01 | Admin queues: verification (operators and organizer organizations), space review, reports, reported problems (post-event holds). |
| FR-M24-02 | Search users, organizations, spaces, enquiries, bookings, event pages and passes by ID, name or email. |
| FR-M24-03 | Settings: fee rates (commission, organizer fee and caps), response deadline, hold durations, minimum deposit, standard cancellation policies, PPN rate and DPP rule, post-event window length, invite list, pilot deletion date. Changes apply only to records created afterwards. |
| FR-M24-04 | Actions: approve/reject (reason), suspend/unsuspend users, organizations, spaces and event pages; extend a deadline once (reason); void a pass; resolve a reported problem. |
| FR-M24-05 | Sandbox ledger view per booking and totals across bookings, with a reconciliation check that flags any booking whose ledger doesn't match its quote and receipts. |
| FR-M24-08 | Append-only admin audit log (actor, action, record, before/after, time). |
| FR-M24-10 | A daily email to all Admins lists items waiting for review longer than 2 business days. |
| FR-M24-11 | Holiday calendar: national holidays and cuti bersama per year (seeded from the official joint decree), editable by Admins; used by every business-day calculation. |
| FR-M24-12 | One internal role, **Spot-In Admin**, with 2FA required. |
| FR-M25-01 | The UI, emails and documents are in Bahasa Indonesia. |
| FR-M25-02 | IDR formatted as "Rp 25.000.000"; dates as "12 Des 2026"; all event times in the property's time zone with WIB/WITA/WIT label. |
| FR-M25-05 | All user-facing strings live in a message catalog; the build fails on hard-coded UI strings (lint rule), so English can be added in Phase 2 without code changes. |
| FR-M26-01 | Help page with FAQs (how booking works, what pilot mode means, how to cancel, how passes work). |
| FR-M26-02 | "Hubungi kami" form from any booking, enquiry or event page that emails the Admins with the record linked; target reply within 1 business day (best effort). |

### 7.19 M38 — Pilot mode

| ID | Requirement |
|---|---|
| FR-M38-01 | A persistent banner "Mode pilot – pemesanan latihan, tidak mengikat, tanpa pembayaran nyata" on every page of a booking flow, and a diagonal "PILOT" watermark on every generated PDF (quotes, comparison, agreement, receipts, statements, passes). No document can be generated without it. |
| FR-M38-02 | Invite-only access: only emails on the Admin's invite list can sign up as venue or organizer users; attendees can register only through an event-page link. |
| FR-M38-03 | Pilot notice accepted at sign-up and at registration: who runs the pilot (Group4), its purpose, the data collected, **the hosting provider and country where data is stored**, that bookings are practice runs with no real payment, the deletion date, and a contact email. Acceptance is recorded per user with the notice version. |
| FR-M38-04 | Data rule: Spot-In has no field for, and must not collect, ID documents or photos of them, selfies, NIK, NPWP, NIB, deeds, bank account or card numbers. Phones are optional contact fields only. A pre-demo script scans the database for the blocked field types and 16-digit NIK-like or card-like numbers and reports any match. |
| FR-M38-05 | Data lifecycle: every user can download their data (JSON) and delete their account in settings; on the pilot deletion date the Admin runs a documented job that deletes or anonymizes all pilot users' personal data and files. |
| FR-M38-06 | Production database and file storage access is limited to named team members; each access is logged; seed and test data never mix with pilot users' data (separate environments). |
| FR-M38-07 | Payments use test mode only; starting the server with live payment keys while pilot mode is on fails (FR-M14-13). |
| FR-M38-08 | Venue penalties, ranking effects and any money-related consequences outside the ledger are off. |
| FR-M38-09 | Pilot users must be 18 or older (confirmed at sign-up and registration). |
| FR-M38-10 | **Demo clock:** in the demo environment only, an Admin can move the application clock forward (e.g., "+3 days") so deadlines, holds, reminders, the post-event window and release can be shown live; all scheduled jobs use the application clock. The control doesn't exist in the pilot environment. |

### 7.20 Phase 2 and Phase 3 backlog

Detailed v1.1 wording of these requirements is in `docs/archive/PRD-v1.1.md` (same IDs). Each item must be re-reviewed before it enters a build plan.

| Area | Items | Phase | v1.1 reference |
|---|---|---|---|
| Real money and escrow | Licensed escrow via xenPlatform, real payouts, bank-account verification, invoices with closed VA for companies, chargebacks, trusted-venue early release | P2 | M14, M16, §11.3, FR-M3-04 (v1.1) |
| Contracts | Certified e-signature with identity check, e-meterai, addenda, custom templates (after legal review, Q5) | P2 | M13 |
| Tax | Faktur Pajak via Coretax/PJAP, PPh 4(2) withholding and slips, venue faktur upload/generation | P2 | M15, §11.4 |
| Verification | Document-based KYB/KYC with right-to-rent proof, organizer tiers | P2 | M3 |
| Claims and disputes | Security deposits, claims against them, organizer disputes, appeals; release after the later of the claim and dispute windows (decision #19) | P2 | M19, FR-M16-05 (v1.1) |
| Changes and force majeure | Change requests with amended quotes and addenda, force majeure flow, custom cancellation policies | P2 | M18 |
| Venue tooling | Child spaces, floor-plan pins and interactive plans, setup/dismantle windows, shared-resource conflicts, site visits, approval chains, groups and property scoping, full role matrices, portfolio calendar | P2 | M2, M4, M6, M11 |
| Reviews and quality | Two-way reviews, responsiveness badges, ranking penalties | P2 | M20, M27 |
| Event operations | Handover records, incident log, rundown builder, crew/vehicle passes | P2 | M17 |
| Channels and language | WhatsApp templates, SMS/phone OTP, web push, digests, quiet hours, English and bilingual documents, email-to-thread | P2 | M1, M10, M21, M25 |
| Search | Saved searches, SEO landing pages, collections, separate search engine only if PostgreSQL misses targets, address autocomplete | P2 | M7 |
| Public events | Public visibility and discovery, follows, saved events, external-venue events, venue approval of listings (**never auto-approved**, decision #20), waitlist, approval mode, guests, guardian consent, offline scanner and check-in staff, announcements, analytics, moderation pipeline | P2 | M28–M33, M36 |
| Paid ticketing | Ticket types and tiers, promo codes, all-in pricing, purchase limits and named tickets (with DPIA, Q13), waiting room, rotating QR, transfers, wristband redemption, refunds, organizer payouts, PBJT | P2 | M34, M35, M37 |
| Growth | Promoted listings and events, booking and ticket widgets, recommendations | P2 | M23, M27 |
| Scale | AI assistance, concierge, white-label portals, lead and vendor marketplaces, BNPL, insurance, public API, face-value resale, door sales, lottery presales, early payouts, merchandise, ticket revenue toward venue balance | P3 | M27, M34, M37 |

---

## 8. Non-functional requirements (pilot)

| Area | Requirement |
|---|---|
| Platform | Responsive web, mobile-first for organizers, owners and attendees; dashboards usable on a laptop. Last 2 versions of Chrome, Safari, Edge and Firefox, and Android Chrome. |
| Performance | With the demo seed (5,000 spaces, 50,000 calendar entries): search p95 ≤ 500 ms; space and event pages LCP ≤ 2.5 s on a simulated 4G profile; dashboard actions p95 ≤ 1 s; registration submit p95 ≤ 1.5 s. |
| Availability | Best effort; the app must be up and tested on the demo day. A health-check page and uptime ping alert the team. |
| Hosting | Free or student tiers. The provider and storage country are named in the pilot notice and accepted by every user (cross-border transfer consent, FR-M38-03). Separate environments for development/demo seed data and pilot users. |
| Backups | Daily database backup kept 7 days; one restore tested before the pilot starts and recorded. |
| Security | OWASP Top 10 self-check documented before the pilot; HTTPS everywhere; passwords hashed with a modern algorithm (bcrypt/argon2); server-side permission checks on every request; rate limits on login, sign-up, enquiry and registration; uploads virus-scanned and served through signed, expiring URLs; dependency and secret scanning in CI; Admin 2FA. A penetration test is a Phase 2 launch requirement. |
| Privacy (UU PDP) | Data minimization per the data rule (FR-M38-04); consent records (FR-M1-09, FR-M38-03); access/export and deletion in-app (FR-M38-05); pilot deletion date; access to production data limited and logged (FR-M38-06); a written one-page breach procedure (who decides, how users are told within 3 × 24 hours). |
| Accessibility | WCAG 2.1 AA for the booking flow and the event page/registration/pass. |
| Localization | Bahasa Indonesia complete; strings externalized (FR-M25-05). |
| Auditability | Every state change on enquiries, quotes, agreements, payments, ledger, bookings, event pages, registrations and passes, and every Admin action, is logged with actor, time and before/after. |
| Observability | Error tracking and structured logs; alerts on payment-adapter errors, ledger reconciliation failures and email bounces. |
| Legal | Pilot terms and notice reviewed by the course supervisor; whether a closed pilot needs PSE Lingkup Privat registration is recorded in §15 (Q19). Phase 2 launch requirements (Indonesian data residency, 99.9% availability, PITR with RPO ≤ 15 min / RTO ≤ 4 h, penetration test, PSE registration, DPIA and DPO) are kept in v1.1 §8. |

---

## 9. Data model

### 9.1 Core entities (MVP)

| Entity | Key fields | Notes |
|---|---|---|
| User | id, name, email, email_verified_at, phone (optional, unverified), photo, 2FA secret (Admins), is_18_plus_confirmed, status, created_at | Also the attendee |
| ConsentRecord | user_id, document (terms \| privacy \| pilot_notice), version, accepted_at, ip | |
| PilotInvite | email, invited_by, role_hint (venue \| organizer), status, expires_at | Invite-only access |
| Organization | id, kind (venue_operator \| organizer), display_name, legal_name (text), logo, city, contact_email, verified_by_spotin_at, verification_note, status | One property per operator |
| Membership | user_id, org_id, role (owner \| staff \| viewer \| member) | |
| Property | id, operator_id, name, type, address_text, city, area, geo (point), timezone, hours, rules, photos[], required_docs[] (name, mandatory, due_offset_days), status | |
| Space | id, property_id, name, type, level_text, specs (area, height, capacities{layout:n}, power_kva…), permitted_activities[], media[], cancellation_policy_id, buffer_hours, status | No parent spaces |
| RateCard | space_id, unit, base_price, min_units, min_spend, weekday/weekend, seasons[] | |
| AddOn | property_id, name, unit, price, taxable, mandatory | |
| TaxSettings | operator_id, is_pkp, service_charge_pct, ppn_mode (from admin) | |
| CalendarEntry | space_id, start, end, kind (block \| tentative_hold \| booking_hold \| booked), ref (enquiry/booking), expires_at | Exclusion constraint on overlapping ranges per space |
| Shortlist / ShortlistItem / ShareLink | owner org, name, items (space, note), token, revoked_at | |
| Event | id, organizer_org_id, name, type, brand, category, description, attendance, days[] (date, start, end), budget, files[] | Project |
| Enquiry | id, event_id, space_id, status, answers{}, response_deadline_at, assigned_member, internal_notes, lost_reason | |
| Thread / Message | thread per enquiry→booking; body, masked_body, attachments[], sender, edited_at, deleted_at | |
| Quote | id, enquiry_id, version, status, is_backup, blocking_hold_id, lines[], totals{rental, add_ons, service_charge, ppn, organizer_fee, total}, payment_schedule, cancellation_policy_snapshot, validity_until, special_terms, approval (by, at, comment) | Read-only once sent |
| Booking | id, quote_id, event_id, space_id, days[], status, deposit_due_at, balance_due_at, agreement_id, post_event_window_ends_at, release_scheduled_at, hold_open | |
| Agreement | booking_id, pdf_url, sha256, acceptances[] (user, typed_name, at, ip), status | Pilot agreement |
| PaymentRequest / Payment | booking_id, kind (deposit \| balance \| full), amount, due_at, provider_ref (test), status, paid_at | Sandbox |
| Receipt / CreditNote | number (`PILOT-…`), issuer (venue \| spot_in), lines, amounts, booking_id, payment_id | Not tax invoices |
| LedgerEntry | booking_id, account, debit, credit, amount, ref, created_at | Append-only |
| Settlement | booking_id, venue_payable, commission, organizer_fee, released_at, statement_url | Simulated |
| ProblemReport | booking_id, reported_by, text, photos[], status, outcome, resolved_by | Post-event hold |
| ComplianceItem | booking_id, name, mandatory, due_at, versions[], status, comment | |
| Cancellation | booking_id, by (organizer \| venue), reason, policy_tier, refund_amount, retained_amount, fee_refunded | |
| EventPage | id, event_id, booking_id, title, summary, description, cover, category, age_note, status, slug_token | Unlisted |
| Session | id, event_page_id, date, starts_at, ends_at, capacity, registered_count | |
| RegistrationQuestion | event_page_id, type, label, options[], required | ≤ 3 |
| Registration | id, session_id, user_id, answers{}, status (confirmed \| cancelled), created_at | |
| Pass | id, registration_id, token (≥ 128-bit), status (issued \| checked_in \| cancelled \| voided), checked_in_at, checked_in_by | |
| Report | subject (space \| event_page \| message), reporter, reason, text, status, decision | |
| HolidayCalendar | date, name, kind (national \| cuti_bersama), year | |
| Setting | key, value, changed_by, changed_at | Fees, deadlines, policies |
| Notification | user_id, event, channel, payload, status | |
| AuditLog | actor, action, entity, before, after, ip, at | |

### 9.2 State machines

**Enquiry**
`submitted → viewed → (info_requested ⇄ responded) → quoted → accepted` · terminal: `declined | expired | withdrawn | lost`

**Quote**
`draft → pending_approval → approved → sent → (superseded) → accepted | declined | expired | withdrawn`; the Owner can return `pending_approval → draft`. A sent quote with `is_backup = true` can only move to `accepted` after its blocking hold is released; it moves to `expired` (reason "dates booked") when the hold becomes a booking.

**Calendar hold**
`tentative_hold → expired | released | converted_to_booking_hold`; `booking_hold → booked | released`.

**Booking**
`pending_agreement_and_deposit → confirmed → balance_due → fully_paid → in_progress (first event day) → post_event_window → (on_hold ⇄ post_event_window) → settled`
Branches: `lapsed` (agreement or deposit deadline missed), `cancelled_by_organizer`, `cancelled_by_venue`.

**Agreement**
`generated → accepted_by_organizer → accepted_by_both`; `→ voided` on lapse or cancellation.

**Payment (sandbox)**
`created → pending → paid | expired | failed`; `paid → refunded (partial | full, simulated)`.

**Compliance item**
`not_started → submitted → (changes_requested → submitted) → approved | waived`

**Event page**
`draft → live → registration_closed (⇄ live) → ended`; `→ cancelled` (booking cancelled); `→ removed` (Admin).

**Registration / pass**
Registration: `confirmed → cancelled`. Pass: `issued → checked_in (→ issued by undo within 5 min)`; `issued → cancelled | voided`.

---

## 10. Integrations

| Capability | MVP choice | Use | Phase 2 path |
|---|---|---|---|
| Payments | Xendit **test mode** behind an adapter; built-in simulator as fallback (FR-M14-13) | Deposit and balance, simulated refunds | Real Xendit + xenPlatform escrow, payouts, Midtrans as second provider |
| Email | A transactional email service on a free tier, with SPF/DKIM/DMARC on the Spot-In domain | Verification, magic links, notifications, passes | Add WhatsApp Business (via BSP), SMS OTP, web push |
| Maps | Leaflet or MapLibre with OpenStreetMap-based tiles from a free tier (attribution shown, usage within the provider's terms) | Map view, pin drop | Address autocomplete; commercial geocoder if needed |
| Geocoding | Nominatim (or the tile provider's geocoder) called once on save, ≤ 1 request/second, results cached; the pin drop is the source of truth | Coordinates for typed addresses | — |
| Database and search | PostgreSQL with PostGIS and pg_trgm | Data, availability, distance and fuzzy search | Separate search engine only if targets are missed |
| File storage | S3-compatible object storage (free tier), signed expiring URLs; ClamAV (or equivalent) scan on upload | Photos, proposal files, documents, PDFs | Image CDN |
| PDF and QR | Server-side PDF generation library; QR generation library | Quotes, agreement, receipts, statements, passes | Wallet passes |
| Monitoring | Free-tier error tracking and uptime ping | Reliability | APM, synthetic checks |

Integration principles: every external call goes through an internal adapter; webhooks (from the payment sandbox) are verified by signature, processed idempotently and stored raw; when a provider is down the user sees a clear status and can retry (§12.4).

---

## 11. Business rules: money, fees, tax and time

All rates are Admin settings (FR-M24-03); values below are pilot defaults.

### 11.1 Fees (simulated)

| Fee | Charged to | Basis | Pilot default |
|---|---|---|---|
| Booking commission | Venue (deducted at simulated release) | % of rental + add-ons, excluding PPN | 10% |
| Organizer service fee ("Spot-In fee") | Organizer, separate line, paid with the deposit (or the full payment) | % of rental + add-ons, excluding PPN; min and max caps | 3%, min Rp 50.000, max Rp 2.500.000 |
| Payment processing | — | Not modeled in the pilot | — |

Commission is charged only on amounts the venue actually keeps after refunds (§11.3).

### 11.2 Amounts, deposit and balance

- All amounts are integer Rupiah; each computation is rounded half-up per line; totals are sums of rounded lines.
- **Venue total** = rental + add-ons + service charge + PPN (if PKP).
- **Organizer total** = venue total + Spot-In fee.
- **Deposit** = deposit % × venue total + Spot-In fee; due N days after acceptance (default 3).
- **Balance** = venue total − venue part of the deposit; due N days before the event start (default 14); requested 7 days before its due date (FR-M15-09). If acceptance falls inside the balance window, one full payment is due at acceptance.
- **Confirmed** = agreement accepted by both **and** deposit paid.

Worked example (used in AC-M12-1 and AC-M16-1): rental Rp 25.000.000/day × 3 days = 75.000.000; electricity 40 kVA × 3 days × Rp 50.000 = 6.000.000; rental + add-ons = 81.000.000; PPN (PKP venue, effective 11%) = 8.910.000; venue total = 89.910.000; Spot-In fee 3% of 81.000.000 = 2.430.000; organizer total = 92.340.000. Deposit 50% = 44.955.000 + 2.430.000 = **47.385.000**; balance = **44.955.000**. At release: commission 10% of 81.000.000 = 8.100.000; venue payable (simulated) = 89.910.000 − 8.100.000 = **81.810.000**; Spot-In revenue = 8.100.000 + 2.430.000 = 10.530.000. Check: 81.810.000 + 10.530.000 = 92.340.000.

### 11.3 Cancellation and refunds (simulated)

- Standard policies (days before event start → % of venue total the organizer gets back):

| Policy | ≥ 30 days | 14–29 days | 7–13 days | < 7 days |
|---|---|---|---|---|
| Flexible | 100% | 100% | 50% | 0% |
| Moderate | 100% | 50% | 0% | 0% |
| Strict | 50% | 0% | 0% | 0% |

- **Retained** = (100% − tier %) × venue total; **refund** = max(0, venue amount paid − retained). If retained exceeds what was paid, the venue keeps what was paid and nothing more is requested in the pilot.
- Commission at cancellation = 10% × the ex-PPN share of the amount the venue actually keeps.
- Spot-In fee per FR-M18-05; always refunded on venue cancellation.
- Examples (worked example above, Moderate, only deposit paid): cancel 35 days before → tier 100% → retained 0 → refund 44.955.000, Spot-In fee kept (outside the 24-hour grace). Cancel 20 days before → tier 50% → retained 44.955.000 → refund 0.

### 11.4 Tax (pilot)

| Item | Treatment |
|---|---|
| PPN on rental and taxable add-ons | Shown on quotes and receipts if the venue says it is PKP; default rule 12% on DPP 11/12 (effective 11%) as an Admin setting, to be confirmed with a tax adviser before Phase 2 |
| PPh 4(2), Faktur Pajak, e-meterai, PBJT | Not handled in the MVP; receipts state "not a tax invoice" (Phase 2) |
| Spot-In fee and commission | Shown without PPN in the pilot (no taxable revenue) |

### 11.5 Holds and validity

- Tentative hold: default 5 days, max 14; one per date range.
- Booking hold: from acceptance until the deposit deadline.
- Quote validity: default 7 days; backup quotes are extended to at least 2 business days after their blocking hold is released (FR-M12-13).

### 11.6 Business days and deadlines

- **Business day** = Monday–Friday excluding national holidays and cuti bersama in the Admin holiday calendar (FR-M24-11), in the **property's** time zone.
- A deadline of **N business days** ends at 23:59 of the Nth business day after the day the clock starts; the start day itself never counts.
- Reminders are scheduled in calendar hours before the computed deadline.
- Example: an enquiry sent Friday 16:00 WIB, with Monday a national holiday, expires Wednesday 23:59 WIB (Tuesday = day 1, Wednesday = day 2).
- **Business hours** for median response time are 09:00–17:00 on business days.

### 11.7 Post-event window and release

- Window = 72 hours from the end of the event's last day; Report a problem places a hold (FR-M16-08).
- Release (simulated) runs at 10:00 property time on the first business day after the window ends, if no hold is open.
- Example: event ends Sunday 22:00 → window ends Wednesday 22:00 → release Thursday 10:00. If Thursday is a holiday, release moves to Friday 10:00.

---

## 12. Edge cases and error states

### 12.1 Availability, holds and backup quotes

| Case | Expected behaviour |
|---|---|
| Two organizers accept quotes for the same space and dates at the same moment | One transaction commits and creates the booking hold; the other gets "Tanggal ini baru saja diambil" with options to message the venue or see similar spaces; the venue is told to revise or withdraw the losing quote. |
| Venue tries to quote dates already Booked or Blocked | Sending is blocked; the conflicting booking reference is shown to the venue only. |
| Venue quotes dates under another organizer's tentative or booking hold | Sent as a backup quote (FR-M12-13); Accept disabled until the hold is released. |
| Several backup quotes when a hold lapses | All holders are notified at the same time; the first acceptance wins atomically; the others see "Tanggal ini baru saja diambil" and their quotes become backup quotes again behind the new booking hold. |
| Backup quote's validity would end before the hold is released | Validity is extended automatically to at least 2 business days after release; if the hold becomes a booking first, the backup quote expires with reason "Dates booked". |
| Tentative hold expires while the venue is drafting a quote for that organizer | The quote can still be sent if the dates are free; if another hold was placed meanwhile, it is sent as a backup quote. |
| Deposit paid after the deadline (late sandbox callback) | If the dates are still free, the booking is confirmed; if not, the payment is refunded (simulated) and both parties notified. |
| Venue blocks dates overlapping a hold | Only after explicitly releasing the hold (the holder is notified); blocks can't overlap confirmed bookings. |
| Buffer time violated | Quote can't be sent; the message shows the neighbouring booking's end time. |
| Price changed after a quote was sent | Sent quotes are snapshots and don't change. |
| Space unpublished or operator suspended with open enquiries or bookings | Open enquiries are declined automatically with a reason; confirmed bookings continue; the Admin is alerted. |
| Event spans midnight | Each event day is stored with its own start and end in the property time zone; an end time earlier than the start means the next calendar day. |

### 12.2 Enquiries, quotes and approval

| Case | Expected behaviour |
|---|---|
| Venue never replies | Enquiry expires at the business-day deadline; the organizer is notified; the venue's response rate updates. |
| Owner doesn't approve a pending quote | Reminder to the Owner after 1 business day; the quote's validity clock starts only when it is sent. |
| Owner edits a pending quote | Creates a new draft version; the author is notified; the approval record is kept. |
| Organizer opens an expired or superseded version | Accept is hidden; a link points to the latest version. |
| Organizer edits the event after quotes were sent | Open quotes show "Event changed – review" and can't be accepted until the venue re-sends or revises them. |
| Enquiry limits reached | The send button explains the limit (5 per send, 10 open per event, 20 per day). |
| Attachment fails the virus scan | That file is rejected with a message; others are kept. |
| Message contains a contact detail before confirmation | Masked per FR-M10-03; the sender sees a notice; three masked messages in one thread alert the Admin. |
| Message contains "Rp 25.000.000" or "300 m²" | Not masked. |

### 12.3 Pilot agreement

| Case | Expected behaviour |
|---|---|
| Organizer accepted, venue didn't by the deposit deadline | Booking lapses; any sandbox deposit is refunded (simulated); both notified. |
| Agreement generation fails | Booking shows "Membuat perjanjian…" with retry; the Admin is alerted after 3 failures; the deadline is extended by the outage (max 24 h, logged). |
| Quote changes after acceptance | Not possible; changes after acceptance require cancelling (change requests are Phase 2). |

### 12.4 Sandbox payments and ledger

| Case | Expected behaviour |
|---|---|
| Test VA expired before payment | The organizer can create a new one until the payment deadline. |
| Callback delayed or lost | Pending payments are polled; the user sees "Diproses", never "Gagal", until the provider says so. |
| Duplicate callback | Processed once (idempotency key); one payment, one set of ledger entries. |
| Test card declined | Clear error, other methods suggested, booking state unchanged. |
| Payment adapter unavailable | Payment button shows the status and a retry; deadline extended once by the Admin if needed. |
| Ledger total doesn't match quote and receipts | Reconciliation flags the booking in the Admin ledger view and alerts the team (FR-M24-05). |
| Live payment key configured with pilot mode on | Server refuses to start (FR-M14-13). |
| Report a problem filed in the last minute of the window | Accepted; hold placed; release waits for the Admin's resolution. |
| Release day is a holiday | Moves to the next business day (§11.7). |

### 12.5 Event pages, registration and check-in

| Case | Expected behaviour |
|---|---|
| Two people take the last spot at the same moment | Atomic counter; one registers, the other sees "Pendaftaran penuh". |
| Organizer lowers capacity below current registrations | Blocked; the organizer must cancel specific registrations (with a message) first. |
| Same email registers twice for a session | Second attempt shows the existing pass. |
| Attendee never clicks the verification email | No pass is issued; the unverified registration holds a spot for 2 hours, then is released. |
| Pass QR opened by someone who isn't the holder or an organizer member | Shows only first name, event and "Tunjukkan ke panitia" — no check-in button, no email. |
| Pass used twice | Second open shows "Sudah check-in pukul … oleh …". |
| Booking cancelled after registrations | Page shows Cancelled, passes voided, registrants emailed (FR-M18-10). |
| Event page link shared publicly | Still unlisted and noindex; the pilot label tells visitors it is not a real event; abuse can be reported and the Admin can remove the page. |
| Under-18 visitor tries to register | Blocked at the age confirmation (FR-M30-09). |

### 12.6 Accounts, invites and pilot data

| Case | Expected behaviour |
|---|---|
| Uninvited email tries to sign up as venue or organizer | "Spot-In masih dalam pilot tertutup" with a contact link; no account created. |
| Invite expired | The Admin can resend. |
| Only Owner of an organization with an active booking deletes their account | Blocked with the reason; must transfer ownership or finish/cancel bookings first. |
| User tries to enquire to their own operator's space | Blocked with an explanation. |
| Email bounces | Marked on the profile; the Admin sees it; the user sees a banner to fix their email at next login. |
| Pilot deletion date reached | The documented deletion job runs; afterwards only anonymized counts and seed data remain. |
| Pre-demo data scan finds a NIK-like or card-like number in free text | The Admin is shown the record to remove it; the finding is logged. |

### 12.7 Generic UI states

| State | Copy and behaviour |
|---|---|
| Offline | Banner "Anda sedang offline — perubahan belum tersimpan"; forms keep local drafts. |
| Session expired mid-form | Re-login dialog; draft kept. |
| Permission denied | "Anda tidak punya akses — hubungi Owner {organisasi}"; no data revealed. |
| Not found / removed | Friendly page with a link to search. |
| Provider down (payments, email, maps) | Feature-specific message and retry; for maps, the address text still saves and the pin can be added later (publishing still requires the pin). |
| Validation errors | Inline per field, summary at the top of long forms. |
| Server error | Generic message with a reference ID; error reported automatically. |

---

## 13. Acceptance criteria and demo script

**Definition of done (decision #7):** an MVP requirement is done only when it has at least one Given/When/Then criterion below, the criterion passes in the demo environment, and it is covered by a demo-script step (§13.1) or an automated test. A requirement without a passing criterion is not done, and is either fixed or moved to Phase 2 before the demo. Each criterion lists the requirements it covers.

### 13.1 Demo script

Run on the demo environment with seed data and the demo clock (FR-M38-10). Every step must pass without manual database edits.

| # | Scenario | Steps | Criteria exercised |
|---|---|---|---|
| D1 | Venue onboarding | Admin invites Budi → sign-up and consent → property with map pin → two spaces with rate cards and required documents → submit → Admin verifies and approves → spaces searchable | AC-M1-1, AC-M38-2, AC-M38-3, AC-M4/M5-1, AC-M3-1, AC-M24/M25/M26-1 |
| D2 | Search and enquiry | Rina searches with dates and filters, uses the map, saves a shortlist and opens the share link logged out, sends one enquiry to 3 spaces | AC-M7/M8-1, AC-M7/M8-2, AC-M7/M8-3, AC-M9/M10-1 |
| D3 | Quote to acceptance | Budi quotes above the threshold → Owner approves → Rina requests a revision → v2 with diff → comparison PDF → Rina accepts v2 | AC-M2-4, AC-M12-1, AC-M12-2, AC-M12-3, AC-M7/M8-4, AC-M6-2 |
| D4 | Confirmation and backup quote | Sari enquires the same dates → backup quote → Rina accepts the agreement, venue accepts, sandbox deposit → Confirmed → Sari's backup quote expires; repeat with a lapse (demo clock +4 days) to show the backup quote becoming acceptable | AC-M13-1, AC-M14-1, AC-M12-4, AC-M12-5, AC-M38-1, AC-M38-7 |
| D5 | Before and during the event | Documents uploaded and approved → balance requested and paid (demo clock) → event page created → two attendees register → passes emailed → one checked in from the QR, one from the list | AC-M17-1, AC-M15/M16-2, AC-M28/M30/M31/M32/M36-1, -4, -6, -7 |
| D6 | After the event | Demo clock to the event end → post-event window → (one run with Report a problem resolved by Admin) → release → settlement statement matches §11.2 | AC-M15/M16-4, AC-M15/M16-5, AC-M24/M25/M26-3, AC-M38-7 |
| D7 | Cancellation | A second booking cancelled by the organizer 20 and 35 days out (Moderate) and one by the venue → refunds match §11.3 → event page shows Cancelled and registrants emailed | AC-M18-1, AC-M18-2, AC-M18-3 |

### 13.2 Acceptance criteria

**AC-M1 Accounts**

1. **Given** an invited email, **when** the user signs up with email + password and clicks the verification link, **then** they can send enquiries; **and** before verifying, enquiry, quote, accept, pay and register actions prompt them to verify. *Covers FR-M1-01, FR-M1-02, FR-M1-11.*
2. **Given** an Admin without 2FA, **when** they log in, **then** they must enrol an authenticator before reaching the admin pages; other users can enable 2FA in settings. *Covers FR-M1-03, FR-M24-12.*
3. **Given** a user logged in on two devices, **when** they revoke one session, **then** that device is logged out on its next request; a forgotten password can be reset by email; a session idle for more than the configured period requires login. *Covers FR-M1-04.*
4. **Given** a phone number on a profile, **then** the other party sees it only after a booking between them is confirmed. *Covers FR-M1-05.*
5. **Given** a first login from an invite, **then** the user picks Find spaces, List spaces or both; a user who arrived through an event page is not asked. **Given** a user in both a venue operator and an organizer organization, **then** the context switcher shows the current context and the data shown belongs only to it. *Covers FR-M1-06, FR-M1-07.*
6. **Given** the only Owner of an organization with an active booking, **when** they request deletion, **then** it is blocked with the reason; **given** a user without such ties, **then** deletion erases their personal fields and their messages show "Deleted user". *Covers FR-M1-08.*
7. **Given** a sign-up, **then** consent records exist for the terms, privacy notice and pilot notice with their versions. *Covers FR-M1-09.*
8. **Given** a visitor on an event page, **when** they enter a name and email and click the emailed link, **then** an account exists, the registration is confirmed and no password was asked. *Covers FR-M1-10.*

**AC-M2 Organizations and roles**

1. **Given** a Staff member, **when** they try to invite members or change the threshold, **then** the action is refused server-side; a Viewer can't send a quote; an organizer Member can't cancel a booking or export attendees; a direct URL to another organization's booking returns a permission error. *Covers FR-M2-14, FR-M2-01.*
2. **Given** an operator profile, **then** it has display name, legal name, logo, city and contact email and no NPWP/NIB fields. *Covers FR-M2-02.*
3. **Given** an invite sent 8 days ago, **when** it is opened, **then** it shows expired and can be resent; a revoked invite no longer works. *Covers FR-M2-03.*
4. **Given** a threshold of Rp 50.000.000, **when** Staff sends a Rp 60.000.000 quote, **then** it goes to Pending approval and the organizer doesn't see it until approved. *Covers FR-M2-06, FR-M12-05.*
5. **Given** an organization with one Owner, **when** that Owner tries to change their own role, **then** it is refused until another Owner exists; ownership transfer works. *Covers FR-M2-08.*
6. **Given** a member with open enquiries, **when** an Owner removes them, **then** a reassignee must be chosen first, and the change appears in the organization audit log. *Covers FR-M2-09, FR-M2-10.*

**AC-M3 Verification**

1. **Given** an unverified operator, **when** they try to publish a space or send a quote, **then** it is blocked with an explanation; after the Admin marks them verified (method and date recorded, no documents), the badge appears on their spaces. *Covers FR-M3-02, FR-M3-03, FR-M3-08, FR-M3-09.*

**AC-M4/M5 Properties, spaces and pricing**

1. **Given** a property without a map pin, **then** it can't be submitted; with a pin, the time zone is prefilled; spaces have no parent/child option and no setup/dismantle fields. *Covers FR-M4-01, FR-M4-02, FR-M4-03, FR-M4-16.*
2. **Given** 16 photos uploaded to a space, **then** the 16th is refused; uploaded photos are served as WebP. *Covers FR-M4-04.*
3. **Given** a property's required documents and a space's 2 enquiry questions, **then** a new booking's checklist uses those documents and the enquiry form requires both answers. *Covers FR-M4-08, FR-M4-09.*
4. **Given** a draft space, **when** submitted, **then** it is In review and not searchable; after approval it is Published; changing its price doesn't change sent quotes; duplicating it creates a draft copy. *Covers FR-M4-10, FR-M4-11.*
5. **Given** weekday Rp 20.000.000 and weekend Rp 25.000.000 rates plus a Lebaran season, **when** an organizer runs a quick estimate across a weekend in the season, **then** each day uses the right rate, mandatory add-ons are included, PPN appears only for PKP venues, and the total is labeled non-binding; a "from" price is always shown. *Covers FR-M5-01, FR-M5-02, FR-M5-04, FR-M5-05, FR-M5-06, FR-M5-07.*

**AC-M6 Calendar and holds**

1. **Given** a booked, a blocked and a held date, **then** the venue sees each state and the organizer sees Unavailable, Unavailable and "Limited availability"; a weekly recurring block appears every week. *Covers FR-M6-01, FR-M6-02, FR-M6-03.*
2. **Given** two acceptance requests for the same dates within milliseconds, **then** exactly one booking hold exists and the other request gets a conflict error. *Covers FR-M6-05, FR-M6-07, FR-M12-11.*
3. **Given** a tentative hold placed with 5 days, **then** the holder is notified on placing, 24 h before expiry and on expiry, and the dates become available at expiry; a second tentative hold on the same dates is refused. *Covers FR-M6-04.*
4. **Given** a confirmed booking, **then** its dates show Booked; after cancellation they are Available. *Covers FR-M6-06.*
5. **Given** a 4-hour buffer, **when** the venue quotes an hourly booking starting 2 hours after another ends, **then** sending is blocked. *Covers FR-M6-08.*

**AC-M7/M8 Search, shortlists and comparison**

1. **Given** dates in the search, **then** spaces booked or blocked on any of those dates are excluded (held ones only with the toggle); filters for power and permitted activities return only matching spaces in list and map views; sort by distance uses the stored pins; "near me" asks for location permission and falls back to the city. *Covers FR-M7-01, FR-M7-02, FR-M7-03, FR-M7-04, FR-M7-12, FR-M7-13.*
2. **Given** a search for "aula jaksel" with a typo ("aul jaksel"), **then** halls in Jakarta Selatan are returned; the property page lists all its published spaces. *Covers FR-M7-10, FR-M7-06.*
3. **Given** a shortlist share link, **when** opened logged out, **then** it shows spaces, notes and indicative prices but no messages or quotes; after revocation it shows "Tautan tidak tersedia"; an enquiry can be sent to selected shortlist spaces. *Covers FR-M8-01, FR-M8-02, FR-M8-04.*
4. **Given** three latest quotes in one event, **then** the comparison table aligns totals, per-day cost, deposit terms and cancellation summaries and exports a watermarked PDF. *Covers FR-M8-05.*

**AC-M9/M10 Events, enquiries and messaging**

1. **Given** an event with 2 proposal files, **when** sent to 3 spaces, **then** 3 independent threads exist, each venue sees the files and its own deadline; a 6th space in one send and an 11th open enquiry are refused; a file over 10 MB is refused. *Covers FR-M9-01, FR-M9-02, FR-M9-03, FR-M9-04.*
2. **Given** attendance above a space's capacity, **then** a warning shows but the enquiry can be sent. *Covers FR-M9-05.*
3. **Given** an enquiry sent Friday 16:00 WIB with Monday a holiday and no venue action, **then** it becomes Expired at Wednesday 23:59 WIB, with reminders at Tuesday 23:59 and Wednesday 19:59, and the organizer is notified. *Covers FR-M9-06, FR-M9-07, FR-M24-11.*
4. **Given** a decline, **then** a reason is required and shown; **given** the organizer edits the event, **then** open quotes show "Event changed – review" and can't be accepted; **given** an acceptance, **then** the organizer is prompted to mark other open enquiries Lost; withdrawing an enquiry notifies the venue; venue notes are invisible to the organizer. *Covers FR-M9-08, FR-M9-09, FR-M9-10, FR-M9-11.*
5. **Given** messages before confirmation, **then** "hubungi 0812-3456-7890", "a@b.co", "wa.me/62812…" and "1234567890" are masked, while "Rp 25.000.000", "300 m²" and "12/12/2026" are not; after confirmation nothing is masked; uploading a file shows the contact warning. *Covers FR-M10-03.*
6. **Given** a thread, **then** new messages appear without reload, attachments up to 10 MB in the allowed types upload and preview, a saved reply can be inserted, the inbox filters by unreplied and by space, a message can be reported, edited within 10 minutes and soft-deleted. *Covers FR-M10-01, FR-M10-02, FR-M10-04, FR-M10-07, FR-M10-08, FR-M10-09.*

**AC-M12 Quotes**

1. **Given** the worked example in §11.2, **then** the quote shows rental + add-ons Rp 81.000.000, PPN 8.910.000, Spot-In fee 2.430.000, total 92.340.000, deposit 47.385.000 and balance 44.955.000, and the PDF (with watermark) matches. *Covers FR-M12-01, FR-M12-02, FR-M12-03, FR-M12-04, FR-M12-09.*
2. **Given** v1 sent and v2 revised after per-line comments, **then** the organizer sees a diff, can only accept v2, and v1 is read-only; declining requires a reason. *Covers FR-M12-06, FR-M12-07.*
3. **Given** a quote past its validity, **then** it shows Expired and can't be accepted; accepting requires a verified email and acceptance of the pilot booking terms; a balance due less than 3 days before the event can't be set. *Covers FR-M12-08, FR-M12-10.*
4. **Given** Rina's booking hold on 12–14 Dec, **when** the venue quotes Sari for 13 Dec, **then** Sari's quote is labeled "Tanggal sedang ditahan" with Accept disabled; **when** Rina's booking is confirmed, **then** Sari's quote expires with reason "Tanggal sudah dipesan". *Covers FR-M12-13.*
5. **Given** two backup quotes and the blocking booking lapses, **then** both holders are notified together, the first to accept gets the booking hold, the other sees a conflict, and a backup quote whose validity would have ended is extended to at least 2 business days after the release. *Covers FR-M12-13.*

**AC-M13 Pilot agreement**

1. **Given** an accepted quote, **then** within 60 seconds a "Sample agreement (pilot)" PDF with watermark is generated from that version; the organizer accepts first (tick + typed name), then the venue; the last page lists both acceptances with time and IP; the stored hash matches the downloaded file; on lapse the agreement shows Voided. *Covers FR-M13-02, FR-M13-05, FR-M13-07, FR-M13-09, FR-M13-10.*

**AC-M14 Sandbox payments**

1. **Given** a booking with both acceptances, **when** the organizer pays the deposit with a test VA, **then** the payment is recorded once (even with a duplicate callback), the ledger shows it held, the booking becomes Confirmed and a receipt is emailed. *Covers FR-M14-01, FR-M14-02, FR-M14-03, FR-M14-08.*
2. **Given** a deposit unpaid at its deadline, **then** the booking lapses and both are notified; **given** a balance unpaid at its due date, **then** the venue Owner can extend once by up to 3 days or cancel under the organizer policy; reminders are sent 3 days and 1 day before and on the due date. *Covers FR-M14-05, FR-M14-06.*
3. **Given** a cancellation with a refund, **then** the refund appears as "Refund (simulated)" in the ledger and on the receipt history. *Covers FR-M14-09.*
4. **Given** live payment keys in the configuration with pilot mode on, **then** the server refuses to start; with no test-mode access configured, the simulator produces pending, paid, expired and failed states through the same adapter interface. *Covers FR-M14-12, FR-M14-13, FR-M38-07.*

**AC-M15/M16 Documents, ledger and settlement**

1. **Given** a deposit payment, **then** a "Pilot receipt – not a tax invoice" with a `PILOT-` number shows venue rental lines and a separate Spot-In fee line; cancelling it creates a credit note and keeps the original. *Covers FR-M15-01, FR-M15-02.*
2. **Given** a balance due 14 days before the event, **then** the balance request is issued 21 days before the event, with reminders 3 days and 1 day before the due date. *Covers FR-M15-09.*
3. **Given** an acceptance 5 days before the balance due date, **then** the balance request is issued immediately. *Covers FR-M15-09.*
4. **Given** the worked example and no reported problem, **when** the event ends Sunday 22:00, **then** release runs Thursday 10:00, venue payable (simulated) is Rp 81.810.000, Spot-In revenue 10.530.000, the ledger balances, and a watermarked settlement statement and the per-booking CSV are available. *Covers FR-M16-01, FR-M16-07, FR-M16-09, FR-M15-07.*
5. **Given** a problem reported in the post-event window, **then** release does not run until an Admin resolves it and records the outcome. *Covers FR-M16-08.*

**AC-M17 Booking workspace**

1. **Given** a property with 3 required documents, **when** a booking is confirmed, **then** the workspace shows the checklist with due dates from the event start; uploads keep versions; the venue can approve or request changes with a comment; a mandatory item missing 7 days before triggers warnings to both sides and the venue can mark the booking At risk. *Covers FR-M17-01, FR-M17-02, FR-M17-03, FR-M17-04.*

**AC-M18 Cancellations**

1. **Given** the worked example, Moderate policy and only the deposit paid, **when** the organizer cancels 35 days before, **then** the refund shown and executed is Rp 44.955.000 and the Spot-In fee is kept; **when** cancelling 20 days before, **then** the refund is 0 and the venue keeps 44.955.000. *Covers FR-M18-03, FR-M18-04, FR-M18-05.*
2. **Given** a venue cancellation, **then** the organizer is refunded everything paid including the Spot-In fee, no penalty is recorded, and the cancellation is Owner-only. *Covers FR-M18-06, FR-M38-08.*
3. **Given** a cancelled booking with registrations, **then** the event page shows Dibatalkan, passes are voided and registrants are emailed; an organizer no-show recorded on the event day is treated as a cancellation on that day. *Covers FR-M18-08, FR-M18-10.*

**AC-M28/M30/M31/M32/M36 Event pages**

1. **Given** a confirmed 2-day booking, **when** the organizer creates an event page, **then** two sessions exist with the booked times, the venue and map are locked, capacity can't exceed the space's layout capacity, and the page shows the pilot label. *Covers FR-M28-01, FR-M28-02, FR-M28-03, FR-M28-04, FR-M28-13, FR-M28-17.*
2. **Given** a live event page, **then** its HTML has `noindex, nofollow`, no structured data, it is absent from the sitemap and from search, and no page lists it. *Covers FR-M28-05.*
3. **Given** 40 registrations, **when** the organizer changes a session time, **then** a confirmation shows "40 orang akan diberi tahu" and all 40 are emailed; the page moves through Live → Registration closed → Ended at the right times. *Covers FR-M28-07, FR-M28-09.*
4. **Given** a session with capacity 100 and 99 registrations, **when** two people submit together, **then** one registers and the other sees "Pendaftaran penuh"; the same email can't register twice; under-18 can't register; more than 10 registrations per IP per hour are refused; the form refuses a question asking for an ID number; an attendee can cancel and the spot is freed; the organizer can close and reopen registration. *Covers FR-M30-01, FR-M30-02, FR-M30-04, FR-M30-07, FR-M30-08, FR-M30-09, FR-M30-10.*
5. **Given** the attendee list, **then** the Owner can export CSV (logged) and a Member can't; the organizer can cancel a registration with a message. *Covers FR-M30-11.*
6. **Given** a confirmed registration, **then** the pass is emailed within 1 minute and shown in My passes with event, session time and zone, venue, name, number and pilot label; opening its QR logged out shows only first name and event. *Covers FR-M31-01, FR-M31-02, FR-M31-03.*
7. **Given** an organizer member opens a pass QR, **then** they can check it in; reopening shows "Sudah check-in pukul … oleh …"; undo works within 5 minutes and not after; a cancelled pass shows Dibatalkan; check-in from the list works; the printable list prints all registrants. *Covers FR-M31-07, FR-M32-01, FR-M32-03, FR-M32-08, FR-M32-12.*
8. **Given** a report on an event page, **then** it appears in the Admin queue; removing the page emails registrants and shows "Halaman tidak tersedia". *Covers FR-M36-04.*

**AC-M21/M22 Notifications and dashboards**

1. **Given** a new enquiry, **then** venue members receive an in-app and an email notification within 1 minute that links to the enquiry; a user who turned off non-transactional emails still receives "payment due". *Covers FR-M21-01, FR-M21-02, FR-M21-05.*
2. **Given** the sending domain, **then** SPF, DKIM and DMARC checks pass on a test message, and a bounced address is marked on the profile. *Covers FR-M21-07.*
3. **Given** seeded enquiries, **then** the venue pipeline shows them in the right columns with overdue badges, "This week" lists upcoming items, the counts for a period match a raw export, and the organizer dashboard shows each event's next action and registrations vs capacity. *Covers FR-M22-01, FR-M22-02, FR-M22-03, FR-M22-06.*

**AC-M24/M25/M26 Admin, localization and help**

1. **Given** a submitted operator and space, **then** they appear in the Admin queues; the Admin can approve or reject with a reason, suspend and unsuspend, and find them by name or email; every action is in the admin audit log. *Covers FR-M24-01, FR-M24-02, FR-M24-04, FR-M24-08.*
2. **Given** an Admin changes the organizer fee to 4%, **then** only quotes created afterwards use 4%; an item waiting more than 2 business days appears in the next daily admin email. *Covers FR-M24-03, FR-M24-10.*
3. **Given** a booking whose ledger was altered in the test database, **then** the ledger view flags the mismatch. *Covers FR-M24-05.*
4. **Given** any screen, email or PDF, **then** text is in Bahasa Indonesia, amounts read "Rp 25.000.000", dates "12 Des 2026", times carry WIB/WITA/WIT for the property; a property in Bali shows WITA to a viewer in Jakarta; a hard-coded UI string fails the lint check. *Covers FR-M25-01, FR-M25-02, FR-M25-05.*
5. **Given** the help page and "Hubungi kami" from a booking, **then** the FAQ covers pilot mode, and the message reaches the Admins with a link to the booking. *Covers FR-M26-01, FR-M26-02.*

**AC-M38 Pilot mode**

1. **Given** any generated PDF and any booking page, **then** the PILOT watermark and banner are present; a test that generates every document type finds none without it. *Covers FR-M38-01.*
2. **Given** an email not on the invite list, **when** it signs up as venue or organizer, **then** no account is created; attendees can register only via an event-page link. *Covers FR-M38-02.*
3. **Given** a new user, **then** sign-up shows the pilot notice with the hosting provider and storage country, deletion date and practice-booking statement, and records acceptance with its version; users must confirm they are 18 or older. *Covers FR-M38-03, FR-M38-09.*
4. **Given** the database schema, **then** no column exists for ID documents, NIK, NPWP, NIB, bank or card numbers; the pre-demo scan reports zero matches on seed and pilot data. *Covers FR-M38-04.*
5. **Given** a user, **then** they can download their data as JSON and delete their account; the documented deletion job, run on a copy of pilot data, leaves no personal fields. *Covers FR-M38-05.*
6. **Given** production access, **then** only named team members have credentials, each access is logged, and seed data lives in a separate environment. *Covers FR-M38-06.*
7. **Given** the demo environment, **when** the Admin moves the clock +3 days, **then** due holds expire, reminders and deadlines fire as at that time, and release runs on schedule; the pilot environment has no clock control. *Covers FR-M38-10.*

**AC-NFR (pilot)**

1. With the demo seed, search p95 ≤ 500 ms and public page LCP ≤ 2.5 s on simulated 4G.
2. A backup restore has been tested and recorded before the pilot.
3. The OWASP Top 10 self-check is documented with no open high-risk items; dependency and secret scans pass in CI.
4. The booking flow and event page pass an automated WCAG 2.1 AA check with no critical issues.

---

## 14. Release plan

Dates are set with the course schedule (Q20).

| Milestone | Content | Exit criteria |
|---|---|---|
| **Build 1 — listings and enquiries** | M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M24 basics, M25 catalog, M38 invite-only and consent | D1 and D2 pass |
| **Build 2 — quote to confirmed** | M12 incl. backup quotes, M13, M14 sandbox, M15/M16 ledger and receipts, M21, M38 watermarks and demo clock | D3 and D4 pass; ledger reconciliation clean |
| **Build 3 — event and after** | M17, M18, M28/M30/M31/M32/M36, M22, M26, post-event window and release | D5–D7 pass; all §13.2 criteria pass |
| **Pilot (invite-only)** | 1–3 real venues, ≥ 3 organizers, invited attendees; pilot notice live | ≥ 1 real venue quote; ≥ 20 registrations; zero blocked-data matches; no open high-risk security items |
| **Course demo** | Demo script D1–D7 live | All scenarios pass; PRD and review log submitted |
| **Pilot end** | Deletion job run on the announced date | Deletion verified and recorded |
| **Phase 2** | Backlog §7.20, starting with real money, legal review and verification | Per v1.1 §14 and a new review |

---

## 15. Risks, assumptions and open questions

### 15.1 Risks

| Risk | Mitigation |
|---|---|
| No pilot venue joins | Interview venues before Build 1 and sign up 1–3 small venues; fall back to team-run demo venues; the demo doesn't depend on a real venue |
| Scope creeps back from the backlog | Every new item needs an acceptance criterion and a demo step, or it waits for Phase 2 |
| Users mistake practice bookings for real ones | Pilot banner, watermarks, pilot notice, unlisted event pages with "not a real event" labels |
| Personal data leak | Data rule (no sensitive fields), invite-only access, logged production access, deletion date |
| Cross-border hosting without consent | Hosting country named in the pilot notice and accepted by every user |
| Emails land in spam (verification blocked) | SPF/DKIM/DMARC, spam-folder hint, bounce tracking, Admin can resend |
| Payment test mode unavailable | Built-in simulator behind the same adapter |
| Free-tier limits hit during the demo (tiles, geocoding, email quota) | Cache geocoding, pin drop as source of truth, check quotas before the demo, keep a recorded fallback video of D1–D7 |
| Demo depends on waiting for deadlines | Demo clock (FR-M38-10) |
| Venue cash-flow concern about release after the post-event window (Phase 2 with real money) | Trusted-venue early release (backlog) |

### 15.2 Assumptions and validation

| Assumption | How we test it | Result | Date |
|---|---|---|---|
| Venues will answer enquiries and quote on a web tool instead of WhatsApp | Interviews with 5 operators (2 malls, 3 small venues); pilot quote from ≥ 1 real venue | — | — |
| The quote fields (rate card, add-ons, PPN, deposit/balance) match how venues price | Show the quote builder to interviewed venues | — | — |
| Organizers value one enquiry to several venues and side-by-side comparison | Interviews with 5 organizers; pilot usage of multi-venue send | — | — |
| A 2-business-day reply deadline is realistic for venues | Ask in interviews; watch pilot response times | — | — |
| Mall-specific features (child spaces, floor plans, night setup windows, approval chains) are worth building in Phase 2 | Mall interviews | — | — |
| Organizers want event pages and registration tied to the booking | Organizer interviews; pilot event-page creation rate | — | — |

### 15.3 Open questions

| # | Question | Owner |
|---|---|---|
| Q19 | Does a closed, invite-only course pilot need PSE Lingkup Privat registration? | Course supervisor |
| Q20 | Course milestones and demo date | Team |
| Q21 | Which hosting provider, region and free-tier limits; which email service | Team (Eng) |
| Q22 | Do we have Xendit test-mode access, or do we use the simulator? | Team (Eng) |
| Q23 | Pilot deletion date and who runs the deletion job | Team |
| Q24 | Which 1–3 venues join the pilot, and who contacts them | Team |
| Q25 | Pilot terms and notice wording — reviewed by the supervisor? | Team / supervisor |

Open questions Q1–Q18 from v1.1 (fees, escrow legality, tax treatment, e-signature provider, contract template, Faktur upload, permits, direct payments, listing quality, launch cities, ticketing fee, PBJT, NIK on tickets, ticket refunds, venue-mandated ticketing, age verification, sensitive event categories, waiting room) remain open for Phase 2 and are not MVP blockers.

---

## 16. Appendix: research sources

Competitor and market research — venue booking (paraphrased in §2):

- Peerspace help centre — Instant Book, booking requests and response window: https://intercom.help/peerspace-108cf19aff8e/en/articles/10119400 · https://intercom.help/peerspace-108cf19aff8e/en/articles/10119524 · https://intercom.help/peerspace-108cf19aff8e/en/articles/10119108
- Peerspace vs Tagvenue comparison: https://www.peerspace.com/resources/peerspace-vs-tagvenue/
- Skift Meetings review of Peerspace: https://meetings.skift.com/reviews/peerspace-review/
- Sharetribe — building a Peerspace-style marketplace: https://www.sharetribe.com/create/how-to-build-website-like-peerspace/
- Tagvenue booking guide: https://www.tagvenue.com/blog/how-to-book-a-venue-on-tagvenue/ · List your venue: https://tagvenue.com/page/list-your-venue · Help centre: https://support.tagvenue.com/hc/en-gb/sections/360000265337-Other
- Tagvenue Pro listings: https://www.getapp.com/sales-software/a/tagvenue-pro/ · https://www.capterra.co.il/software/1078029/Tagvenue-Pro
- Hire Space for venues: https://hirespace.com/for-venues · Instant booking: https://hirespace.com/blog/introducing-instant-booking-technology · Commission model: https://app.welcometothejungle.com/companies/Hire-Space
- Appear Here: https://www.appearhere.co.uk/how-it-works · https://startup-seeker.com/company/appearhere~co~uk
- Spacewise / Regency Centers: https://www.icsc.com/news-and-views/icsc-exchange/how-regency-centers-pilot-with-short-term-leasing-tech-provider-spacewise-works · https://chainstoreage.com/regency-taps-new-platform-leasing
- Yardi Retail Manager (casual leasing): https://www.yardi.com/apac/?p=398007 · Hyperin specialty leasing: https://www.hyperin.com/specialty-leasing · Pickspace: https://pickspace.com/solutions/shopping-centers
- Space Pick floor-plan booking: https://smb.americanpress.com/article/Borderless-Tech-Launches-Space-Pick-an-Interactive-Floor-Plan-Booking-Platform-as-It-Expands-into-Hong-Kong-Canada-and-North-America/6a71d1951d8459b6854a7158
- iVvy — quote-to-contract automation: https://www.ivvy.com/blog/venue-booking-software-for-quotes-and-contracts-what-to-look-for/
- SpotQoe (Indonesia): https://industri.kontan.co.id/news/perluas-pangsa-pasar-spotqoecom-gandeng-ismaya-group

Competitor and market research — events and ticketing (added in v1.1):

- Eventbrite organizer features: https://www.eventbrite.com/organizer/features/all-features/ · Ticket types (paid/free/donation, sections, hidden tickets, absorb fees, check-in windows): https://www.eventbrite.ca/support/articleredirect?anum=3290 · https://www.eventbrite.com/help/en-us/articles/644100/ · Organizer app and big events: https://www.eventbrite.co.uk/organizer/pm/se/built-for-big-events/ · Review: https://blog.promotix.com/eventbrite-review
- Luma help centre (registration, approval, capacity, waitlist, ticket types, unlock codes, taxes): https://help.luma.com/ · https://help.luma.com/p/creating-an-event · https://help.lu.ma/p/creating-an-event · Overview: https://www.itechguides.com/products/luma/
- Peatix (groups, followers, recommendations, payout after event): https://help-organizer.peatix.com/en/support/solutions/articles/44001934576 · https://help-organizer.peatix.com/en/support/solutions/articles/44001821715/ · https://services.peatix.com/?p=1398 · https://app.dealroom.co/companies/peatix
- DICE (waiting list, face-value returns, locked tickets): https://en.wikipedia.org/wiki/Dice_(ticketing_company) · https://news.pollstar.com/?p=253977 · https://themusicnetwork.com/?p=64611
- Ticketmaster SafeTix and Smart Queue: https://business.ticketmaster.com/safetix/ · https://business.ticketmaster.co.uk/eurovision-2023/ · Verified resale explainer: https://catchmovement.com/guides/verified-resale-explained
- LOKÉT / Loket.com: https://finder.techleap.nl/companies/loket · https://www.datanyze.com/companies/loket/370376461 · https://apps.apple.com/id/app/loket-x/id6470000434
- GOERS: https://www.cbinsights.com/company/goers · https://industri.kontan.co.id/news/event-kembali-semarak-goers-dukung-dengan-teknologi-ticketing · https://selular.id/2017/01/cara-mudah-pesan-tiket-event-di-aplikasi-goers/ · https://en.dailysocial.id/post/business-goers-2022
- tiket.com To Do / tiket FLEXI: https://www.tiket.com/info/tiket-flexi
- Ticketing platforms in Indonesia compared (Oct 2026): https://www.ticketfairy.com/compare/ticketing/indonesia
- Local practice — NIK-named tickets, purchase limits, wristband redemption, virtual queues: https://www.detik.com/jabar/berita/d-7503592/jadwal-hari-terakhir-war-tiket-wjf-2024-dan-cara-penukaran-gelangnya · https://ekonomi.bisnis.com/read/20231203/12/1720382/kemendag-cecar-promotor-soal-aduan-tiket-konser-coldplay-rugikan-konsumen · https://www.bankmandiri.co.id/livin/dewa19/syarat-dan-ketentuan · https://selular.id/2026/02/tips-berhasil-war-tiket-konser/ · https://www.goodnewsfromindonesia.id/2026/06/11/mengapa-war-ticket-kembali-ramai-di-tengah-maraknya-konser-2026

Indonesian infrastructure and regulation:

- Xendit xenPlatform split payments: https://docs.xendit.co/xenplatform/split-payments · https://www.xendit.co/products/xenplatform/
- Privy e-meterai and e-signature: https://m.antaranews.com/amp/berita/2839345/privy-rilis-materai-elektronik · https://inet.detik.com/cyberlife/d-8478133/5-rekomendasi-aplikasi-tanda-tangan-elektronik/amp
- Mekari Sign API: https://teknologi.bisnis.com/read/20231124/282/1717791/mekari-sign-sediakan-tanda-tangan-digital-dan-e-meterai
- E-meterai placement rules: https://pajakku.com/e-materai-e-meterai-pengertian-cara-cek-keaslian-dan-aturan-penggunaannya
- PPh Final 4(2) on land/building rental: https://ortax.org/pajak-penghasilan-atas-persewaan-tanah-dan-atau-bangunan · https://news.ddtc.co.id/pph-final-sewa-tanah-dan-bangunan-dievaluasi-23469
- Coretax replaces e-Faktur; PJAP integration: https://www.workato.com/the-connector/coretax-indonesia/ · https://ortax.org/pasca-implementasi-coretax-djp-sesuaikan-layanan-yang-wajib-disediakan-pjap
- UU PDP and PP 33/2026: https://www.rsm.global/indonesia/sites/default/files/media/publications/Client%20Alert/2026/RSM%20Indonesia%20Client%20Alert%20-%20PP%20332026%20Six%20Implementation%20Priorities%20before%2016%20January%202027.pdf · https://siplawfirm.id/resources/pp-33-2026-pelindungan-data-pribadi
- PBJT jasa kesenian dan hiburan (regional entertainment tax on tickets; cap, Jakarta and Bandung rates, no PPN on concert tickets): https://www.pajak.go.id/id/artikel/mau-ngonser-tapi-kena-pajak-begini-penjelasannya · https://news.ddtc.co.id/berita/nasional/1794385/catat-tiket-konser-musik-tak-kena-ppn-tapi-dikenai-pajak-daerah · https://news.ddtc.co.id/berita/nasional/1805662/beli-tiket-konser-musik-berarti-kamu-ikut-sumbang-pajak-ke-daerah · https://news.ddtc.co.id/berita/daerah/1811470/dorong-konser-pemkot-bandung-akan-relaksasi-tarif-pajak-hiburan · https://nasional.kontan.co.id/news/bukan-40-pajak-konser-musik-paling-tinggi-10-di-uu-hkpd · https://economy.okezone.com/read/2026/07/19/320/3231008/penerimaan-pajak-naik-ditopang-konser-musik-di-jakarta



---

## Appendix A: review decision traceability

Decisions from `docs/PRD-review.md` and where v1.2 applies them.

| Finding | Decision | Applied in |
|---|---|---|
| 1 | Small team → one demo loop | §5, §7.20, change log, §14 |
| 2 | Sandbox payments only | §1.2, §3.3 NG-P1, §7.11–7.13, §10, §11 |
| 3 | Venue booking is the core; events thinned | §5.2, §7.16, §7.20 |
| 4 | One venue, small team: 3 venue roles, 2 organizer roles | §4.2, §4.3, §7.2 |
| 5 | Real pilot users → no sensitive data, consent, deletion date, 18+ | §3.3 NG-P3, §7.3 FR-M3-09, §7.19, §8 |
| 6 | No venue yet → validate, generic spaces only | §7.4 FR-M4-16, §15.1, §15.2, §14 pilot exit |
| 7 | Graded demo → AC for every MVP FR, demo script | §3.4, §13 |
| 8 | Email only | §7.1, §7.17, §10 |
| 9 | Business day definition | §1.4, §11.6, FR-M24-11, AC-M9/M10-3 |
| 10 | 1–2 people run ops → minimal back office | §7.18 |
| 11 | Backup quotes on held dates | FR-M12-13, §6.6, §12.1, AC-M12-4/5 |
| 12 | Practice runs → pilot mode | §7.11 FR-M13-10, §7.19 |
| 13 | Unlisted event pages | FR-M28-05, FR-M28-17, AC-M28/M30/M31/M32/M36-2 |
| 14 | Bahasa Indonesia only, i18n-ready | §7.18 FR-M25-01/05 |
| 15 | Text-only masking with defined patterns | FR-M10-03, AC-M9/M10-5 |
| 16 | OpenStreetMap stack, pin drop, geocode on save | FR-M4-01, §10 |
| 17 | PostgreSQL-only search | FR-M7-10, FR-M7-12, §10 |
| 18 | Free hosting → pilot NFRs, cross-border consent, PSE question | §8, FR-M38-03, Q19 |
| 19 | Release after the post-event window (and, in Phase 2, after claim and dispute windows) | FR-M16-01, FR-M16-08, §11.7, §7.20 |
| 20 | Event-page approvals never auto-approve (Phase 2) | §7.20 Public events |
| 21 | Single balance-request rule | FR-M15-09, §6.7, §11.2 |
| 22 | Goals split into MVP and post-course | §3.1, §3.2 |

*This PRD is not legal or tax advice; items marked for legal or tax review must be confirmed with qualified advisers before Phase 2.*

