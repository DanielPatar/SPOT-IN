# Spot-In — Product Requirements Document

| | |
|---|---|
| **Product** | Spot-In — web marketplace connecting event organizers with malls, venues and space owners, plus a public guide to upcoming and happening events with registration and ticketing |
| **Version** | 1.1 (draft for review) |
| **Date** | 5 November 2026 |
| **Launch market** | Indonesia (IDR, Bahasa Indonesia + English) |
| **Status** | Draft — open questions in §15 |

### Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 5 Nov 2026 | Added the public events side: event listings, event discovery, free RSVP, passes and check-in (MVP); paid ticketing with orders, refunds, transfers, virtual queue, payouts and regional entertainment tax (Phase 2). New attendee and check-in staff roles, flows §6.11–6.21, modules M28–M37, data entities, integrations, business rules §11.6–11.8, edge cases §12.8–12.9 and acceptance criteria. Non-goal NG4 revised (ticketing is now in scope; reserved seating, open resale and online events stay out). |
| 1.0 | 30 Oct 2026 | Venue marketplace: request → quote → contract → escrowed payment → event → payout. |

---

## Table of contents

1. [Summary](#1-summary)
2. [Market research and feature inventory](#2-market-research-and-feature-inventory)
3. [Goals, non-goals and success metrics](#3-goals-non-goals-and-success-metrics)
4. [Users, organizations and roles](#4-users-organizations-and-roles)
5. [Feature plan and phasing](#5-feature-plan-and-phasing)
6. [User flows](#6-user-flows)
7. [Functional requirements](#7-functional-requirements)
8. [Non-functional requirements](#8-non-functional-requirements)
9. [Data model](#9-data-model)
10. [Integrations](#10-integrations)
11. [Business rules: fees, money and tax](#11-business-rules-fees-money-and-tax)
12. [Edge cases and error states](#12-edge-cases-and-error-states)
13. [Acceptance criteria](#13-acceptance-criteria)
14. [Release plan](#14-release-plan)
15. [Risks, assumptions and open questions](#15-risks-assumptions-and-open-questions)
16. [Appendix: research sources](#16-appendix-research-sources)

---

## 1. Summary

### 1.1 Problem

Booking a mall atrium, an event hall or an outdoor space in Indonesia today runs on WhatsApp, email, PDFs of rate cards and phone calls. For **event organizers (EOs) and brands** this means:

- No single place to discover what spaces exist, what they cost and whether they are free on a date.
- Slow, inconsistent responses from mall marketing/casual-leasing teams; quotes arrive in different formats and are hard to compare.
- Contracts, meterai, invoices, tax withholding, permits and load-in documents handled by hand, often at the last minute.
- Money paid by bank transfer directly to the venue with little protection if the venue cancels.
- After the venue is booked, the event still has to be promoted, registered and ticketed in a different set of tools (Instagram posts, Google Forms, a separate ticketing platform), with no link back to the venue booking.

For **malls and venue owners** it means:

- Specialty/casual-leasing and atrium inventory sits empty because it is not marketed online.
- Leasing teams spend most of their time on low-quality enquiries and back-and-forth.
- Manual quoting, approval chains, invoicing and payment chasing; no view of pipeline or occupancy across properties.
- No easy way to show shoppers what is happening at the mall this weekend, or to know in advance how many people an event will bring.

For **the public (attendees)** it means:

- Event information is scattered across organizer and mall social accounts, WhatsApp groups and several ticketing sites; it is hard to answer "what's on near me this weekend?" or "what's happening at this mall?".
- Free events often register through ad-hoc forms with no confirmation, reminders or entry pass; paid events use a different platform each time.
- Fear of fake tickets and scalpers for popular events.

### 1.2 Solution

Spot-In is a web marketplace (responsive web, PWA-ready) with three sides:

- **Venues** (malls, multi-property groups and individual owners) list properties and bookable spaces with rich specs, floor-plan locations, rate cards and live availability, and manage enquiries, quotes, contracts, payments and event-day operations with their team.
- **Organizers** discover spaces, shortlist and compare, send an enquiry (to one or many venues) with their event proposal/deck, negotiate a quote, sign the contract with certified e-signature and e-meterai, and pay a deposit and balance through Spot-In, which holds funds in escrow until the event is delivered. They then **publish the event publicly**, take free registrations (MVP) or sell tickets (Phase 2), and check attendees in at the door — all from the same event.
- **Attendees** (the public) browse upcoming and happening events by date, place, mall and category, follow organizers and venues, register for free events, buy tickets (Phase 2), keep a QR pass on their phone and get reminders.

Venue booking model: **request → proposal review → quote → negotiate → accept → contract → pay deposit → confirmed → pay balance → event → settlement.** There is no instant booking of spaces at launch.

Public event model: **organizer publishes listing (venue approval when the venue requires it) → attendees discover → register / buy → pass issued → reminders → check-in → post-event follow-up → (P2) ticket payout.**

### 1.3 How Spot-In makes money

1. **Booking commission** charged to the venue on each confirmed booking (deducted at payout).
2. **Organizer service fee** added on top of the rental at checkout.
3. **Promoted listings** (P2) — venues pay for sponsored placement of spaces, and organizers for promoted events, in search and category pages.
4. **Ticketing fee** (P2) on paid tickets, charged to the buyer or absorbed by the organizer. Free registrations carry no fee.

All rates are configurable by Spot-In admins (see §11).

### 1.4 Glossary

| Term | Meaning |
|---|---|
| **Event (project)** | The organizer's internal record of an event — dates, attendance, budget, proposal pack — used to enquire and book venues (M9). Not public. |
| **Event listing** | The public page for an Event (M28). One Event has at most one listing; a listing may have several sessions. |
| **Session** | One dated occurrence within a listing (e.g., Day 1, Day 2; or 10:00 and 14:00 workshops). |
| **Registration / RSVP** | A free sign-up to a listing or session. |
| **Ticket type** | A category of admission with its own price and quantity (P2). Free registration is modeled as a free ticket type. |
| **Order** | One checkout by one buyer, containing one or more tickets (free or paid). |
| **Pass / ticket** | One admission for one attendee, with a unique QR code. |
| **Check-in** | Scanning or marking a pass as admitted at the door. |
| **Attendee** | Any user who registers or holds a pass. No organization is needed. |
| **PBJT hiburan** | Pajak Barang dan Jasa Tertentu on arts and entertainment services — the regional tax on event tickets (§11.7). |

---

## 2. Market research and feature inventory

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

### 2.2 Consolidated feature inventory — venue marketplace

Every feature found across the venue products above, and where it lands in Spot-In. Phase: **MVP**, **P2** (Phase 2), **P3** (Phase 3), or **Out** (not planned).

| # | Feature | Seen in | Spot-In |
|---|---|---|---|
| 1 | Search by location, event type, date, capacity, budget | All | MVP |
| 2 | Map view of results | Peerspace, Tagvenue | MVP |
| 3 | Rich listing: photos, video, specs, rules, amenities | All | MVP |
| 4 | 360° photos / virtual tour | Peerspace, Spazious | P2 |
| 5 | Floor plan with space location pin | Yardi, Space Pick, Squarefeet | MVP (static pin) / P2 (interactive) |
| 6 | Hierarchical spaces (whole atrium vs halves) | Mall software | MVP |
| 7 | Upfront price guidance (from-price, min spend) | Tagvenue | MVP |
| 8 | Live availability calendar | Peerspace, Hire Space | MVP |
| 9 | External calendar sync (iCal/Google) | Tagvenue | P2 |
| 10 | Saved shortlists / boards, shareable | Peerspace, Tagvenue | MVP |
| 11 | Side-by-side quote comparison | Tagvenue (implicit) | MVP |
| 12 | Enquiry / request-to-book | All | MVP |
| 13 | One enquiry to multiple venues | Tagvenue | MVP |
| 14 | Event proposal / deck upload | Appear Here, Spacewise (qualification) | MVP |
| 15 | In-app messaging with attachments | All | MVP |
| 16 | Contact details masked until confirmed | Peerspace | MVP |
| 17 | Response deadline / auto-expiry | Peerspace, Tagvenue | MVP |
| 18 | Responsiveness badge (e.g., "Supervenue") | Tagvenue | P2 |
| 19 | Structured quotes with line items, revisions | Tagvenue, Hire Space, iVvy/Joinways | MVP |
| 20 | Quote templates and packages | Venue CRMs | MVP (templates) |
| 21 | Internal quote approval chain | Mall leasing practice | MVP |
| 22 | Tentative holds / first-second option | Event industry practice | MVP |
| 23 | Site visit / tour scheduling | Peerspace | MVP |
| 24 | Contract generation + e-signature | Joinways, Spacewise | MVP |
| 25 | E-meterai on contracts | Indonesia-specific | MVP |
| 26 | Online payment (cards, e-wallets, VA, QRIS) | All | MVP |
| 27 | Deposit + balance payment schedule | Peerspace (50/50 split) | MVP |
| 28 | Escrow / funds held until event | Peerspace | MVP |
| 29 | Invoice / bank transfer for corporates | Tagvenue (manual payments) | MVP |
| 30 | Instalments / BNPL | Peerspace (Klarna) | P3 |
| 31 | Refundable security deposit | Market practice | MVP |
| 32 | Automated payouts with commission split | Xendit xenPlatform | MVP |
| 33 | Tax invoices (Faktur Pajak via Coretax) | Indonesia-specific | MVP (Spot-In fees) / P2 (venue rent via PJAP) |
| 34 | PPh 4(2) withholding handling | Indonesia-specific | MVP |
| 35 | Compliance documents & permit checklist | Spacewise (insurance) | MVP |
| 36 | Insurance verification | Peerspace, Spacewise | MVP (upload) / P3 (embedded insurance) |
| 37 | Event workspace: rundown, load-in/out, crew passes, vendors | Venue ops practice | MVP (core) / P2 (passes) |
| 38 | Change requests (date, layout, add-ons) | Tagvenue (amend quote) | MVP |
| 39 | Cancellation policies and automated refunds | Peerspace | MVP |
| 40 | Damage claims and disputes | Peerspace | MVP |
| 41 | Two-way reviews | Peerspace, Tagvenue | MVP |
| 42 | Venue CRM / lead pipeline | Tagvenue Pro, Spacewise | MVP (pipeline) / P2 (CRM extras) |
| 43 | Saved replies, auto-acknowledgement | Tagvenue Pro, iVvy | MVP (saved replies) |
| 44 | AI-assisted replies and quote drafting | Tagvenue Pro | P3 |
| 45 | Analytics: occupancy, conversion, response time, revenue | Tagvenue Pro, Pickspace | MVP (basic) / P2 (advanced) |
| 46 | Multi-property portfolio management | Spacewise, Yardi | MVP |
| 47 | Team roles and permissions | Spacewise | MVP |
| 48 | Promoted / sponsored listings | Hire Space (Prime listings) | P2 |
| 49 | Lead marketplace / special deals for venues | Tagvenue Lead Hub | P3 |
| 50 | White-label branded booking portal per mall | Spacewise | P3 |
| 51 | Embeddable booking widget for venue websites | Venue software | P2 |
| 52 | Concierge / managed sourcing | Hire Space 360, Appear Here | P3 |
| 53 | Curated collections and city guides (SEO) | Appear Here | P2 |
| 54 | Vendor marketplace (AV, catering, booth builders) | Hire Space | P3 |
| 55 | Instant book | Peerspace, Hire Space | Out (revisit after P3) |
| 56 | Media / digital-screen ad space booking | Spacewise, Hyperin | Out (not in scope) |
| 57 | Long-term permanent tenancy leasing | Yardi | Out |
| 58 | Ticketing / attendee registration | Event platforms | **In scope from v1.1** — see §2.3 |
| 59 | Native iOS/Android apps | Peerspace | Out for now (responsive web + PWA) |

### 2.3 Consolidated feature inventory — events, registration and ticketing

| # | Feature | Seen in | Spot-In |
|---|---|---|---|
| E1 | Public event pages (cover, description, schedule, venue, organizer, price info) | All | MVP |
| E2 | Browse by date presets (today, this weekend), city, category, free/paid, venue/mall | Eventbrite, Luma, Peatix, GOERS | MVP |
| E3 | Map view and "near me" | Eventbrite, GOERS | MVP |
| E4 | "Happening now" and upcoming feeds | GOERS, Luma | MVP |
| E5 | "What's on" at a mall/venue (events on the property page) | Venue websites | MVP |
| E6 | Organizer profile pages with followers | Peatix groups, Luma calendars, Eventbrite | MVP |
| E7 | Follow a venue/property for new events | Spot-In-specific | MVP |
| E8 | Personalized recommendations | Eventbrite, DICE, Peatix | P2 |
| E9 | Save events; share links with preview images; WhatsApp share | All | MVP |
| E10 | Add to calendar (ICS / Google / Outlook) | Luma | MVP |
| E11 | SEO structured data (schema.org Event) and landing pages | Eventbrite | MVP (pages) / P2 (landing pages) |
| E12 | Unlisted (link-only) and private events | Luma | MVP |
| E13 | Free RSVP with capacity | Luma, Peatix | MVP |
| E14 | Custom registration questions and terms/waiver acceptance | Luma, Eventbrite | MVP |
| E15 | Approval-required registration | Luma | MVP |
| E16 | Waitlist when full | Luma, DICE | MVP (free) / P2 (paid) |
| E17 | Group registration (+ guests) | Luma | MVP |
| E18 | External ticket link for paid events (until P2) | — | MVP |
| E19 | QR pass in account, email and WhatsApp | All | MVP |
| E20 | Check-in app: QR scan, manual lookup, offline, multi-gate, live counts | Eventbrite Organizer, Peatix, Loket | MVP |
| E21 | Automated reminders and post-event follow-up | Luma, Peatix | MVP |
| E22 | Organizer announcements to registrants | Luma, Eventbrite | MVP |
| E23 | Co-hosts and event staff access | Luma | MVP |
| E24 | Event analytics (views, traffic sources, registrations, check-ins) | Luma, Eventbrite | MVP (basic) |
| E25 | Paid ticket types with quantity, sales windows and order limits | Eventbrite, Loket | P2 |
| E26 | Early-bird / timed price tiers | Eventbrite | P2 |
| E27 | Promo codes; hidden tickets unlocked by access code | Eventbrite, Luma | P2 |
| E28 | Group / bundle tickets | Eventbrite | P2 |
| E29 | All-in price display; organizer absorbs or passes on fees | DICE, Eventbrite | P2 |
| E30 | Per-account and per-identity (NIK) purchase limits; named tickets | Indonesian practice | P2 |
| E31 | Virtual waiting room for high-demand on-sales | Ticketmaster, local platforms | P2 |
| E32 | Registration-based presale / lottery | Ticketmaster Verified Fan | P3 |
| E33 | Rotating QR shown only near doors (anti-screenshot) | Ticketmaster, DICE | P2 |
| E34 | In-platform ticket transfer | Ticketmaster, GOERS, DICE | P2 |
| E35 | Wristband redemption sessions | Indonesian practice | P2 |
| E36 | Refund policies; automatic refunds on cancellation; postponement handling | All | P2 |
| E37 | Organizer payouts after the event, with ledger | Peatix, Eventbrite | P2 |
| E38 | Early / real-time payouts | GOERS, Eventbrite | P3 |
| E39 | Regional entertainment tax (PBJT) line and reports | Indonesia-specific | P2 |
| E40 | Face-value returns via waitlist (fan-to-fan) | DICE | P3 |
| E41 | Door / box-office sales (QRIS) | Eventbrite, GOERS POS | P3 |
| E42 | Embeddable ticket widget for organizer websites | Loket, GOERS, Eventbrite | P2 |
| E43 | Public attendee reviews of events and organizers | — | P2 |
| E44 | Promoted events | Eventbrite Ads | P2 |
| E45 | Apple Wallet / Google Wallet passes | Ticketmaster, Eventbrite | P2 |
| E46 | Recurring event series | Luma, Meetup | P2 |
| E47 | Merchandise / add-on sales at checkout | Eventbrite | P3 |
| E48 | Reserved seating maps | Eventbrite, Ticketmaster | Out (revisit after P3) |
| E49 | Open resale marketplace with markups | Ticketmaster resale | Out |
| E50 | Online / virtual events and streaming | Luma, Eventbrite | Out |
| E51 | Paid memberships / subscriptions | Luma | Out |

---

## 3. Goals, non-goals and success metrics

### 3.1 Goals

| ID | Goal |
|---|---|
| G1 | Make it possible for an organizer to go from search to a signed, paid, confirmed booking entirely inside Spot-In. |
| G2 | Cut the venue's time from enquiry to first quote to under 24 business hours for the median enquiry. |
| G3 | Protect both sides' money: organizer funds held in escrow until the event is delivered; venues guaranteed payment for confirmed bookings. |
| G4 | Be compliant out of the box with Indonesian requirements: certified e-signature, e-meterai, Faktur Pajak via Coretax, PPh 4(2) withholding records, PBJT on tickets (P2), UU PDP. |
| G5 | Support how malls actually work: multiple properties, teams with roles, internal approval chains, sub-divisible spaces, setup/dismantle windows outside mall hours, approval of public event content. |
| G6 | Build a supply base of verified venues in Greater Jakarta (Jabodetabek) first, then Surabaya, Bandung, Bali, Medan. |
| G7 | Generate revenue from four streams: venue commission, organizer service fee, promoted listings/events (P2), ticketing fee (P2). |
| G8 | Give the public one place to see what's on at malls and venues near them, and to register in a few taps. |
| G9 | Give organizers one workflow from booking a space to filling it: publish, take registrations, check in (MVP); sell tickets and get paid out (P2). |
| G10 | Fair and safe ticketing (P2): all-in prices shown upfront, anti-scalping limits, in-platform transfers only, and guaranteed refunds when an event is cancelled. |

### 3.2 Non-goals

| ID | Non-goal | Why |
|---|---|---|
| NG1 | Instant booking of spaces | Chosen model is request → quote; mall spaces need proposal review. Data model keeps the door open. |
| NG2 | Media / ad-space booking (LED screens, banners, sampling spots) | Out of scope by decision; listing types are extensible. |
| NG3 | Long-term (permanent) retail tenancy | Different legal and sales cycle; Spot-In covers bookings from a few hours up to 90 days (pop-ups). |
| NG4 | Reserved seating maps, open resale marketplaces, online/virtual events, paid memberships, and event marketing outside Spot-In (social ads, influencer tools) | v1.1 brings general-admission registration and ticketing into scope. Seating maps and resale add large complexity for a minority of events; online events don't use a physical space. Revisit after Phase 3. |
| NG5 | Native mobile apps at launch | Responsive web + PWA (installable, push notifications, offline passes and scanner) covers all sides. |
| NG6 | Markets outside Indonesia / foreign currencies | IDR-only; architecture should not hard-code country, but no multi-currency work. |
| NG7 | Spot-In acting as the venue's or organizer's accounting system | Spot-In issues documents and exports data; it does not replace an ERP. |
| NG8 | Spot-In holding customer funds on its own balance sheet | Funds are held through a licensed payment provider's escrow/sub-account structure (see §11.3). |
| NG9 | Spot-In filing regional entertainment tax or applying for event permits on organizers' behalf | The organizer remains the taxpayer and permit holder. Spot-In computes, shows and reports PBJT and records permit attestations/uploads (subject to Q12). |
| NG10 | Hardware access control (turnstiles, RFID wristband scanning) | Check-in runs on phones and tablets; hardware integrations considered in P3. |

### 3.3 Success metrics

| Metric | Definition | 12-month target (placeholder — to be set with business) |
|---|---|---|
| GMV | Total rental value of confirmed bookings (excl. tax) | TBD |
| Net revenue | Commission + organizer fees + promoted listings + ticketing fees − payment costs | TBD |
| Enquiry → quote rate | % of enquiries that receive a quote | ≥ 70% |
| Quote → booking rate | % of sent quotes that become confirmed bookings | ≥ 25% |
| Median first response time | Enquiry submitted → first venue reply | ≤ 24 business hours |
| Verified venues live | Properties with ≥ 1 published space | TBD (Jabodetabek focus) |
| Repeat organizer rate | Organizers with ≥ 2 bookings in 6 months | ≥ 30% |
| Off-platform leakage proxy | Enquiries with quotes accepted but never paid | ≤ 10% |
| Dispute rate | Bookings with an opened dispute | ≤ 2% |
| Payment success rate | Successful payments / initiated | ≥ 95% |
| Published event listings | Listings published per month | TBD |
| Booking-to-listing rate | % of confirmed bookings whose event is published on Spot-In | ≥ 40% |
| Registration conversion | Registrations (or paid orders) / unique event-page visitors | ≥ 5% |
| Show-up rate | Checked-in passes / issued passes (free events) | ≥ 60% |
| Attendee monthly active users | Logged-in or identified visitors to event pages per month | TBD |
| Paid ticket GMV (P2) | Face value of paid tickets sold, excl. tax and fees | TBD |
| Ticket refund + chargeback rate (P2) | Refunded or charged-back paid tickets / sold | ≤ 3% (excl. organizer cancellations) |
| Invalid entry rate | Duplicate or forged pass scans admitted / total scans | ≈ 0 (target < 0.01%) |

---

## 4. Users, organizations and roles

### 4.1 Personas

| Persona | Description | Main jobs |
|---|---|---|
| **Event organizer (EO) agency** — "Rina, project manager at an EO" | Runs brand activations, exhibitions, concerts and corporate events for clients; books 5–30 venues a year; needs client sign-off | Find spaces fast, compare costs, get the client's approval, manage documents and deadlines, pay by company invoice; publish the event, fill it, check people in |
| **Brand / in-house marketing** — "Andi, brand activation lead" | Books mall atriums and pop-up booths for product launches and roadshows across cities | Book a roadshow (several malls, consecutive weekends), predictable cost, tax invoices; drive footfall with free registrations |
| **Small business / community organizer** — "Sari, bazaar organizer" | Runs bazaars, wedding expos, workshops, community events; price-sensitive; pays personally or via a small company | Find affordable spaces, pay by e-wallet/VA, simple contract; list the bazaar publicly, take RSVPs, sell low-price workshop tickets (P2) |
| **Mall casual-leasing / marketing team** — "Budi, casual leasing executive" | Manages atrium, booth spots and outdoor areas in one or more malls | Fill the calendar, screen proposals against tenant mix and brand guidelines, quote quickly, get internal approval, collect payment, coordinate with operations; approve public event pages and show "what's on" to shoppers |
| **Multi-property group** — "Dewi, head of specialty leasing for a mall group" | Oversees leasing teams across 5–40 properties | Portfolio view, standard pricing and contract templates, approval rules, revenue reporting, event footfall across properties |
| **Individual owner** — "Pak Hendra, owns a rooftop and a hall" | Lists one or two spaces; does everything himself | Simple setup, phone-friendly, get paid reliably |
| **Attendee** — "Maya, 26, office worker in Jakarta" | Looks for weekend things to do: mall events, workshops, bazaars, concerts; uses her phone and WhatsApp for everything | See what's on nearby by date, register or buy quickly, keep the pass on her phone, get reminders and directions, trust that tickets are real and refundable if cancelled |
| **Check-in staff** — "Joko, door crew hired by the EO" | Works the entrance on event day; often weak signal; no access to the organizer's admin | Open a scanner link, scan fast, see clear valid/invalid results, look people up by name, keep working offline |
| **Spot-In operations** | Internal staff | Verify venues and organizers, moderate listings and events, resolve disputes, manage payouts and refunds, sell promoted listings |

### 4.2 Account structure

```
User (a person, one login)
 ├─ Membership(s) in Organizations, each with a role
 └─ As an attendee: Orders → Passes, Follows, Saved events (no organization needed)

Organizer Organization (type: individual | company)
 └─ members with organizer roles
 └─ Events (projects) → Enquiries → Quotes → Bookings
                     └─ Event listing (public) → Sessions → Ticket types → Orders → Passes → Check-ins

Venue Operator (type: individual owner | company | group)
 └─ members with venue roles (operator-wide or scoped to specific properties)
 └─ Properties (a mall, a venue building, an outdoor site)
     └─ Spaces (bookable units; may have child spaces)
     └─ "What's on": published event listings held at the property
```

- A user can belong to several organizations (e.g., a freelancer working for two EOs) and switch context.
- An individual organizer or individual owner is an organization of one, created automatically.
- A venue operator of type **group** may hold many properties; members can be scoped to a subset of properties.
- Any user can act as an attendee without creating an organization. A mall that wants to run its own public events (e.g., a seasonal programme) creates an organizer organization; listings it publishes at its own properties skip the venue-approval step.
- Check-in staff are invited per event listing and do not need an organization membership.

### 4.3 Roles and permissions

**Organizer-side roles**

| Permission | Owner | Admin | Planner | Finance | Viewer | Check-in staff |
|---|---|---|---|---|---|---|
| Manage org profile, billing entity, tax data (NPWP) | ✓ | ✓ | | | | |
| Invite/remove members, assign roles | ✓ | ✓ | | | | |
| Search, shortlist, share shortlists | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Create enquiries, message venues | ✓ | ✓ | ✓ | | | |
| Accept quote | ✓ | ✓ | ✓ (up to org limit, if set) | | | |
| Sign contract (authorized signatory flag required) | ✓ | ✓ | ✓ if flagged | ✓ if flagged | | |
| Pay, download invoices, upload withholding slips | ✓ | ✓ | | ✓ | | |
| Manage event workspace documents | ✓ | ✓ | ✓ | | | |
| Request changes / cancel booking | ✓ | ✓ | ✓ | | | |
| Leave reviews | ✓ | ✓ | ✓ | | | |
| Create/edit event listings and registration settings | ✓ | ✓ | ✓ | | view | |
| Publish, unpublish, postpone or cancel a listing | ✓ | ✓ | ✓ | | | |
| View attendee list and answers; export (logged) | ✓ | ✓ | ✓ | view | | names and status only, for assigned listings |
| Approve/decline registrations, manage waitlist | ✓ | ✓ | ✓ | | | |
| Send announcements to registrants | ✓ | ✓ | ✓ | | | |
| Invite check-in staff | ✓ | ✓ | ✓ | | | |
| Check attendees in | ✓ | ✓ | ✓ | | | ✓ (assigned listings, during access window) |
| Set ticket prices, tiers, promo codes (P2) | ✓ | ✓ | ✓ | | | |
| Issue ticket refunds (P2) | ✓ | ✓ | ✓ (up to org limit, if set) | ✓ | | |
| Ticket payouts, PBJT and sales reports (P2) | ✓ | ✓ | view | ✓ | | |
| Event analytics | ✓ | ✓ | ✓ | ✓ | ✓ | live counts only |

Check-in staff see attendee name, ticket type, guest count and check-in status; never email, phone, answers or full ID numbers (named tickets show the last 4 digits only).

**Venue-side roles** (each can be operator-wide or scoped to selected properties)

| Permission | Owner | Admin | Property Manager | Leasing | Approver | Finance | Operations | Viewer |
|---|---|---|---|---|---|---|---|---|
| Operator profile, legal entity, bank accounts, KYB | ✓ | ✓ | | | | view | | |
| Members and roles | ✓ | ✓ | scoped | | | | | |
| Approval rules, contract templates, policies | ✓ | ✓ | scoped | | | | | |
| Create/edit properties and spaces, pricing | ✓ | ✓ | ✓ | ✓ (draft only) | | | | |
| Publish/unpublish listings | ✓ | ✓ | ✓ | | | | | |
| Calendar: block dates, holds | ✓ | ✓ | ✓ | ✓ | | | ✓ | view |
| Respond to enquiries, review proposals, message | ✓ | ✓ | ✓ | ✓ | view | | view | view |
| Draft and send quotes | ✓ | ✓ | ✓ | ✓ | | | | |
| Approve quotes above threshold | ✓ | ✓ | per rule | | ✓ | | | |
| Sign contracts (authorized signatory flag) | ✓ | ✓ if flagged | ✓ if flagged | | ✓ if flagged | | | |
| Payouts, invoices, tax documents, reports | ✓ | ✓ | view | | | ✓ | | |
| Review compliance docs, manage event-day ops, inspection | ✓ | ✓ | ✓ | ✓ | | | ✓ | |
| Raise damage claim, respond to disputes | ✓ | ✓ | ✓ | | | | ✓ | |
| Buy promoted listings | ✓ | ✓ | ✓ | | | ✓ | | |
| Analytics | ✓ | ✓ | scoped | scoped | scoped | ✓ | | scoped |
| Property "What's on" settings (venue approval required, display on property page) | ✓ | ✓ | ✓ | | | | | |
| Approve / request changes to public listings of events booked at the property | ✓ | ✓ | ✓ | ✓ | | | ✓ | |
| View registration and check-in counts for events at the property | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ |

An individual owner holds all venue permissions by default. Venues never see attendee personal data — only counts.

**Attendee permissions** (any logged-in user)

| Permission | Notes |
|---|---|
| Browse events and venues without login | Public pages |
| Register, buy (P2), manage own orders and passes | Login with email or phone OTP |
| Cancel own registration; request refund (P2) | Per listing policy |
| Transfer a pass to another user (P2) | If the listing allows it |
| Follow organizers and properties; save events | |
| Message an organizer about an event | Through Spot-In |
| Report an event or organizer | To Trust & Safety |
| Download or delete own personal data | §8 privacy |

**Spot-In internal roles**

| Role | Scope |
|---|---|
| Super Admin | Everything, including fee configuration and role management |
| Onboarding / Verification | KYB review, organizer verification, listing approval, quality checks |
| Trust & Safety | Content moderation of spaces and events, account suspension, fraud review, scam-event takedowns |
| Support | Read access to conversations, bookings, orders and passes on ticket; act-as with audit log |
| Finance | Payouts (venues and organizers), refunds, reconciliation, tax documents, holds on funds, PBJT rate tables |
| Disputes | Dispute case handling and decisions |
| Growth / Sales | Promoted listings and events, featured collections, venue and organizer acquisition CRM |

All internal actions are audit-logged; viewing private messages requires a linked support ticket or dispute.

---

## 5. Feature plan and phasing

### 5.1 Phase overview

| Phase | Theme | Indicative scope |
|---|---|---|
| **MVP** (Phase 1) | End-to-end request → quote → contract → escrowed payment → event → payout, for malls, groups and owners in Jabodetabek; public event listings, discovery, free RSVP and check-in | Modules M1–M22, M24–M26, M28–M33, M36 below |
| **Phase 2** | Growth, efficiency and paid ticketing | Promoted listings and events, interactive floor plans, calendar sync, responsiveness badges, advanced analytics, venue-rent e-Faktur via PJAP, crew/access passes, embeddable booking widget, roadshow (multi-booking) checkout, SEO collections, 360° tours; **paid ticketing (M34, M35, M37)**: ticket types and tiers, promo codes, all-in pricing, purchase limits and named tickets, virtual waiting room, rotating QR, transfers, wristband redemption, refunds, organizer payouts, PBJT; Wallet passes, recurring series, recommendations, attendee reviews, ticket widget |
| **Phase 3** | Scale and differentiation | AI-assisted replies and quote drafting, concierge sourcing, white-label mall portals, lead marketplace, vendor marketplace, instalments/BNPL, embedded event insurance, revenue-share pricing, public API; face-value resale via waitlist, presale lotteries, door/box-office sales, early ticket payouts, merchandise at checkout, applying ticket revenue to a venue balance, access-control hardware |

### 5.2 Module list (MVP unless marked)

| Module | Name | Section |
|---|---|---|
| M1 | Accounts, authentication and profiles | §7.1 |
| M2 | Organizations, teams and roles | §7.2 |
| M3 | Verification (KYC/KYB) | §7.3 |
| M4 | Properties and spaces (listings) | §7.4 |
| M5 | Pricing and rate cards | §7.5 |
| M6 | Availability calendar and holds | §7.6 |
| M7 | Search and discovery (spaces) | §7.7 |
| M8 | Shortlists and sharing | §7.8 |
| M9 | Events, enquiries and proposals | §7.9 |
| M10 | Messaging | §7.10 |
| M11 | Site visits | §7.11 |
| M12 | Quotes, negotiation and approvals | §7.12 |
| M13 | Contracts, e-signature and e-meterai | §7.13 |
| M14 | Payments, deposits and escrow | §7.14 |
| M15 | Invoices, tax documents and withholding | §7.15 |
| M16 | Payouts and settlement | §7.16 |
| M17 | Event workspace and compliance documents | §7.17 |
| M18 | Changes, cancellations and refunds | §7.18 |
| M19 | Inspections, damage claims and disputes | §7.19 |
| M20 | Reviews and ratings | §7.20 |
| M21 | Notifications | §7.21 |
| M22 | Dashboards, pipeline and analytics | §7.22 |
| M23 | Promoted listings and events (P2) | §7.23 |
| M24 | Spot-In admin back office | §7.24 |
| M25 | Content, SEO and localization | §7.25 |
| M26 | Help and support | §7.26 |
| M27 | Phase 2–3 extensions | §7.27 |
| M28 | Event listings (public event pages) | §7.28 |
| M29 | Event discovery | §7.29 |
| M30 | Registration and RSVP | §7.30 |
| M31 | Passes and tickets | §7.31 |
| M32 | Check-in and entry | §7.32 |
| M33 | Attendee communications, audience and event analytics | §7.33 |
| M34 | Paid ticketing: ticket types, pricing and on-sale (P2) | §7.34 |
| M35 | Ticket orders, payments, refunds and transfers (P2) | §7.35 |
| M36 | Event trust, safety and moderation | §7.36 |
| M37 | Ticketing finance: payouts, PBJT and statements (P2) | §7.37 |

---

## 6. User flows

### 6.1 Venue onboarding (mall group)

1. Dewi signs up with a work email → verifies email and phone (OTP via WhatsApp/SMS).
2. Chooses **"I list spaces"** → operator type **Company / Group** → enters legal entity name, NIB, NPWP, address, PIC.
3. Uploads KYB documents (NIB/OSS printout, NPWP, deed/akta + SK Kemenkumham, KTP of director, proof of authority to rent each property, e.g., management agreement).
4. Adds payout bank account → account-name check through the payment provider.
5. Invites team: Budi (Leasing, scoped to Mall A and B), Wati (Finance, operator-wide), Arif (Approver, operator-wide, signatory).
6. Configures approval rule: quotes above Rp 150,000,000 or discount > 15% need Approver sign-off.
7. Uploads default contract template variables and house rules; sets default cancellation policy; turns on **"Approve public event pages for events at our properties"**.
8. Creates Property "Mall A" → address, map pin, operating hours, floor plans per level, loading dock info, house rules, required documents.
9. Creates Spaces: "Main Atrium" (parent) with children "Main Atrium – Half East" and "Half West"; "Booth Spot L1-07"; "Rooftop Parking P6".
10. Sets rate cards (weekday/weekend/peak season), setup/dismantle day rates, add-ons (electricity per kVA, extra security, cleaning).
11. Submits for review → Spot-In verification approves KYB and listings (or requests changes) → listings go live; "Verified" badge shown.

Individual owner variant: steps 2–7 collapse into a short wizard (KTP + NPWP personal, one bank account, no team, default policies).

### 6.2 Organizer discovery → enquiry

1. Rina (no login needed) searches "Jakarta Selatan · Mall atrium · 12–14 Dec · 300 visitors · ≤ Rp 100 jt".
2. Filters: indoor, power ≥ 30 kVA, allows F&B sampling, loading dock. Toggles map view.
3. Opens a listing: gallery, floor-plan pin, specs, price guidance ("from Rp 25 jt/day"), calendar showing free/held/booked, house rules, required documents, cancellation policy, reviews.
4. Saves three spaces to shortlist "Client X Roadshow Dec" → shares a view-only link with her client.
5. Clicks **Send enquiry** → prompted to sign up / log in → creates **Event** "Client X Product Launch" (type, dates incl. setup/dismantle, expected attendance, budget, description, brand category).
6. Attaches proposal deck (PDF), booth layout and brand guideline; selects the three shortlisted spaces → **one enquiry fanned out to three venues**, each as a separate thread.
7. Sees status per venue (Sent → Viewed → Quoted / Declined / Expired), with each venue's response deadline.

### 6.3 Venue reviews enquiry → quote → approval

1. Budi gets a notification (email + WhatsApp + in-app). Opens the enquiry in the pipeline.
2. Reviews proposal: brand category vs tenant exclusivity, layout vs space limits. Can **Request more info**, **Decline** (reason required), **Propose site visit**, or **Create quote**.
3. Optionally places a **tentative hold** on the dates (first option, expires in 5 days by default).
4. Builds the quote from a template: space rental per day × days, setup day at 50%, electricity 40 kVA, security 2 guards × 4 shifts, service charge, PPN, deposit 50% due in 3 days, balance due 14 days before event, refundable security deposit Rp 10 jt, validity 7 days, special terms.
5. Quote total exceeds the approval threshold → status **Pending approval** → Arif approves in one click (or rejects with comment) → quote is sent.
6. Rina sees the quote, can **Accept**, **Request revision** (comment per line), or **Decline**. Revisions create new versions; old versions are kept read-only.
7. Rina compares quotes from three venues side by side (normalized total per day, inclusions, deposit terms, cancellation).

### 6.4 Accept → contract → deposit → confirmed

1. Rina accepts version 2 of Mall A's quote. System re-checks availability and converts any tentative hold into a **booking hold** that blocks the dates until the deposit deadline.
2. Contract is generated from Mall A's template, filled with parties, event, schedule, price breakdown, payment schedule, house rules, cancellation and damage terms.
3. Signing order: organizer signatory → venue signatory. Each signs with certified e-signature (identity verified at first signing). E-meterai is affixed automatically when the document value meets the stamp-duty threshold.
4. Deposit invoice issued; Rina's company pays via BCA virtual account (or card/e-wallet/QRIS). Funds land in escrow.
5. When contract is fully signed **and** deposit paid → booking **Confirmed**; calendar shows booked; competing enquiries for overlapping dates are notified the dates are no longer available; contact details unmasked. The booking workspace offers **"Publish this event"** (§6.11).
6. If either step misses its deadline → booking lapses, hold released, both parties notified.

### 6.5 Pre-event operations

1. Booking workspace opens with a checklist from the property's required documents: event permit (e.g., police crowd permit where applicable), liability insurance, final layout/booth design, rundown, vendor list, crew list with IDs, vehicle list for load-in, safety plan, content/branding for approval.
2. Rina uploads items; Mall A operations reviews each (Approve / Request changes) before its due date.
3. Balance invoice is issued automatically (e.g., 14 days before event) with reminders; the organizer's finance user pays and, if the company withholds PPh 4(2), uploads the withholding slip (bukti potong).
4. Change requests (extra day, more power) go through a quote amendment → approval → sign addendum → pay difference.
5. Five days before: system checks all mandatory items approved and balance paid; flags blockers to both sides and Spot-In ops. If the event is published, Mall A operations also sees current registrations against the space's capacity.

### 6.6 Event day and post-event

1. Check-in: venue ops records handover (photos, meter readings, condition notes) — organizer acknowledges in-app.
2. Event runs; attendee check-ins (§6.15) feed live head-counts to both sides; issues logged in the booking timeline.
3. Check-out: venue ops records handover-back condition (photos).
4. **Claim window** (default 72 hours after dismantle end): venue can raise a damage/overtime claim against the security deposit with evidence; organizer can accept or dispute.
5. No claim (or claim resolved) → security deposit refunded to organizer; rental funds released to venue minus commission per payout schedule.
6. Both parties are invited to review; reviews publish when both have submitted or after 14 days.

### 6.7 Cancellation by organizer

1. Rina requests cancellation, chooses reason.
2. System shows the refund computed from the contract's cancellation policy tiers and what the venue keeps; Spot-In service fee refund rule shown. If the event has a published listing, the system shows how many registrants (and, P2, ticket orders) will be notified and refunded.
3. On confirmation: booking **Cancelled by organizer**, refund issued to original method (card/e-wallet) or to a verified bank account (VA/transfer payments), calendar freed, venue paid its retained share at next payout. Rina must also cancel or move the public listing (§6.21).

### 6.8 Cancellation by venue

1. Venue must provide reason; system warns of penalties.
2. Organizer receives a full refund of everything paid (including Spot-In fee); Spot-In ops is alerted to help re-accommodate (suggest similar available spaces).
3. Venue penalty per policy (fee, ranking demotion, review allowed by organizer, suspension on repeat).
4. Any published listing for the booking moves to **Venue change pending** (§6.21).

### 6.9 Dispute

1. Either party opens a dispute on a booking (claims, service not as described, no-show, access denied).
2. Funds in scope are frozen. Each party submits statement and evidence within 3 business days.
3. Spot-In Disputes reviews, may message both, and records a decision (release, partial refund, full refund, claim approved amount). Decision executes payments automatically and is logged.

### 6.10 Promoted listing purchase (Phase 2)

1. Budi opens Promote → selects spaces, cities/categories, date range, daily budget or fixed package. (Organizers follow the same flow to promote an event listing.)
2. Pays from card/VA or adds to monthly invoice (approved operators).
3. Sponsored badge appears in eligible results; performance dashboard shows impressions, clicks, enquiries (or registrations), cost per enquiry (or registration).

### 6.11 Organizer publishes an event booked on Spot-In

1. In the confirmed booking workspace, Rina clicks **Publish this event**. A listing draft is created from the Event: title, dates (event days only, not setup/dismantle), venue, space, address, map and floor-plan pin, capacity ceiling from the space's layout capacity.
2. She adds a cover image, description (ID/EN), category "Product launch / activation", age rating "All ages", tags, FAQ and house rules (pulled from the property).
3. Registration: **Free RSVP**, capacity 300 per day across two sessions, +1 guest allowed, two custom questions, terms acceptance. (Before Phase 2 a paid event can instead set **External tickets** with a link.)
4. Visibility **Public**, publish scheduled for Monday 10:00, registration closes when full or 2 hours before the session.
5. Mall A requires approval of public pages → listing goes to **Pending venue approval**; Budi checks brand/content against mall guidelines and approves (or requests changes with comments) within 2 business days.
6. At the scheduled time the listing is **Published**: it appears in event search, on Mall A's "What's on" section, and on Rina's organizer profile; followers of the organizer and of Mall A are notified.

### 6.12 Organizer publishes an event at an external venue

1. Sari's organization is verified (Tier 1 identity or Company tier). She creates a new Event and chooses **Venue not booked on Spot-In**.
2. Enters the venue name and picks the address through map search; sets capacity; attests she has the right to hold the event there and the permits it requires.
3. As her first three listings are reviewed before publishing (§7.36), the listing goes to Trust & Safety review (target 1 business day), then publishes without the "Venue booked on Spot-In" badge.

### 6.13 Attendee discovers an event and registers

1. Maya opens Spot-In on her phone (no login) → **Events** tab → "This weekend · Near me". Filters: Free, Workshops & classes, within 10 km. Switches to map view.
2. Opens a listing: date, venue with map and directions, organizer card with Verified badge, spots left, what to bring, house rules.
3. Taps **Register** → enters phone → WhatsApp OTP → name → answers the organizer's questions → adds one guest → accepts terms.
4. Confirmation screen with her pass (QR), **Add to calendar**, share; she also receives the pass by email and a WhatsApp link.
5. Reminders arrive 24 hours and 2 hours before, with directions and the entry gate.
6. She can cancel her spot until the cut-off; her spot goes to the waitlist.

### 6.14 Approval-required registration and waitlist

1. A workshop has 40 seats and requires approval. Maya applies; her status is **Pending**; she has no pass yet.
2. The organizer reviews applicants (answers, history) and approves 40; the rest are declined or moved to the waitlist with a message.
3. When an approved attendee cancels, the first person on the waitlist is offered the spot with a claim window (default 12 hours); if unclaimed it moves to the next. Offers stop 2 hours before start.

### 6.15 Event-day check-in

1. Rina invites Joko as **Check-in staff** for the listing by phone number; Joko opens the link, logs in with OTP and the scanner downloads an encrypted guest manifest for offline use.
2. Joko scans passes at Gate 1: green **Valid** (name, ticket type, guest count) or red with a reason (**Already checked in at 10:42 Gate 2**, **Wrong session**, **Cancelled**, **Pending approval**).
3. Without a QR, he searches by name or last 4 digits of the phone and checks the person in manually.
4. Walk-ins are registered at the door if capacity remains and the listing allows it.
5. Rina and Mall A operations see live counts by gate and time; check-ins sync when the device reconnects.

### 6.16 Paid ticket purchase (Phase 2)

1. Maya opens a concert listing; prices are shown all-in ("Rp 350.000 incl. tax and fees", breakdown on tap).
2. Picks 2 × Festival tier (limit 4 per account); the event requires named tickets, so she enters each attendee's name and NIK.
3. Applies promo code; tickets are held for 10 minutes while she pays by QRIS, e-wallet, VA or card.
4. On payment confirmation the order is **Paid**: two passes are issued in her account (one forwarded to her friend by transfer); receipts emailed.
5. The rotating QR appears in the app from 24 hours before doors; screenshots will not scan.
6. If she can't go, she transfers a ticket before the transfer lock or requests a refund if the listing's policy allows.

### 6.17 High-demand on-sale with a virtual waiting room (Phase 2)

1. The organizer enables the waiting room (or Spot-In ops forces it based on expected demand) and announces the on-sale time.
2. The waiting room opens 30 minutes before sale; logged-in users with verified phone join; one session per account.
3. At on-sale time, everyone already waiting is put in random order; later arrivals join at the back. Each user sees position and estimated wait.
4. Admitted users get a signed admission token and a purchase window (e.g., 10 minutes); limits per account and per NIK apply; bots are challenged.
5. When inventory is sold out the waiting room closes and remaining users are offered the waitlist.

### 6.18 Wristband redemption (Phase 2)

1. For festival-style events, the organizer schedules redemption sessions (place, dates, hours) and sets "redeem before entry".
2. Attendees book or walk into a session; staff scan the pass and check the ID for named tickets; the pass is marked **Redeemed** with the wristband serial.
3. At the gate, staff check wristbands; unredeemed passes are directed to the on-site redemption desk.

### 6.19 Event cancelled or postponed

1. The organizer chooses **Cancel event** (reason required) or **Postpone** (new date or "date to be announced").
2. MVP (free): all registrants are notified by email, WhatsApp and in-app; passes are voided (cancel) or carried to the new date (postpone) with an option to cancel.
3. P2 (paid): on cancellation all orders are refunded in full automatically (face value, tax and Spot-In fee); on postponement tickets remain valid and buyers get a refund window (default 14 days).
4. Linked bookings are not changed automatically; the organizer is pointed to the booking's change/cancellation flows (§6.7, M18).

### 6.20 Ticket payout to the organizer (Phase 2)

1. Ticket revenue is held in escrow, recorded per listing and order.
2. T+3 business days after the last session ends, with no open dispute or fraud hold, the payout is computed: face value + PBJT collected − refunds − fees the organizer absorbs − reserve for new organizers.
3. Payout is sent to the organizer's verified bank account with a statement (sales by ticket type, promos, refunds, PBJT collected); the reserve is released after 14 days.

### 6.21 Venue booking cancelled or changed while a listing is live

1. When the linked booking is cancelled (by either side) or lapses, the listing switches to **Venue change pending**: registration and sales are paused, the page shows "Details being updated" and the venue's name and floor-plan pin are hidden.
2. The organizer has 72 hours to move the listing to a new venue (a new Spot-In booking or an external venue) or cancel it; registrants are notified only when the outcome is known. If nothing is done, the listing is cancelled automatically (§6.19).
3. When booking dates change through an addendum, sessions outside the new booked dates are flagged and the listing cannot be republished until they are fixed.

---

## 7. Functional requirements

Requirement IDs use `FR-<module>-<nn>`. Priority: **MVP**, **P2**, **P3**. "Venue" means the venue operator's authorized members; "organizer" means the organizer organization's authorized members; "attendee" means any user acting on their own orders and passes.

### 7.1 M1 — Accounts, authentication and profiles

| ID | Requirement | Priority |
|---|---|---|
| FR-M1-01 | Sign up / log in with email + password, Google, or phone (WhatsApp/SMS OTP). | MVP |
| FR-M1-02 | Email verification and phone verification (OTP) required before sending an enquiry, quoting, or paying. Attendees need one verified channel (phone or email) to register; paid ticket purchases (P2) need a verified phone. | MVP |
| FR-M1-03 | Optional 2FA (TOTP or OTP); **required** for venue Owner/Admin/Finance, organizer Owner/Finance once paid ticketing is enabled (P2), and all internal roles. | MVP |
| FR-M1-04 | Password reset, session management (list and revoke devices), auto-logout after inactivity (configurable). | MVP |
| FR-M1-05 | Profile: name, photo, job title, phone, language (ID/EN), home city (for event discovery), notification preferences. | MVP |
| FR-M1-06 | On first login, user chooses intent (find events / book spaces / list spaces / several); can add the others later. Attendee-only users are never asked for organization details. | MVP |
| FR-M1-07 | Organization switcher for users with multiple memberships; current context always visible; "Personal" context for attendee activity. | MVP |
| FR-M1-08 | Account deletion request flow (blocked while the user is the sole Owner of an org with active bookings or live listings; attendee with upcoming passes is warned that passes will be cancelled; see §12). | MVP |
| FR-M1-09 | Consent capture at sign-up: Terms, Privacy Policy, marketing opt-in (separate, unticked by default); stored with version and timestamp. | MVP |
| FR-M1-10 | Quick attendee account: registering for an event creates an account from name + verified phone or email in one step, without a password (passwordless login). | MVP |

### 7.2 M2 — Organizations, teams and roles

| ID | Requirement | Priority |
|---|---|---|
| FR-M2-01 | Create organizer org (individual or company) and venue operator (individual, company, group). | MVP |
| FR-M2-02 | Org profile: legal name, brand name, logo, address, NPWP, NIB (companies), billing contact, default billing entity for invoices; public organizer profile fields (display name, bio, social links, cover) used on event pages. | MVP |
| FR-M2-03 | Invite members by email/phone with a role; invite expires after 7 days; resend/revoke. | MVP |
| FR-M2-04 | Venue roles can be scoped to all properties or selected properties. | MVP |
| FR-M2-05 | "Authorized signatory" flag per member, with signing limit (optional) and supporting authority document. | MVP |
| FR-M2-06 | Quote approval rules (venue): conditions on total amount, discount %, non-standard terms, specific spaces; approver role or named approvers; sequential or any-one approval. | MVP |
| FR-M2-07 | Organizer spending rule (optional): quotes above an amount require Admin/Owner to accept; refunds above an amount require Owner/Finance (P2). | MVP |
| FR-M2-08 | Ownership transfer; at least one Owner must always exist. | MVP |
| FR-M2-09 | Member removal reassigns their open enquiries/quotes/bookings/listings to a chosen member. | MVP |
| FR-M2-10 | Org-level audit log of membership, role, rule and bank-account changes, and attendee-data exports. | MVP |
| FR-M2-11 | Multiple billing entities per organizer org (e.g., EO billing on behalf of different client companies). | P2 |
| FR-M2-12 | Per-listing Check-in staff invitations by phone/email with an access window (default: 24 h before first session to 24 h after last session); revocable; no other org access. | MVP |
| FR-M2-13 | Co-host organizations on a listing: a second organizer org shown on the page and given Planner-level access to that listing only. | P2 |

### 7.3 M3 — Verification (KYC/KYB)

| ID | Requirement | Priority |
|---|---|---|
| FR-M3-01 | Venue KYB: company documents (NIB, NPWP, deed + ministry approval, director KTP) or individual (KTP, NPWP), plus **proof of right to rent** per property (title, lease, or management agreement). | MVP |
| FR-M3-02 | Spot-In verification queue with checklist, notes, request-changes, approve/reject; SLA target 2 business days. | MVP |
| FR-M3-03 | Listings cannot be published and quotes cannot be sent until the operator's KYB and the property's right-to-rent are approved. | MVP |
| FR-M3-04 | Payout bank account verification (account name match through payment provider); changes require 2FA + re-verification and trigger a 48-hour payout hold. Applies to organizer payout accounts for ticket revenue (P2) too. | MVP |
| FR-M3-05 | Organizer verification tiers: Tier 0 (email+phone) can enquire and publish free events **only at venues booked on Spot-In**; Tier 1 (identity verified via e-signature provider at first signing, or a standalone ID + liveness check) can sign and publish events at external venues; Company tier (NPWP/NIB) unlocks invoice/bank-transfer terms and company tax invoices. Paid ticketing (P2) requires Tier 1 or Company tier plus a verified payout account. | MVP |
| FR-M3-06 | NPWP validation via a tax validation service (PJAP/KSWP) where available; manual fallback. | P2 |
| FR-M3-07 | Re-verification on change of legal entity, director, or bank account; document expiry reminders. | MVP |
| FR-M3-08 | "Verified venue" badge on listings; "Verified organizer" badge on organizer profiles and event pages (Tier 1 or Company). | MVP |

### 7.4 M4 — Properties and spaces (listings)

**Property** = a physical site (mall, venue building, outdoor site). **Space** = a bookable unit within a property.

| ID | Requirement | Priority |
|---|---|---|
| FR-M4-01 | Property fields: name, type (mall, hotel/venue building, convention centre, standalone hall, outdoor site, other), address, map pin, city/area, **time zone (WIB/WITA/WIT)**, operating hours, public transport and parking notes, loading dock details, house rules, photos, floor plans per level, nearby/footfall info (optional, e.g., monthly visitors self-declared). | MVP |
| FR-M4-02 | Space types: atrium, booth/promo spot, pop-up unit (casual leasing), event hall/ballroom, function/meeting room, outdoor area (plaza, parking lot, rooftop, garden), other. | MVP |
| FR-M4-03 | Space fields: name, type, level/zone, floor-plan pin (x,y on level image), area (m²), dimensions, ceiling height, capacity by layout (standing, theatre, classroom, banquet, booth count), floor load (kg/m²), power available (kVA, phases, socket types), water access, rigging points, indoor/outdoor/covered, natural light, AV included, Wi-Fi, accessibility, noise limits, permitted activities (selling, F&B sampling, cooking/open flame, live music, alcohol, vehicles/display cars, **ticketed admission**), prohibited categories, min/max booking duration, setup/dismantle allowed hours (e.g., 22:00–08:00 for malls). | MVP |
| FR-M4-04 | Media: up to 30 photos (auto-resized, WebP), cover photo, captions; up to 3 videos (link or upload); downloadable spec sheet PDF; past-event photos tagged as such. | MVP |
| FR-M4-05 | 360° photos / virtual tour embed. | P2 |
| FR-M4-06 | **Hierarchical spaces**: a space can have child spaces (e.g., Main Atrium → Half East / Half West). Booking a parent blocks all children; booking a child blocks the parent; siblings are independent. Up to 3 levels. | MVP |
| FR-M4-07 | Shared-resource conflicts (P2): mark spaces that cannot be used simultaneously (e.g., two atriums sharing one sound limit). | P2 |
| FR-M4-08 | Required documents per property or space (configurable list with due-date offset, e.g., insurance due 14 days before event). | MVP |
| FR-M4-09 | Enquiry questions per space (custom questions the organizer must answer, e.g., "Will you sell products?"). | MVP |
| FR-M4-10 | Listing status: Draft → In review → Published → Unpublished / Suspended. Edits to published listings that affect price or capacity go live immediately; edits to photos/description of an approved listing go live immediately but are sampled for moderation. | MVP |
| FR-M4-11 | Duplicate space (copy settings to a new space); bulk edit pricing across spaces. | MVP |
| FR-M4-12 | Listing completeness score with hints. | MVP |
| FR-M4-13 | Bilingual listing content (ID/EN) with optional machine translation clearly labeled. | MVP |
| FR-M4-14 | Interactive floor plan: clickable spaces per level showing availability for selected dates; in P2 also shows today's public events on the level for shoppers. | P2 |
| FR-M4-15 | Property "What's on" settings: show published events at the property on the public property page (default on); require venue approval of public event pages linked to bookings at the property (default on for malls); approval SLA; optional brand-guideline PDF shown to organizers when they create a listing. | MVP |

### 7.5 M5 — Pricing and rate cards

| ID | Requirement | Priority |
|---|---|---|
| FR-M5-01 | Pricing units per space: per hour, per half-day, per day, per week, per month (pop-ups), per m² per day; minimum booking (e.g., 2 days) and minimum spend. | MVP |
| FR-M5-02 | Rate variations: weekday/weekend, date-range seasons (e.g., Ramadan/Lebaran, Christmas–New Year, Imlek, school holidays), custom date overrides. | MVP |
| FR-M5-03 | Setup and dismantle day rates (fixed or % of event-day rate). | MVP |
| FR-M5-04 | Add-on catalog per property: electricity (per kVA per day), extra security, cleaning, extra hours, sound/LED, parking vouchers, storage, internet; each with unit, price, taxable flag, mandatory/optional. | MVP |
| FR-M5-05 | Service charge and taxes configuration: PPN applicable (venue is PKP or not), service charge %, prices entered tax-exclusive or inclusive. | MVP |
| FR-M5-06 | Public price display options: show "from" price, show full rate card, or "price on request" (still shows a minimum to set expectations — required field "indicative from price"). | MVP |
| FR-M5-07 | Quick estimate on listing: given dates and add-ons, show an indicative total (labeled non-binding). | MVP |
| FR-M5-08 | Discount rules: multi-day / long-stay, early booking, repeat organizer, non-profit. | P2 |
| FR-M5-09 | Packages (bundled space + add-ons at one price). | P2 |
| FR-M5-10 | Revenue-share or hybrid pricing (fixed + % of sales or of ticket revenue) for pop-ups and ticketed events. | P3 |

### 7.6 M6 — Availability calendar and holds

| ID | Requirement | Priority |
|---|---|---|
| FR-M6-01 | Calendar per space (day and hour granularity) showing: Available, Tentative hold (1st/2nd option), Booking hold (awaiting contract/deposit), Booked, Blocked (maintenance, mall's own event, tenant use), Closed (outside operating days). | MVP |
| FR-M6-02 | Public calendar shows only Available vs Unavailable (holds shown as "Limited availability – enquire"). | MVP |
| FR-M6-03 | Venue can block dates with a private reason; recurring blocks (e.g., every Monday). | MVP |
| FR-M6-04 | **Tentative holds**: venue can place a 1st-option hold for an enquiry with an expiry (default 5 days, max 14). A 2nd-option hold can queue behind it and auto-promotes if the first lapses; organizer and venue are notified. | MVP |
| FR-M6-05 | **Booking hold** created on quote acceptance; blocks the slot exclusively until the contract + deposit deadline. | MVP |
| FR-M6-06 | Booked state on confirmation; block propagates to parent/child spaces (FR-M4-06). Setup and dismantle windows are part of the booked slot. | MVP |
| FR-M6-07 | Concurrency: availability is re-validated atomically when a hold is placed, a quote is accepted, and a booking is confirmed; conflicting operations fail with a clear error (§12). | MVP |
| FR-M6-08 | Buffer time between bookings (configurable, e.g., 4 hours). | MVP |
| FR-M6-09 | Portfolio calendar across properties/spaces with filters; booked slots with a published listing show the listing title and registration count. | MVP |
| FR-M6-10 | iCal export feed per space; Google/Outlook two-way sync for blocks. | P2 |

### 7.7 M7 — Search and discovery (spaces)

| ID | Requirement | Priority |
|---|---|---|
| FR-M7-01 | Public, no-login search with: location (city, area, near a point/"near me"), space type, event type (exhibition, product launch, bazaar, concert, wedding, seminar, roadshow, pop-up store, sampling, community), dates (with setup/dismantle), attendance/booth count, area range, budget range, indoor/outdoor. | MVP |
| FR-M7-02 | Advanced filters: power (kVA), floor load, ceiling height, loading dock, allows F&B / selling / cooking / live music / vehicles / ticketed admission, accessibility, verified only, response time, rating. | MVP |
| FR-M7-03 | Results in list and map view; sort by relevance, price (indicative), rating, distance, newest. | MVP |
| FR-M7-04 | When dates are given, unavailable spaces are hidden by default (toggle to show "limited availability"). | MVP |
| FR-M7-05 | Relevance ranking uses text match, filters match, listing quality, verification, response rate, conversion, reviews; sponsored results are marked and capped (P2, M23). | MVP |
| FR-M7-06 | Property page lists all its spaces and its "What's on" events (FR-M4-15); "similar spaces nearby" on each listing. | MVP |
| FR-M7-07 | Saved searches with email alerts for new matching spaces. | P2 |
| FR-M7-08 | SEO landing pages (city × space type × event type) and curated collections. | P2 |
| FR-M7-09 | Recently viewed. | MVP |
| FR-M7-10 | Typo-tolerant, bilingual search (e.g., "atrium mall jaksel" ≈ "mall atrium Jakarta Selatan"). | MVP |
| FR-M7-11 | One search entry point with two modes, **Events** (default for visitors without an organizer org) and **Spaces** (default for organizers and venues); the last mode used is remembered; results of the two kinds are never mixed. | MVP |

### 7.8 M8 — Shortlists and sharing

| ID | Requirement | Priority |
|---|---|---|
| FR-M8-01 | Save spaces to named shortlists (requires login; guest favourites kept in browser and merged on login). | MVP |
| FR-M8-02 | Share a shortlist via link (view-only, no login), optionally with notes and indicative prices; link can be revoked. | MVP |
| FR-M8-03 | Shortlist collaborators within the organizer org; comments and thumbs-up per space (for client/manager sign-off). | MVP |
| FR-M8-04 | Send enquiry to all/selected spaces in a shortlist (M9). | MVP |
| FR-M8-05 | Quote comparison table for spaces in the same event: total, per-day, inclusions, deposit %, payment deadlines, cancellation tier summary, venue rating, response time. Exportable to PDF. | MVP |

### 7.9 M9 — Events, enquiries and proposals

| ID | Requirement | Priority |
|---|---|---|
| FR-M9-01 | **Event** (project) object owned by an organizer org: name, type, brand/client name, category (for venue exclusivity checks), description, expected attendance, event dates/times, setup and dismantle windows, budget range, required facilities, attachments, **venue source** (Spot-In booking / external / not decided). | MVP |
| FR-M9-02 | **Proposal pack** attachments: deck, layout/booth design, brand guidelines, past-event photos, company profile (PDF/JPG/PNG, max 25 MB each, 10 files). Stored once per event and shared with each enquired venue. | MVP |
| FR-M9-03 | Enquiry = Event × Space. Creating an enquiry for N spaces creates N independent threads (max 10 per send; max 30 open enquiries per event to limit spam). | MVP |
| FR-M9-04 | Enquiry form pre-fills from the event; organizer answers space-specific questions (FR-M4-09); organizer indicates whether the event will be public and ticketed (shown to the venue). | MVP |
| FR-M9-05 | Pre-submit checks: dates within operating rules, duration within min/max, attendance ≤ capacity, required facilities available; warnings (not blocks) when out of range so the venue can still decide. | MVP |
| FR-M9-06 | Enquiry statuses: Submitted → Viewed → Info requested ⇄ Responded → Quoted → (Accepted → Booking) / Declined / Expired / Withdrawn / Lost (another venue booked). | MVP |
| FR-M9-07 | **Response deadline**: venue must reply (message, request info, quote or decline) within 2 business days (configurable); reminders at 24 h and 4 h before; on expiry the enquiry is marked Expired and counts against response rate. | MVP |
| FR-M9-08 | Decline requires a reason (dates unavailable, category conflict, capacity, proposal not suitable, other) shown to organizer; optional "suggest other dates/space" with a link. | MVP |
| FR-M9-09 | Organizer can edit the event; changes notify all enquired venues and mark open quotes "Event changed – review". | MVP |
| FR-M9-10 | Organizer can withdraw an enquiry; when they accept one venue's quote for overlapping dates, other enquiries in the same event get a prompt to mark as Lost (with optional feedback to venues). | MVP |
| FR-M9-11 | Venue internal notes and tags on enquiries (not visible to organizer). | MVP |
| FR-M9-12 | Roadshow: one event with multiple date/venue legs, combined quote comparison and checkout; each leg can be a session of one public listing. | P2 |

### 7.10 M10 — Messaging

| ID | Requirement | Priority |
|---|---|---|
| FR-M10-01 | Threaded messaging per enquiry/booking between organizer members and venue members; real-time updates; read receipts at thread level. | MVP |
| FR-M10-02 | Attachments (PDF, images, DOCX, XLSX; 25 MB each), image previews, virus scanning. | MVP |
| FR-M10-03 | **Contact masking** before confirmation: emails, phone numbers, WhatsApp links and bank account numbers are detected and masked in messages and attachments' text; sender sees a notice. After confirmation, PIC phone numbers are shown in the booking. | MVP |
| FR-M10-04 | Saved replies/templates for venues; variables (organizer name, space, dates). | MVP |
| FR-M10-05 | Auto-acknowledgement message when an enquiry arrives (venue-configurable text). | MVP |
| FR-M10-06 | Email reply-to: replying to a notification email posts into the thread. | P2 |
| FR-M10-07 | Unified inbox with filters (unreplied, awaiting me, by property, by member); organizers also see attendee questions per listing (FR-M33-05). | MVP |
| FR-M10-08 | Report message / block user (sends to Trust & Safety). | MVP |
| FR-M10-09 | Messages are retained with the booking record; not editable after 10 minutes; deletion is soft (kept for disputes). | MVP |

### 7.11 M11 — Site visits

| ID | Requirement | Priority |
|---|---|---|
| FR-M11-01 | Venue publishes site-visit slots per property (days, times, duration, max visitors) or handles requests ad hoc. | MVP |
| FR-M11-02 | Organizer requests a slot from an enquiry; venue confirms/reschedules; calendar invite (.ics) sent. | MVP |
| FR-M11-03 | Reminders 24 h and 2 h before; mark as attended/no-show; reschedule/cancel with reason. | MVP |

### 7.12 M12 — Quotes, negotiation and approvals

| ID | Requirement | Priority |
|---|---|---|
| FR-M12-01 | Quote builder: pre-filled from rate card for the enquiry's dates (event, setup, dismantle days), editable line items (space rental, add-ons, custom items), quantity × unit price, per-line discount, service charge, PPN, organizer service fee (displayed as Spot-In fee), refundable security deposit (separate line, not taxed, not commissionable). | MVP |
| FR-M12-02 | Payment schedule on the quote: deposit % or amount and due offset (e.g., 3 days after acceptance), balance due offset (e.g., 14 days before event start), or single full payment; min deposit set by platform (e.g., 20%) and policy validation (balance must be due ≥ 3 days before event). | MVP |
| FR-M12-03 | Terms on quote: validity date (default 7 days), cancellation policy (choose from venue's policies), special terms (free text, flagged to approvers as non-standard), inclusions/exclusions, whether public listing/ticketed admission is permitted and any maximum admitted capacity. | MVP |
| FR-M12-04 | Quote templates per space/property. | MVP |
| FR-M12-05 | Internal approval workflow per rules (FR-M2-06): Draft → Pending approval → Approved → Sent; approver can edit or reject with comment; the approval trail is attached to the quote. | MVP |
| FR-M12-06 | Organizer actions: Accept, Request revision (general comment + line comments), Decline (reason). | MVP |
| FR-M12-07 | Versioning: each sent revision is a new immutable version; organizer sees a diff from the previous version. Only the latest version can be accepted. | MVP |
| FR-M12-08 | Quote expiry: at validity end the quote expires; tentative hold (if any) follows its own expiry; venue can re-issue. | MVP |
| FR-M12-09 | Quote PDF download (branded with venue logo and Spot-In reference), bilingual. | MVP |
| FR-M12-10 | Accepting a quote requires: organizer Tier 1 or company verification for amounts above a threshold, billing entity selected, withholding preference (see M15), acceptance of Spot-In booking terms. | MVP |
| FR-M12-11 | On acceptance, availability is re-validated atomically (FR-M6-07); on conflict, acceptance fails and both parties are told (§12). | MVP |
| FR-M12-12 | AI-assisted quote drafting from the enquiry (suggests rate card lines and add-ons). | P3 |

### 7.13 M13 — Contracts, e-signature and e-meterai

| ID | Requirement | Priority |
|---|---|---|
| FR-M13-01 | Contract templates: Spot-In standard short-term space rental agreement (bilingual ID/EN; Indonesian prevails) with venue-editable sections (house rules, special terms, liability, insurance, public listing and ticketing terms) — legal review required (§15). Venues on Group plans may upload their own template with merge fields after Spot-In legal approval. | MVP |
| FR-M13-02 | Auto-generate the contract PDF from accepted quote version + event + parties + payment schedule + cancellation policy + required documents. | MVP |
| FR-M13-03 | Certified e-signature through an Indonesian certified provider (PSrE) via API; signer identity verification (KTP + selfie liveness) on first use; signing order organizer → venue (configurable); signing links expire with the booking-hold deadline. | MVP |
| FR-M13-04 | E-meterai affixed automatically when the document records a value at or above the stamp-duty threshold; meterai placed before signatures in the provider's prescribed order; cost recorded and charged per policy (§11). | MVP |
| FR-M13-05 | Contract statuses: Draft → Sent for signature → Partially signed → Fully signed → (Amended via addendum) / Voided. | MVP |
| FR-M13-06 | Addenda for approved changes (M18), signed the same way; contract history shows all versions. | MVP |
| FR-M13-07 | Signed documents stored immutably with hash and audit trail (who, when, IP, provider transaction ID); downloadable by both parties. | MVP |
| FR-M13-08 | Fallback: if e-sign provider is down, show status and allow retry; Spot-In ops can extend the deadline once. No wet-ink upload path in MVP. | MVP |

### 7.14 M14 — Payments, deposits and escrow

| ID | Requirement | Priority |
|---|---|---|
| FR-M14-01 | Payment methods: bank virtual accounts (BCA, Mandiri, BNI, BRI, Permata, others supported by provider), QRIS, e-wallets (OVO, DANA, ShopeePay, GoPay where available), credit/debit cards (3DS). The same methods serve ticket orders (P2, M35). | MVP |
| FR-M14-02 | Payment schedule executes per quote: deposit invoice on acceptance; balance invoice issued on its due-offset minus 7 days; security deposit collected with the balance (or with deposit, per venue setting). | MVP |
| FR-M14-03 | **Escrow**: all organizer payments (and, P2, attendee ticket payments) go to Spot-In's platform account at the licensed provider (or to a held sub-account), recorded per booking or per listing in an internal ledger; funds released per M16 and M37 rules. | MVP |
| FR-M14-04 | Invoice / bank-transfer for verified company organizers: invoice with unique VA per invoice (preferred) so payments auto-reconcile; manual bank transfer with proof upload only as a fallback with Spot-In Finance reconciliation. | MVP |
| FR-M14-05 | Payment deadlines with reminders (7, 3, 1 days and on due date); VA expiry aligned to deadline. | MVP |
| FR-M14-06 | Late payment: deposit missed → booking lapses (§6.4). Balance missed → venue chooses: extend once (up to 3 days) or cancel under the organizer-cancellation policy; Spot-In notifies both. | MVP |
| FR-M14-07 | Partial and over-payments on VA/transfer: VA amounts fixed (closed VA) to prevent mismatches; manual transfers that mismatch go to Finance exception queue. | MVP |
| FR-M14-08 | Payment status and receipts visible to organizer Finance/Owner; receipts emailed. | MVP |
| FR-M14-09 | Refunds to original method where supported; for VA/transfer, the payer provides a verified bank account (name check). | MVP |
| FR-M14-10 | Card chargeback handling: Finance notified, booking or order flagged, evidence pack (contract, messages, check-in records, pass scans) exportable. | MVP |
| FR-M14-11 | Instalments / BNPL for organizers. | P3 |
| FR-M14-12 | Payment provider abstraction so a second provider (e.g., Midtrans) can be added. | MVP (design) |

### 7.15 M15 — Invoices, tax documents and withholding

| ID | Requirement | Priority |
|---|---|---|
| FR-M15-01 | Each payment is backed by an invoice issued **on behalf of the venue** for the rental (venue's legal name, NPWP, address; Spot-In as payment agent) and a separate **Spot-In invoice** for the organizer service fee. | MVP |
| FR-M15-02 | Invoice numbering per issuer, sequential, gap-free; invoice PDF bilingual; cancellation via credit note, never deletion. | MVP |
| FR-M15-03 | Spot-In issues Faktur Pajak (via Coretax, through PJAP integration or Finance upload) for its own taxable fees: organizer service fee, venue commission and (P2) ticketing fee where the buyer requests one. | MVP |
| FR-M15-04 | Venue rental Faktur Pajak: in MVP the venue issues it in its own system and uploads the PDF/number to the booking (required field for PKP venues before final payout). In P2 Spot-In offers optional generation via PJAP integration on the venue's behalf. | MVP / P2 |
| FR-M15-05 | **PPh Final 4(2) withholding**: at quote acceptance, a company organizer declares whether it will withhold 10% on the rental. If yes, rental invoices show gross rent, PPN, PPh 4(2) withheld, and net payable; organizer must upload the withholding slip (bukti potong) for each payment within 30 days; the venue sees the slip in the booking. Rules and rates configurable by admin. | MVP |
| FR-M15-06 | Tax configuration per venue: PKP status, PPN rate mode (configurable rate/DPP rule), service charge, whether rent prices are entered tax-inclusive. | MVP |
| FR-M15-07 | Monthly statements for venues (bookings, gross, commission, withheld tax, payouts) and organizers (spend, tax paid, slips outstanding; P2 ticket sales — see M37); CSV/XLSX export. | MVP |
| FR-M15-08 | Spot-In commission invoice to venues (monthly or per payout) with Faktur Pajak; venues may withhold applicable tax on Spot-In's fee and upload slips. | MVP |

### 7.16 M16 — Payouts and settlement

| ID | Requirement | Priority |
|---|---|---|
| FR-M16-01 | Default release rule: rental funds (minus commission, minus any amounts subject to open claims/disputes) are released to the venue **T+2 business days after the booking's dismantle end** if no dispute is open. | MVP |
| FR-M16-02 | Trusted-venue rule (configurable per operator by Finance): release up to X% of the deposit at confirmation, remainder after event. Default X = 0. | MVP (config) |
| FR-M16-03 | Payout via provider disbursement to verified bank account; per-property payout account optional for groups. | MVP |
| FR-M16-04 | Payout batching: daily; payout statement per batch listing bookings, gross, commission, adjustments. Ticket payouts to organizers (P2) use the same batching with their own statements (M37). | MVP |
| FR-M16-05 | Security deposit returned to organizer after the claim window closes with no claim, or the undisputed remainder after a claim is resolved. | MVP |
| FR-M16-06 | Payout holds: KYB issue, bank change cooldown (48 h), missing venue Faktur Pajak for PKP venues (configurable), dispute, fraud flag; holds visible to venue Finance with reason. | MVP |
| FR-M16-07 | Ledger: double-entry internal ledger per booking and per listing (organizer paid, attendee paid, escrow, venue payable, organizer payable, commission, fees, tax, refunds, payouts) reconciled daily against provider reports; discrepancies raise Finance alerts. | MVP |

### 7.17 M17 — Event workspace and compliance documents

| ID | Requirement | Priority |
|---|---|---|
| FR-M17-01 | Each confirmed booking has a workspace: summary, schedule (setup/event/dismantle), contacts (PICs both sides, emergency), documents checklist, payment schedule, timeline of all actions, messages, and a **Public listing** panel (status, registrations vs capacity, link to M28). | MVP |
| FR-M17-02 | Document checklist generated from property/space required documents (e.g., event permit, liability insurance certificate, final layout, rundown, vendor list, crew list, vehicle list for load-in, safety/emergency plan, branding/content for approval) with due dates. | MVP |
| FR-M17-03 | Each item: upload (versions kept), status (Not started, Submitted, Changes requested, Approved, Waived), reviewer comments, validity date for expiring documents (e.g., insurance must cover event dates). | MVP |
| FR-M17-04 | Readiness indicator; automatic warnings at T-7 and T-3 days for missing mandatory items; venue can mark the booking "At risk"; warning when registrations exceed the admitted capacity agreed in the quote. | MVP |
| FR-M17-05 | Rundown builder (time, activity, PIC, notes) shareable as PDF. | MVP |
| FR-M17-06 | Crew/vehicle access passes with QR codes for security desks; bulk upload of crew list (reuses the pass and scanner of M31–M32). | P2 |
| FR-M17-07 | Check-in and check-out handover records: photos, meter readings, condition notes, signatures (in-app acknowledgement by both). | MVP |
| FR-M17-08 | Incident log during the event (time, description, photos). | MVP |

### 7.18 M18 — Changes, cancellations and refunds

| ID | Requirement | Priority |
|---|---|---|
| FR-M18-01 | Change request from either side: dates, times, space, add-ons, attendance, other. The venue responds with an amended quote (price difference) or rejection; on acceptance → addendum signature → payment of difference or refund of difference per policy. | MVP |
| FR-M18-02 | Date change requires availability re-check and creates a booking hold on new dates; old dates stay booked until the addendum is signed. Linked listings follow §6.21 step 3. | MVP |
| FR-M18-03 | Cancellation policies: Spot-In standard set (e.g., Flexible, Moderate, Strict, Non-refundable deposit) defined as tiers of days-before-event → % of rental refundable; venues pick per space and can define custom policies within platform limits. | MVP |
| FR-M18-04 | Organizer cancellation computes refund by policy at request time; shows breakdown before confirmation. | MVP |
| FR-M18-05 | Spot-In organizer service fee: refundable if the organizer cancels within a 24-hour grace period after confirmation (and ≥ 14 days before event); otherwise non-refundable; always refunded on venue cancellation. | MVP |
| FR-M18-06 | Venue cancellation: full refund to organizer; penalty to venue (fee and/or ranking impact); Spot-In ops rebooking assist flag; linked listing set to Venue change pending (§6.21). | MVP |
| FR-M18-07 | Force majeure (natural disaster, government restriction, venue closure by authorities): either side may request; Spot-In Disputes decides; default outcome full refund minus non-recoverable third-party costs, or free rescheduling within 6 months. | MVP |
| FR-M18-08 | No-show by organizer: treated as cancellation on the event day (0% refund under all standard policies unless venue waives). | MVP |
| FR-M18-09 | Refund execution status visible; refunds to bank accounts processed within 7 business days. | MVP |

### 7.19 M19 — Inspections, damage claims and disputes

| ID | Requirement | Priority |
|---|---|---|
| FR-M19-01 | Venue may file a claim within the claim window (default 72 h after dismantle end) for damage, overtime, extra cleaning, unpaid add-ons used; claim includes amount, description, evidence (photos, check-in/out records, attendee head-counts). | MVP |
| FR-M19-02 | Claims up to the security deposit amount are paid from it; amounts above require organizer agreement or a dispute decision; Spot-In does not guarantee amounts beyond held funds in MVP. | MVP |
| FR-M19-03 | Organizer responds within 3 business days: accept, partially accept (counter amount), or dispute; no response → claim auto-accepted up to the security deposit. | MVP |
| FR-M19-04 | Disputes may also be opened by organizers (access denied, space not as described, services not delivered) up to 48 h after event end. | MVP |
| FR-M19-05 | Dispute case: parties, booking, frozen amount, statements, evidence, internal notes, SLA timers, decision with rationale, execution of money movements, notifications; one appeal allowed within 5 days with new evidence. | MVP |
| FR-M19-06 | Decisions recorded on both parties' trust profile (internal). | MVP |
| FR-M19-07 | Attendee complaints about a paid event (not delivered, materially different) can be raised up to 72 h after the session ends; they open a case in the Disputes queue against the listing and may freeze the organizer's ticket payout (M37). | P2 |

### 7.20 M20 — Reviews and ratings

| ID | Requirement | Priority |
|---|---|---|
| FR-M20-01 | After completion, organizer reviews the space/venue (overall 1–5 + sub-ratings: accuracy of listing, communication, facilities, value, operations support) with text and photos; venue reviews the organizer (communication, compliance, condition left, payment) — organizer reviews of venues are public, venue reviews of organizers are visible to venues only. | MVP |
| FR-M20-02 | Double-blind: reviews publish when both submit or after 14 days; window closes after 14 days. | MVP |
| FR-M20-03 | Organizers can also review a venue that cancelled their confirmed booking (review labeled "Venue cancelled"). | MVP |
| FR-M20-04 | Public response by the venue (one per review). | MVP |
| FR-M20-05 | Report review → moderation; reviews removed only for policy violations, not for low ratings. | MVP |
| FR-M20-06 | Aggregates: average rating and count per space and property; response rate and median response time shown on listing. | MVP |
| FR-M20-07 | Attendee reviews of events and organizers: only checked-in attendees can review, within 14 days after the session; overall rating + text; organizer can reply once; organizer average shown on profile and event pages. | P2 |

### 7.21 M21 — Notifications

| ID | Requirement | Priority |
|---|---|---|
| FR-M21-01 | Channels: in-app (bell + inbox), email, WhatsApp Business (template messages), web push (PWA). SMS only for OTP fallback. | MVP |
| FR-M21-02 | Event catalog with defaults per role (see list below); users can change channels per category except mandatory transactional ones (payment due, contract to sign, booking cancelled, pass issued, event cancelled or changed, refund issued). | MVP |
| FR-M21-03 | Digest option for venues (hourly/daily summary of new enquiries) and for attendees (weekly "new events from people you follow"). | P2 |
| FR-M21-04 | Quiet hours for WhatsApp (21:00–07:00 in the recipient's time zone) except urgent event-day items (e.g., venue change, cancellation within 24 h, reminder 2 h before a session that starts before 09:00). | MVP |
| FR-M21-05 | All notifications deep-link to the relevant record and respect permissions. | MVP |
| FR-M21-06 | Frequency caps for marketing-type attendee notifications (followed organizer/venue new events): max 3 per user per day and 10 per week across all sources. | MVP |

Key notification events — **booking side:** new enquiry; enquiry deadline approaching; info requested; message received; quote sent/revised/expiring/accepted/declined; approval needed; hold placed/expiring/promoted; contract ready to sign/signed; payment due/received/failed/overdue; booking confirmed/lapsed/cancelled; document submitted/approved/changes requested; readiness warnings; check-in/out recorded; claim filed/responded; dispute opened/decided; payout sent/held; review requested/published; KYB status; listing approved/rejected.

**Events side:** listing submitted for venue approval / approved / changes requested; listing published / removed by moderation; new event from a followed organizer or property; registration confirmed / pending / approved / declined; waitlist joined / spot offered / offer expiring / offer expired; pass issued / reissued; reminders (24 h, 2 h); event updated (time, venue, details); event postponed / cancelled; announcement from organizer; post-event thank-you and feedback; registration milestone for organizers (e.g., 50%, 90%, full); check-in staff invited; P2: order paid / failed, on-sale starting, waiting-room turn, transfer received / accepted, refund requested / issued, ticket payout sent / held.

### 7.22 M22 — Dashboards, pipeline and analytics

**Venue**

| ID | Requirement | Priority |
|---|---|---|
| FR-M22-01 | Pipeline (kanban and list): New, In discussion, Site visit, Quoted, Pending approval, Accepted (awaiting contract/deposit), Confirmed, Lost/Declined; filters by property, space, member, date; SLA badges for overdue replies. | MVP |
| FR-M22-02 | Today/This week: upcoming load-ins, events, dismantles, documents to review, public listings to approve, payments due. | MVP |
| FR-M22-03 | Basic analytics: enquiries, quotes, bookings, conversion rates, median response time, occupancy % per space, revenue (gross/net), registrations and check-ins at the property's events, by property and period; CSV export. | MVP |
| FR-M22-04 | Advanced analytics: lost-reason analysis, price benchmarking vs similar spaces (anonymized), category mix, lead sources, promoted listing ROI, event footfall trends. | P2 |
| FR-M22-05 | Group portfolio view across properties. | MVP |

**Organizer**

| ID | Requirement | Priority |
|---|---|---|
| FR-M22-06 | Events dashboard: each event with enquiries/quotes/bookings status, listing status, registrations vs capacity, next actions (pay, sign, upload, approve registrants), deadlines. | MVP |
| FR-M22-07 | Spend report by event, client/billing entity, period; tax documents outstanding (withholding slips); P2 ticket revenue and payouts. | MVP |

### 7.23 M23 — Promoted listings and events (Phase 2)

| ID | Requirement | Priority |
|---|---|---|
| FR-M23-01 | Placement types: sponsored slots in space and event search results (max 2 per page, top and mid-list), featured on city/category landing pages, homepage carousel (sold as fixed packages). | P2 |
| FR-M23-02 | Pricing: fixed packages (per week per city/category) and cost-per-click with daily budget; Spot-In sets floor prices. | P2 |
| FR-M23-03 | Eligibility: verified venue or organizer, listing quality score ≥ threshold, rating ≥ 4.0 or < 3 reviews, no active suspension; promoted events must be published and open for registration. | P2 |
| FR-M23-04 | Sponsored results must still match the user's filters and date availability; always labeled "Sponsored / Iklan". | P2 |
| FR-M23-05 | Reporting: impressions, clicks, CTR, enquiries or registrations/orders, bookings, spend, cost per enquiry or per registration. | P2 |
| FR-M23-06 | Billing: prepaid balance (VA/card) or monthly invoice for approved operators; Faktur Pajak for ad spend; invalid-click filtering. | P2 |

### 7.24 M24 — Spot-In admin back office

| ID | Requirement | Priority |
|---|---|---|
| FR-M24-01 | Queues: KYB/verification, listing review, event moderation, reported content, payout exceptions, payment exceptions, disputes, deletion requests; P2 ticket payout holds and refund exceptions. | MVP |
| FR-M24-02 | Search any user, org, property, space, enquiry, booking, event listing, order, pass, payment by ID/name/email/phone. | MVP |
| FR-M24-03 | Configuration: fee rates (commission, organizer fee, ticketing fee, by category/operator/organizer overrides), response deadlines, hold durations, claim windows, cancellation and ticket refund policy templates, tax parameters (incl. PBJT rate table per kabupaten/kota and event category), minimum deposit, payout timing and reserves, waitlist and checkout-hold timings, purchase-limit defaults, moderation rules, approval of custom contract templates. | MVP |
| FR-M24-04 | Actions: suspend/unsuspend account, space listing or event listing, edit listing (with note), extend deadlines, issue manual refunds/adjustments (two-person approval above threshold), place/release payout holds, void passes, force-enable waiting room, "act as" for support (read-only by default; write requires reason; fully logged). | MVP |
| FR-M24-05 | Finance: ledger views, reconciliation reports, payout batches, tax document registry, revenue reports by stream, PBJT collected by region (P2). | MVP |
| FR-M24-06 | Venue and organizer acquisition CRM (leads, status, owner) for the supply team. | P2 |
| FR-M24-07 | Content management: homepage, event collections ("This weekend in Jakarta"), help articles, banners, email/WhatsApp templates (bilingual). | MVP (basic) |
| FR-M24-08 | Immutable admin audit log. | MVP |

### 7.25 M25 — Content, SEO and localization

| ID | Requirement | Priority |
|---|---|---|
| FR-M25-01 | UI in Bahasa Indonesia and English; language auto-detected, switchable, remembered. | MVP |
| FR-M25-02 | IDR formatting (Rp 25.000.000 in ID; Rp 25,000,000 in EN), dates in local format, times shown in the **property's (or external venue's)** time zone with label (WIB/WITA/WIT). | MVP |
| FR-M25-03 | Server-rendered public pages (space listings, properties, event listings, organizer profiles, search landing pages) with structured data (schema.org Place/Event incl. eventStatus, location and offers), sitemaps, canonical URLs, Open Graph images. | MVP |
| FR-M25-04 | City/space-type/event-type landing pages and editorial guides; city × event category × date landing pages ("Events in Bandung this weekend"). | P2 |

### 7.26 M26 — Help and support

| ID | Requirement | Priority |
|---|---|---|
| FR-M26-01 | Help centre (bilingual articles), contextual help links. | MVP |
| FR-M26-02 | Contact support from any booking/enquiry/listing/order (pre-attaches context); ticket status; WhatsApp support channel. | MVP |
| FR-M26-03 | Support SLAs: first response 4 business hours; event-day urgent line for confirmed bookings and for organizers with sessions in progress (phone/WhatsApp) during event hours. | MVP |
| FR-M26-04 | Attendee self-service: find my pass (by phone/email OTP), resend pass, cancel registration, P2 refund status and transfer help; attendee questions about the event itself are routed to the organizer first (FR-M33-05). | MVP |

### 7.27 M27 — Phase 2–3 extensions (summary)

| Feature | Phase | Notes |
|---|---|---|
| Responsiveness/quality badge (e.g., "Spot-In Star Venue") | P2 | Response rate ≥ 90%, median response ≤ 12 h, rating ≥ 4.5, no venue cancellations in 6 months |
| Embeddable booking widget for venue websites | P2 | Enquiries attributed as "direct" → reduced commission |
| Embeddable event / ticket widget for organizer and mall websites | P2 | FR-M34-12; mall widget shows the property's "What's on" |
| Roadshow checkout | P2 | FR-M9-12 |
| Email-to-thread replies | P2 | FR-M10-06 |
| Recurring event series | P2 | FR-M28-15 |
| Personalized event recommendations | P2 | FR-M29-12 |
| Apple / Google Wallet passes | P2 | FR-M31-05 |
| AI-assisted replies, enquiry triage, quote drafting, listing copy | P3 | Human approval always required before sending or publishing |
| Concierge sourcing | P3 | Spot-In staff act on behalf of organizer within the same flows |
| White-label portal per mall group | P3 | Custom domain/subdomain, branding, same backend; includes the group's events guide |
| Lead marketplace | P3 | Venues bid on open briefs |
| Vendor marketplace (booth builders, AV, security, catering) | P3 | Separate supplier listings and bookings |
| Embedded event liability insurance | P3 | Partner insurer quote at checkout |
| Face-value resale via waitlist | P3 | FR-M34-11 |
| Presale lottery, door sales, merchandise, early payouts, ticket revenue → venue balance | P3 | FR-M34-13, FR-M37-04, FR-M37-08 |
| Public API / webhooks for venue ERPs and organizer CRMs | P3 | Bookings, invoices, payouts, registrations, check-ins |

### 7.28 M28 — Event listings (public event pages)

| ID | Requirement | Priority |
|---|---|---|
| FR-M28-01 | An event listing belongs to one Event (project) of an organizer org. Fields: title, short summary (≤ 160 chars), description (rich text, ID/EN), cover image (required) and gallery (≤ 10 images, 1 video link), category (concert & live music, exhibition & expo, bazaar & market, workshop & class, conference & seminar, product launch & activation, festival, sports & fitness, kids & family, community & meetup, arts & culture, food & drink, other), tags, age rating (all ages, 13+, 17+, 18+, 21+), language, accessibility notes, what to bring / dress code, house rules, FAQ, public contact channel (in-app messages by default). | MVP |
| FR-M28-02 | Schedule: one or more **sessions**, each with date, start/end, doors-open time, optional session name and capacity. Single-day, multi-day and multi-session events supported. Times stored in the venue's time zone. | MVP |
| FR-M28-03 | Venue source: (a) **Spot-In booking** — venue, property, space, address, map pin, floor-plan pin and house rules pulled from a confirmed booking of the same organizer org; every session must fall within the booked event days (setup and dismantle excluded); page shows "Venue booked on Spot-In" with a link to the property page. (b) **External venue** — venue name + address chosen through map search; allowed only for Tier 1 or Company organizers; no badge. | MVP |
| FR-M28-04 | Capacity: required per listing or per session. For Spot-In bookings the total admitted capacity cannot exceed the lower of the space's capacity for the chosen layout and any maximum stated in the accepted quote; exceeding it is blocked. | MVP |
| FR-M28-05 | Visibility: **Public** (search, organizer profile, property "What's on"), **Unlisted** (anyone with the link; not in search or sitemaps), **Private** (only invited people or holders of an access code can view and register). | MVP |
| FR-M28-06 | Registration mode: **Free RSVP** (M30); **External tickets** (validated URL, shown as "Tickets sold on {domain}", click-outs tracked; allowed until paid ticketing is enabled for the organizer, then still allowed); **Paid tickets on Spot-In** (P2, M34); **Information only** (open event, no registration, e.g., a mall's weekend programme). | MVP |
| FR-M28-07 | Listing statuses: Draft → Pending venue approval (if required) → Scheduled (publish time set) → Published → (Registration closed / Sold out / Full) → Ended → Archived; branches: Venue change pending, Postponed, Cancelled, Unpublished (by organizer), Removed (by Trust & Safety). | MVP |
| FR-M28-08 | Venue approval (FR-M4-15): listings linked to a booking at a property that requires approval go to the venue's queue; venue approves or requests changes (comments per field) within the property's SLA (default 2 business days; overdue approvals escalate to the property manager, then auto-approve after 4 business days unless the venue opted out of auto-approval). After approval, changes to title, cover, description or category re-enter approval only if the property setting says so; schedule changes always need the booking to cover them. | MVP |
| FR-M28-09 | Material changes after publishing (session date/time, venue, capacity reduction, registration mode, age rating) require a confirmation dialog listing how many registrants will be notified; registrants are notified automatically; the page shows "Updated {date}: {what changed}". | MVP |
| FR-M28-10 | Duplicate a listing (all settings, questions and ticket types; dates cleared) and save listing templates per organizer org. | MVP |
| FR-M28-11 | Preview (mobile/desktop) and a publish checklist (cover, description, schedule, venue, capacity, registration settings, attestations). | MVP |
| FR-M28-12 | Scheduling: publish at a set time; registration opens and closes at set times (default open on publish, close at session start); close automatically when full. | MVP |
| FR-M28-13 | Public event page shows: title, cover, date/time with time-zone label, venue with map and directions link, organizer card (logo, Verified badge, follower count, upcoming events), price information ("Free", "Tickets from Rp …" for external or P2 paid), availability status (Available / Few spots left / Full – join waitlist / Registration closed / Ended / Cancelled / Postponed), registration button, save, share, add to calendar, report. | MVP |
| FR-M28-14 | Ended listings stay online with status "This event has ended", photos the organizer adds afterwards, and similar upcoming events; organizers can hide past events from their profile. | MVP |
| FR-M28-15 | Recurring series: weekly/monthly patterns that generate sessions, edit one or all, series page. | P2 |
| FR-M28-16 | Mall's own events: when the organizer org belongs to the same company as the venue operator (linked by Spot-In ops), listings at its own properties need no booking or venue approval and can use the property as venue directly. | MVP |

### 7.29 M29 — Event discovery

| ID | Requirement | Priority |
|---|---|---|
| FR-M29-01 | Public, no-login events home per city (default from profile or location permission): Happening now, Today, This weekend, Near you, Free, by category, "At {popular mall}" rails, and editorial collections (M24). | MVP |
| FR-M29-02 | Event search filters: keyword, date (presets today / tomorrow / this weekend / next 7 days / custom range), city/area or near me with radius, category, price (free / paid; P2 price range), property or mall, organizer, age rating, indoor/outdoor, accessibility, language, "Venue booked on Spot-In" only, has spots available. | MVP |
| FR-M29-03 | Views: list, map (clustered pins) and calendar (day/week); sort by soonest, nearest, popular, newest. | MVP |
| FR-M29-04 | "Happening now" = sessions in progress at the time of the request in the venue's time zone; "Starting soon" = within the next 3 hours. | MVP |
| FR-M29-05 | Property pages show "What's on" (happening now and upcoming public listings at the property, max 20, link to all) when enabled by the venue (FR-M4-15). | MVP |
| FR-M29-06 | Organizer profile page: logo, cover, bio, Verified badge, social links, follower count, upcoming and past events, (P2) average attendee rating. | MVP |
| FR-M29-07 | Follow organizers and properties (login required); followers are notified of newly published public listings per their preferences and frequency caps (FR-M21-06). Followers' identities are not shared with organizers; organizers see the count only. | MVP |
| FR-M29-08 | Saved events (login required; guests saved in browser and merged on login); reminder when registration opens (if scheduled) and one day before the event if not registered. | MVP |
| FR-M29-09 | Ranking: text and filter match, distance, time to start, popularity (views, saves, registrations in the last 7 days), page quality, organizer verification and history (cancellations, upheld reports); full events ranked lower with "Join waitlist"; ended, cancelled and removed listings excluded. Sponsored placements (P2) are labeled and still obey filters. | MVP |
| FR-M29-10 | SEO: each public listing is a server-rendered page with schema.org Event data (startDate, endDate, eventStatus incl. EventPostponed/EventCancelled, location, organizer, offers with price and availability); unlisted and private listings are noindex. | MVP |
| FR-M29-11 | Share: share sheet (WhatsApp, Instagram story image, X, copy link), generated preview image (cover, title, date, venue); per-channel share links let organizers see traffic sources. | MVP |
| FR-M29-12 | Personalized recommendations ("For you") from follows, saves, past registrations, city and category affinity; explainable ("Because you follow …"); opt-out in settings. | P2 |
| FR-M29-13 | Saved event searches with alerts (e.g., "Free workshops in Jakarta Selatan"). | P2 |
| FR-M29-14 | Search uses the same bilingual, typo-tolerant engine as M7 (e.g., "bazar jaksel" ≈ "bazaar Jakarta Selatan"). | MVP |

### 7.30 M30 — Registration and RSVP

| ID | Requirement | Priority |
|---|---|---|
| FR-M30-01 | Registering requires a logged-in user with one verified channel; new visitors get a quick account in the same flow (FR-M1-10). Each registration is stored as a zero-amount Order with one Pass per attendee, so free and paid admissions share passes and check-in. | MVP |
| FR-M30-02 | Registration form: name (prefilled), email and/or phone (from account), up to 15 custom questions (short text, long text, single choice, multiple choice, dropdown, number, date, yes/no, terms/waiver acceptance with link) with required/optional flags, per listing or per session. Sensitive-data questions (ID numbers, health, religion) are blocked unless Spot-In ops enables them for the listing with a stated purpose. | MVP |
| FR-M30-03 | Group registration: organizer sets max guests per registration (0–9, default 0) and whether guest names are required; each guest gets their own pass. | MVP |
| FR-M30-04 | Capacity is enforced atomically per session and per listing; a registration that would exceed capacity is offered the waitlist instead. | MVP |
| FR-M30-05 | Approval mode: registrations become **Pending**; organizer approves or declines (single or bulk, optional message); passes are issued only on approval; pending registrations still pending at registration close are declined automatically (configurable). Approved count never exceeds capacity. | MVP |
| FR-M30-06 | Waitlist: optional; shows position; when a spot frees, either auto-promote (default) or send a claim offer with a window (default 12 h, min 1 h); offers stop 2 h before start; expired offers go to the next person. | MVP |
| FR-M30-07 | Attendee cancellation until a cut-off (default session start; organizer can set earlier); cancelled passes are voided and capacity released to the waitlist. | MVP |
| FR-M30-08 | Registration close: at a set time, when full, or manually; "Registration closed" shown on page; organizer can reopen. | MVP |
| FR-M30-09 | Age rules: for 17+, 18+ or 21+ listings attendees confirm they meet the age at registration and are told ID may be checked at the door. For all-ages listings, a registrant who indicates they are under 18 must enter a parent/guardian name and phone and the guardian confirms by OTP before the pass is issued (UU PDP consent for children); organizers can disallow under-18 registrations. | MVP |
| FR-M30-10 | Abuse controls: one registration per account per session (plus guests); per-phone and per-device duplicate detection; rate limits; invisible bot challenge, escalating to a visible challenge on suspicious traffic or when demand exceeds capacity × 3. | MVP |
| FR-M30-11 | Organizer attendee management: list with search and filters (status, session, answers, checked-in), bulk approve/decline, manual add and CSV import of guests (≤ 2,000 per import, passes sent on import), resend pass, cancel registration with reason, export CSV (export logged with actor and purpose). | MVP |
| FR-M30-12 | No-show handling: organizer can mark no-shows after the event; optional rule lowers waitlist priority at the same organizer for attendees with ≥ 2 no-shows in 90 days (disclosed on the page). | P2 |

### 7.31 M31 — Passes and tickets

| ID | Requirement | Priority |
|---|---|---|
| FR-M31-01 | Each confirmed registration or paid ticket yields one **Pass** per attendee with a unique ID and QR code, shown in **My tickets** (PWA, available offline after first load), sent by email (link + PDF) and by WhatsApp (link). | MVP |
| FR-M31-02 | The QR encodes a signed token (pass ID, listing, session, version, signature) that the scanner can verify offline with the listing's public key; reissuing a pass increments the version and invalidates earlier codes. | MVP |
| FR-M31-03 | Pass content: event title, session date/time with time-zone label, venue and map link, attendee name, ticket type, guest/pass number (e.g., 2 of 3), entry instructions and gate, age rating, organizer contact, add to calendar. | MVP |
| FR-M31-04 | Rotating QR (P2): organizer can require dynamic codes that refresh every 30 seconds and are only shown in the logged-in app from a configurable time before doors (default 24 h); printed/screenshotted codes are rejected by the scanner. | P2 |
| FR-M31-05 | Apple Wallet and Google Wallet passes with updates on changes. | P2 |
| FR-M31-06 | Guest passes on a group registration can be forwarded to the guest by link or phone number; the guest can claim it into their own account (free events). | MVP |
| FR-M31-07 | Pass statuses: Issued → Checked in (→ Checked out if re-entry) / Cancelled / Voided / (P2) Transferred / Refunded / Redeemed (wristband). | MVP |

### 7.32 M32 — Check-in and entry

| ID | Requirement | Priority |
|---|---|---|
| FR-M32-01 | Check-in web app (PWA) for organizer members and Check-in staff (FR-M2-12); select listing, session and gate. | MVP |
| FR-M32-02 | Camera QR scanning with result in ≤ 500 ms online and ≤ 200 ms offline: **Valid** (green: name, ticket type, guest number) or **Not valid** (red with reason: already checked in — time, gate, staff; wrong session; wrong event; cancelled/voided/refunded; pending approval; not yet open; expired code), with sound and vibration. | MVP |
| FR-M32-03 | Manual lookup by name, pass ID or last 4 digits of phone; manual check-in requires a confirm tap and is flagged as manual. | MVP |
| FR-M32-04 | Offline mode: before doors the app downloads an encrypted manifest of passes for the session; scans are stored locally and synced when online; while online, check-ins propagate to other devices within 5 seconds; offline conflicts resolve to the earliest check-in and are listed for review. | MVP |
| FR-M32-05 | Multiple devices and gates; live dashboard for the organizer: checked in vs issued, by gate and 15-minute interval, current estimated occupancy if re-entry is tracked. | MVP |
| FR-M32-06 | Entry rules per listing: single entry (default) or re-entry allowed with a check-out scan; per-ticket-type check-in window (P2). | MVP |
| FR-M32-07 | Walk-in registration at the door for free listings when capacity remains (name + phone; pass issued instantly). | MVP |
| FR-M32-08 | Undo a check-in within 5 minutes (reason required, logged). | MVP |
| FR-M32-09 | ID prompts: for age-restricted listings the scanner shows "Check ID: {age}+"; for named tickets (P2) it shows the name and last 4 digits of the ID number to match against the attendee's KTP/passport. | MVP / P2 |
| FR-M32-10 | Wristband redemption (P2): redemption sessions (place, date, hours, capacity), scan pass + check ID → pass marked **Redeemed** with optional wristband serial; gate staff check wristbands; unredeemed passes routed to an on-site desk. | P2 |
| FR-M32-11 | For listings linked to a booking, the venue's operations team sees live check-in counts (no personal data) to manage crowd levels against the space's capacity; an alert fires at 90% of admitted capacity. | MVP |

### 7.33 M33 — Attendee communications, audience and event analytics

| ID | Requirement | Priority |
|---|---|---|
| FR-M33-01 | Automated messages (bilingual per attendee's language): registration received/confirmed, pending/approved/declined, waitlist position/offer/expiry, pass, reminders 24 h and 2 h before (with directions and gate), event updated, postponed, cancelled, post-event thank-you with optional 1-question feedback. Organizer can edit a custom note inside each template, not the mandatory content. | MVP |
| FR-M33-02 | Announcements: organizer sends a message to all registrants or a segment (session, status, ticket type) by email and in-app; max 3 per listing per day; automated content checks (links, spam words); recipients can mute non-essential announcements. WhatsApp announcements via approved templates (P2, cost passed to organizer). | MVP |
| FR-M33-03 | Organizers can see and export attendee data only for their own listings and only fields collected at registration; the export screen states the purpose limitation; organizers may not use registrants' contacts for marketing unless the attendee ticked an organizer-specific opt-in (unticked by default). | MVP |
| FR-M33-04 | Followers: organizers see follower counts and can send "new event" notifications only through Spot-In (no export of follower contacts). | MVP |
| FR-M33-05 | Attendee questions: "Message organizer" on the event page opens a thread (attendee ↔ organizer members) in the organizer inbox; organizers reply within the thread; contact details are masked as in FR-M10-03 until the attendee holds a pass. | MVP |
| FR-M33-06 | Post-event feedback (1–5 rating + optional comment) private to the organizer in MVP; public reviews in P2 (FR-M20-07). | MVP |
| FR-M33-07 | Event analytics per listing: page views, unique visitors, traffic sources (share links, search, organizer profile, property page, external), saves, registrations and conversion, waitlist size, approvals, check-ins and show-up rate by session and gate, no-shows, (P2) sales by ticket type and promo code; CSV export. | MVP |

### 7.34 M34 — Paid ticketing: ticket types, pricing and on-sale (Phase 2)

| ID | Requirement | Priority |
|---|---|---|
| FR-M34-01 | Eligibility to sell paid tickets: organizer Tier 1 or Company tier, verified payout bank account (FR-M3-04), 2FA on Owner/Finance, ticket refund policy chosen, PBJT setup confirmed (FR-M37-05), and — for listings with capacity above a configurable threshold (default 500) — an uploaded crowd permit or permit-in-progress attestation before on-sale (permit upload required before doors). | P2 |
| FR-M34-02 | Ticket types per listing or session: name, description, face value (integer IDR, ≥ configurable minimum), quantity, min/max per order, sales start/end, visibility (public / hidden until an access code is entered), transferable flag, check-in window, sort order. Free and paid types can be mixed. | P2 |
| FR-M34-03 | Price tiers: automatic progression (e.g., Early bird → Presale → Regular) by date or when the earlier tier's quantity sells out; the active tier and "next price from {date}" shown. | P2 |
| FR-M34-04 | Promo codes (percentage or fixed amount; per ticket type; total and per-account usage limits; validity window) and access codes that reveal hidden types (presale, comps, community). | P2 |
| FR-M34-05 | Bundles and group tickets (e.g., "Group of 4", "buy 3 get 1"); a bundle issues one pass per admission. | P2 |
| FR-M34-06 | All-in pricing: the first price shown anywhere is the total a buyer pays per ticket (face value + PBJT + Spot-In ticketing fee if passed to buyer), with a breakdown on tap and at checkout; organizer chooses **pass fee to buyer** or **absorb fee**. | P2 |
| FR-M34-07 | Purchase limits per order, per account per listing and per session; optional **named tickets** requiring each attendee's full name and ID number (NIK, passport or KITAS), with an optional per-ID limit (e.g., 1 ticket per NIK per session). ID numbers are format-checked, encrypted, shown masked (last 4 digits), used only for entry checks and limit enforcement, and deleted per §8. | P2 |
| FR-M34-08 | Inventory holds: tickets are reserved for the buyer during checkout (default 10 min, configurable 5–15) with a visible timer; for VA payments the hold extends to the VA expiry (max 60 min); expired holds release automatically. Inventory counters are atomic; overselling is impossible. | P2 |
| FR-M34-09 | Virtual waiting room for on-sales: enabled by the organizer or forced by Spot-In ops; pre-queue opens a configurable time before on-sale (default 30 min); at on-sale, users already waiting are randomized, later arrivals queue first-come-first-served; live position and estimated wait; one queue position per verified account; signed, single-use admission tokens with a purchase window; bot challenges; waiting room served from CDN edge so it survives traffic spikes. | P2 |
| FR-M34-10 | Changes after sales start: price of a ticket type with sales cannot change (add a new type instead); quantity can be reduced only down to the number sold; ticket types with sales cannot be deleted, only hidden or closed. | P2 |
| FR-M34-11 | Sold-out waitlist for paid listings: buyers join; when tickets return (refunds, cancellations, released holds, organizer adds inventory) people are offered them in order with a purchase window. P3: holders can return a ticket to the waitlist and get a refund when it is resold at face value. | P2 / P3 |
| FR-M34-12 | Embeddable event / ticket widget (script or iframe) for organizer and mall websites, with checkout inside the widget or a redirect to Spot-In. | P2 |
| FR-M34-13 | Phase 3 extensions: registration-based presale lottery; door / box-office sales via QRIS on the check-in device; merchandise or add-ons at checkout. | P3 |

### 7.35 M35 — Ticket orders, payments, refunds and transfers (Phase 2)

| ID | Requirement | Priority |
|---|---|---|
| FR-M35-01 | Checkout: select tickets → attendee details (names / ID numbers if named) → registration questions → promo code → payment method (QRIS, e-wallets, VA, cards via M14 adapter) → accept listing terms and refund policy → pay. Guest checkout is not offered; the buyer logs in with verified phone. | P2 |
| FR-M35-02 | Order statuses: Created → Pending payment → Paid → (Partially refunded / Refunded / Charged back) or Expired / Failed / Cancelled. Passes are issued only after the provider confirms payment (webhook or status poll). | P2 |
| FR-M35-03 | Receipts: per order, showing face value (sold on behalf of the organizer), PBJT, Spot-In ticketing fee (with PPN), discounts and total; downloadable PDF; Spot-In fee e-Faktur on request for company buyers (NPWP). | P2 |
| FR-M35-04 | Refund policy per listing, chosen at setup and shown before purchase: **No refunds** (except cancellation or material change), **Refundable until N days before**, or **Refundable until N hours before**; partial-refund tiers allowed. The Spot-In ticketing fee is refunded only when the organizer cancels or materially changes the event. | P2 |
| FR-M35-05 | Attendee refund requests within policy are approved automatically; outside policy they go to the organizer (approve/decline with reason). Organizers can issue full or partial refunds per order or per ticket at any time before payout. | P2 |
| FR-M35-06 | Event cancellation: all paid orders are refunded in full (face value, PBJT and fee) automatically to the original method, or to a verified bank account for VA payments; refunds initiated within 1 business day and completed within 7 business days; costs of the cancellation (fees, payment costs) are charged to the organizer per §11.6. | P2 |
| FR-M35-07 | Postponement: tickets carry over to the new date; buyers get a refund window (default 14 days from the announcement, or until 48 h before the new date if sooner) to request a full refund. "Date to be announced" keeps the window open until a date is set. | P2 |
| FR-M35-08 | Material change (venue moved to another city, headliner cancelled as declared by organizer, session shortened > 50%, age rating raised): buyers get the same refund window as a postponement. | P2 |
| FR-M35-09 | Transfers (if the listing allows): holder sends a pass to another Spot-In user by phone or email; recipient accepts within 48 h; a new pass version is issued to the recipient and the old one voided; named tickets require the recipient's name and ID and are subject to per-ID limits; transfers lock at a configurable time before doors (default 24 h); max transfers per pass (default 1); refunds always go to the original payer. | P2 |
| FR-M35-10 | Resale above face value is prohibited by the terms; Spot-In offers no open resale marketplace (NG4); organizers may void passes proven to be resold in breach after a Trust & Safety review (refund of face value to the original payer). | P2 |
| FR-M35-11 | Fraud controls: velocity limits per card, account, device and ID number; 3DS on cards; risk scoring; blocklists; automatic review queue for high-risk orders before passes are issued (max 30 min). | P2 |
| FR-M35-12 | Chargebacks: pass voided on chargeback notice if the session has not started; evidence pack includes receipt, terms acceptance, IP/device, pass views and check-in scans; buyer account restricted pending outcome. | P2 |

### 7.36 M36 — Event trust, safety and moderation

| ID | Requirement | Priority |
|---|---|---|
| FR-M36-01 | Event content policy (bilingual, public): prohibited events and content (illegal activity, gambling, hate or extremism, sexual content, weapons, unlicensed alcohol sale, pyramid schemes, misleading claims, events by suspended entities); restrictions (alcohol and 21+ events require age rating; political events require organizer Company or Tier 1 and follow applicable regulation). | MVP |
| FR-M36-02 | Moderation pipeline: automated checks on publish (text classifiers, image moderation, external link scanning, duplicate/scam patterns); the first 3 listings of a new organizer and any listing flagged by checks are reviewed before publishing (SLA 1 business day); others are published immediately and sampled. | MVP |
| FR-M36-03 | Organizer attestations at publish (stored with timestamp and version): accuracy of information; right to hold the event at the venue (external venues); required permits obtained or in progress; compliance with venue house rules. | MVP |
| FR-M36-04 | Report event / organizer from the page (reasons: scam or fake, wrong information, event cancelled but still listed, inappropriate content, safety concern, other); Trust & Safety actions: dismiss, request changes, hide from search, unpublish, remove, suspend organizer; registrants notified when an event they hold passes for is removed. | MVP |
| FR-M36-05 | Trust signals on event pages: Verified organizer badge, "New organizer" label for organizers with < 3 completed events, "Venue booked on Spot-In", number of past events held, (P2) attendee rating. | MVP |
| FR-M36-06 | External ticket links: domain blocklist/allowlist, link safety scanning at publish and daily, interstitial "You're leaving Spot-In" with the domain; repeated scam reports on a domain block it platform-wide. | MVP |
| FR-M36-07 | Safety information on event pages: capacity status, age rating, accessibility, venue house rules; for outdoor events, organizer's weather/cancellation note. | MVP |

### 7.37 M37 — Ticketing finance: payouts, PBJT and statements (Phase 2)

| ID | Requirement | Priority |
|---|---|---|
| FR-M37-01 | Ticket payments are collected into Spot-In's platform account at the licensed provider (escrow, FR-M14-03) and recorded per listing and order in the ledger (FR-M16-07). | P2 |
| FR-M37-02 | Payout rule: organizer payable = face value + PBJT collected − refunds − absorbed ticketing fees − chargebacks − reserve; paid to the organizer's verified bank account **T+3 business days after the listing's last session ends** if no open dispute, attendee complaint case or fraud hold. Multi-week series (P2) pay out per session after each session's T+3. | P2 |
| FR-M37-03 | Reserve: a configurable percentage (default 10%) of the payout is held for 14 days for organizers with fewer than 3 completed paid events, to cover late chargebacks and complaints. | P2 |
| FR-M37-04 | Early payouts for trusted organizers (up to X% of sales before the event, backed by a guarantee or company verification). | P3 |
| FR-M37-05 | PBJT setup per listing: the system proposes the rate from the admin table for the venue's kabupaten/kota and the event category (e.g., DKI Jakarta and Kota Bandung arts & entertainment: 10%); the organizer confirms or edits the rate (0% for exempt events, with reason) and its tax status; PBJT is shown as a separate line on every order and receipt; the rate is locked per order at purchase. | P2 |
| FR-M37-06 | PBJT reporting: per listing and per month, gross ticket sales, PBJT collected, refunds and net PBJT by region; exportable for the organizer's regional tax filing; Spot-In passes the collected PBJT to the organizer in the payout and does not file it (NG9), unless Q12 concludes otherwise. | P2 |
| FR-M37-07 | Organizer ticket statements: sales by ticket type, tier, promo code and channel; fees (passed and absorbed); PBJT; refunds; chargebacks; reserves; payouts; CSV/XLSX; Spot-In fee invoice with Faktur Pajak for absorbed fees (monthly). | P2 |
| FR-M37-08 | Apply escrowed ticket revenue to an outstanding Spot-In venue-booking balance for the same Event. | P3 |
| FR-M37-09 | Payout holds (visible to organizer Finance with reason): KYB/verification issue, bank-change cooldown, open dispute or attendee complaint case, fraud flag, event cancelled with refunds in progress, refund rate above threshold (default 15%) pending review. | P2 |

---

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| Platform | Responsive web (mobile-first for attendees, organizers and individual owners; desktop-optimized dashboards for venue teams). PWA installable with web push; My tickets and the check-in scanner work offline. Browsers: last 2 versions of Chrome, Safari, Edge, Firefox; Android WebView; scanner tested on mid-range Android phones (2 GB RAM). |
| Performance | Public pages (space listings, event pages, events home) LCP ≤ 2.5 s on 4G (p75); search API p95 ≤ 500 ms; dashboard actions p95 ≤ 1 s; scan result ≤ 500 ms online / ≤ 200 ms offline; registration submit p95 ≤ 1.5 s. |
| Availability | 99.9% monthly for web and API; 99.95% for pass display and check-in during event hours; payment webhooks processed with retries and idempotency; graceful degradation when e-sign or tax provider is down. |
| Scalability | Launch sizing: 2,000 properties, 20,000 spaces, 50,000 monthly active organizer/venue users, 10,000 enquiries/month; events side: 5,000 published listings/month, 300,000 registrations/month, 1,000,000 attendee monthly visitors, single free event up to 20,000 registrations. P2 on-sale: waiting room for 300,000 concurrent users, checkout throughput 3,000 orders/min for a single listing, inventory consistency under contention (no oversell). Horizontally scalable; load tests before each high-demand on-sale. |
| Data residency | Production data and backups hosted in an Indonesian region (required for registered PSE and to simplify PDP compliance). |
| Security | OWASP ASVS L2; TLS 1.2+; encryption at rest; secrets in a vault; least-privilege RBAC enforced server-side on every request; rate limiting and bot protection on auth, search, enquiry, registration and checkout endpoints; malware scanning on uploads; signed, expiring URLs for private files; pass-signing keys per listing, rotated, held in a KMS; annual penetration test before launch and before paid ticketing goes live. |
| Payments | No card data touches Spot-In servers (provider-hosted fields/redirect; PCI DSS SAQ-A scope). All money operations idempotent with unique keys; ledger is append-only. |
| Privacy (UU PDP / PP 33/2026) | Record of processing activities; lawful basis per purpose; consent logs; privacy notice (ID/EN); data-subject requests (access, correction, deletion, portability) handled in-app with ≤ 3×24 h acknowledgement; DPIA before launch and a separate DPIA before named tickets with ID numbers go live; appoint a data protection officer (PPDP) if criteria apply; breach notification process (to subjects and authority within 3×24 h); children's data processed only with parent/guardian consent (FR-M30-09); attendee data minimization (organizers get only fields they ask for; venues get counts only); ID numbers on named tickets encrypted with field-level keys, masked in all UIs, deleted 90 days after the session unless tied to an open dispute or chargeback; retention schedule (financial/tax records 10 years; messages and documents tied to bookings kept 5 years after completion unless law requires longer; registration answers kept 1 year after the event then deleted or anonymized; marketing data deleted on withdrawal). |
| Auditability | Every state change on enquiries, quotes, contracts, payments, payouts, disputes, listings, orders, passes (incl. check-in, transfer, void) and admin actions written to an immutable audit log with actor, timestamp, before/after; attendee-data exports logged. |
| Accessibility | WCAG 2.1 AA for public, attendee and organizer flows; passes readable at high contrast with screen-reader text; scanner usable one-handed with large result states. |
| Localization | All user-facing strings externalized; ID and EN complete at launch. |
| Observability | Structured logs, metrics, tracing; alerting on payment/webhook failures, payout mismatches, error-rate spikes, check-in sync failures during live sessions, waiting-room health; business dashboards. |
| Backups/DR | Daily backups, point-in-time recovery 7 days; RPO ≤ 15 min, RTO ≤ 4 h (pass validation keeps working offline during an outage). |
| Legal registration | Spot-In registered as a private-scope electronic system operator (PSE Lingkup Privat) before launch. |

---

## 9. Data model

### 9.1 Core entities

| Entity | Key fields | Notes |
|---|---|---|
| User | id, name, email, phone, locale, home_city, 2FA, status, consents[], date_of_birth (optional) | One person; also the attendee |
| Organization | id, kind (organizer \| venue_operator), type (individual \| company \| group), legal_name, brand_name, NPWP, NIB, address, verification_status, tier, public_profile (display name, bio, logo, cover, links), linked_operator_id (mall's own organizer org) | |
| Membership | user_id, org_id, role, property_scope[], is_signatory, signing_limit | |
| BillingEntity | org_id, legal_name, NPWP, address, is_PKP, default | P2: multiple per org |
| VerificationCase | subject (org/property/user), documents[], status, reviewer, notes, decided_at | |
| BankAccount | org_id, bank, account_no (encrypted), holder_name, verified_at, cooldown_until | Venue and organizer payouts |
| Property | id, operator_id, name, type, address, geo, timezone, hours, rules, floor_plans[], required_docs[], status, right_to_rent_verified, whats_on_enabled, listing_approval_required, approval_sla | |
| Space | id, property_id, parent_space_id, type, level, plan_pin, specs (area, capacities, power, load, height…), permitted_activities, media[], policies (cancellation, deposit defaults), status | Tree up to 3 levels |
| RateCard | space_id, unit, base_price, min_units, weekday/weekend, seasons[], setup_rate, dismantle_rate, tax_mode | |
| AddOn | property_id, name, unit, price, taxable, mandatory | |
| CalendarEntry | space_id, start, end, kind (block \| tentative_hold \| booking_hold \| booked), ref (enquiry/booking), rank (1st/2nd option), expires_at | Overlap constraint per space tree |
| Event | id, organizer_org_id, name, type, brand/client, category, attendance, schedule (setup/event/dismantle), budget, attachments[], venue_source (spot_in_booking \| external \| undecided) | Internal project |
| Enquiry | id, event_id, space_id, status, answers{}, response_deadline, assigned_member, tags, lost_reason, public_ticketed_intent | |
| MessageThread / Message | thread per enquiry→booking, or per listing×attendee; body, attachments, masked flags, sender | |
| SiteVisit | enquiry_id, slot, status | |
| Quote | id, enquiry_id, version, status, lines[], totals (subtotal, service charge, PPN, PPh4(2) estimate, organizer fee, security deposit), payment_schedule[], cancellation_policy_id, validity, special_terms, max_admitted_capacity, public_listing_allowed, approvals[] | Immutable once sent |
| Booking | id, quote_id (accepted version), event_id, space_id, schedule, status, contract_id, payment_schedule[], withholding_declared, PICs, readiness | |
| Contract / Addendum | booking_id, template_version, pdf_hash, signers[], emeterai[], status, provider_refs | |
| Invoice | issuer (venue \| Spot-In \| organizer), recipient billing entity, number, lines, taxes, withholding, due_date, status, faktur_ref | Credit notes reference originals |
| Payment | invoice_id or order_id, method, provider_ref, amount, status, paid_at | |
| LedgerEntry | booking_id or listing_id, account, debit/credit, amount, ref | Append-only |
| Payout | payee_org_id, payee_kind (venue \| organizer), bank_account_id, amount, items[], reserve, status, provider_ref, hold_reasons[] | |
| Refund | payment_id, amount, destination, reason, status | |
| ComplianceItem | booking_id, type, due_date, versions[], status, reviewer_comments, valid_until | |
| Handover | booking_id, type (check_in \| check_out), photos, readings, notes, acknowledgements | |
| ChangeRequest | booking_id, requested_by, changes, amended_quote_id, status | |
| Cancellation | booking_id, initiated_by, reason, policy_snapshot, refund_breakdown | |
| Claim / Dispute | booking_id or listing_id, type, amount, evidence[], status, decision, appeal | |
| Review | booking_id or pass_id, author_side (organizer \| venue \| attendee), ratings{}, text, photos, published_at, response | Attendee reviews P2 |
| Promotion (P2) | org_id, targets[] (spaces or listings), placement, budget/package, dates, status, metrics | |
| **EventListing** | id, event_id, organizer_org_id, booking_id (nullable), external_venue (name, address, geo, timezone), title, summary, description{id,en}, media[], category, tags, age_rating, language, visibility, registration_mode, external_ticket_url, capacity, status, venue_approval (status, reviewer, comments), attestations[], refund_policy (P2), pbjt (rate, region, status) (P2), waitlist_enabled, approval_required, transfer_rules (P2), entry_rules, published_at, change_log[] | Public page |
| **Session** | id, listing_id, name, starts_at, ends_at, doors_at, capacity, status | ≥ 1 per listing |
| **RegistrationQuestion** | listing_id, session_scope, type, label{id,en}, options[], required, order | |
| **TicketType** | id, listing_id, session_ids[], name, kind (free \| paid), face_value, quantity, sold, held, min/max per order, sales_window, visibility, access_code_required, transferable, check_in_window, tiers[] (P2) | Free RSVP = one free type |
| **PromoCode** (P2) | listing_id, code, kind (discount \| access), value, applies_to[], limits, validity, uses | |
| **Order** | id, buyer_user_id, listing_id, status, items[] (ticket_type, qty, unit price, discount), subtotal, pbjt, fee, fee_mode (passed \| absorbed), total, answers{}, payment_id, hold_expires_at, approval_status, source (direct \| share link \| widget \| import \| door) | Free registrations are zero-amount orders |
| **Pass** | id, order_id, session_id, ticket_type_id, holder_user_id, attendee_name, attendee_id_number (encrypted, P2), guardian (name, phone, confirmed_at), version, status, checked_in_at, gate, redeemed_at, wristband_serial (P2) | One admission |
| **WaitlistEntry** | listing_id, session_id, user_id, qty, position, status (waiting \| offered \| claimed \| expired \| left), offer_expires_at | |
| **CheckInEvent** | pass_id, device_id, staff_user_id, gate, action (check_in \| check_out \| undo \| reject), reason, scanned_at, synced_at, offline | Append-only |
| **StaffAccess** | listing_id, user_id, role (check_in), valid_from, valid_until, revoked_at | |
| **Follow** | user_id, target (organizer_org \| property), created_at, notify_channels | |
| **SavedEvent** | user_id, listing_id | |
| **Announcement** | listing_id, audience filter, channels, body, sent_at, recipients_count | |
| **Transfer** (P2) | pass_id, from_user_id, to_contact, to_user_id, status, expires_at | |
| **WaitingRoom** (P2) | listing_id, opens_at, on_sale_at, status; QueueEntry: user_id, position, admitted_at, token_expires_at | |
| **PbjtRate** (P2) | region (kabupaten/kota), category, rate, valid_from, valid_to, source_reference | Admin table |
| **ModerationCase** | subject (listing \| organizer \| review), source (auto \| report), reasons[], status, decision, actor | |
| Notification | user_id, event, channel, payload, status | |
| AuditLog | actor, action, entity, before, after, ip, at | |

### 9.2 State machines

**Enquiry**
`submitted → viewed → (info_requested ⇄ responded) → quoted → accepted` · terminal: `declined | expired | withdrawn | lost`

**Quote**
`draft → pending_approval → approved → sent → (superseded by new version) → accepted | rejected | expired | withdrawn` (approver can return to `draft`)

**Booking**
`pending_contract_and_deposit → confirmed → balance_due → fully_paid → in_progress (setup start) → completed (dismantle end) → in_claim_window → settled`
Branches: `lapsed` (deadline missed before confirmation), `cancelled_by_organizer`, `cancelled_by_venue`, `cancelled_force_majeure`, `disputed` (overlay state that freezes funds and pauses settlement).

**Calendar hold**
`tentative_1st → (expired | released | converted_to_booking_hold)`; `tentative_2nd → promoted_to_1st | expired`; `booking_hold → booked | released`.

**Contract**
`draft → sent → partially_signed → fully_signed → (amended) | voided`

**Payment**
`created → pending (VA issued / redirect) → paid | expired | failed`; `paid → refunded (partial | full) | charged_back`

**Payout**
`scheduled → on_hold ⇄ scheduled → processing → paid | failed (→ retry / bank fix)`

**Compliance item**
`not_started → submitted → (changes_requested → submitted) → approved | waived`

**Dispute**
`open → evidence → under_review → decided → (appealed → decided_final) → executed`

**Event listing**
`draft → (pending_venue_approval ⇄ changes_requested) → scheduled → published → (registration_closed | full | sold_out ⇄ published) → ended → archived`
Branches from published/scheduled: `venue_change_pending → published | cancelled`; `postponed → published (new date) | cancelled`; `cancelled`; `unpublished → published`; `removed` (Trust & Safety, terminal unless reinstated).

**Order**
Free: `created → (pending_approval → approved | declined) → confirmed → cancelled`
Paid (P2): `created → pending_payment → paid | expired | failed`; `paid → partially_refunded | refunded | charged_back`; `pending_review` (fraud) between `pending_payment` and `paid` when flagged.

**Pass**
`issued → checked_in (⇄ checked_out with re-entry) `; `issued → cancelled | voided | refunded | transferred (old version)`; `issued → redeemed → checked_in` (wristband events). `checked_in → issued` only by undo within 5 minutes.

**Waitlist entry**
`waiting → offered → claimed | expired (→ next) `; `waiting → left | closed (registration closed)`.

**Transfer (P2)**
`pending → accepted | declined | expired | cancelled_by_sender`.

---

## 10. Integrations

| Capability | Proposed provider(s) | Use | Phase |
|---|---|---|---|
| Payments (acceptance, VA, QRIS, e-wallets, cards) | **Xendit** (primary); Midtrans as secondary option behind an abstraction | Collect deposits, balances, security deposits, promoted-listing payments, ticket orders (P2) | MVP |
| Marketplace routing / escrow | Xendit **xenPlatform** (sub-accounts per venue operator and per ticket-selling organizer, split rules for commission and fees, platform-held balance) | Hold funds until release rules met; split commission/fees automatically on release | MVP |
| Disbursement / payouts / refunds | Xendit disbursement, bank account name validation | Venue and organizer payouts, organizer and attendee refunds | MVP |
| Certified e-signature + identity verification | **Privy**, Mekari Sign or VIDA (choose one, keep adapter) | Contract and addendum signing, signer KYC (KTP + liveness), organizer Tier 1 identity check for external-venue events | MVP |
| E-meterai | Peruri via the e-sign provider (official distributor) | Stamp duty on contracts above threshold | MVP |
| Tax (Coretax e-Faktur, e-Bupot, NPWP validation) | Licensed PJAP (e.g., Pajakku, OnlinePajak) via API | Faktur Pajak for Spot-In fees (MVP); optional venue faktur (P2); NPWP/KSWP validation (P2) | MVP / P2 |
| Messaging | WhatsApp Business Platform (via BSP), email (SES/SendGrid), SMS OTP gateway, Web Push | Notifications, OTP, pass delivery, reminders | MVP |
| Maps | Google Maps Platform (Places autocomplete, geocoding, maps, directions links) | Address entry (incl. external event venues), map search for spaces and events | MVP |
| Search | PostgreSQL + PostGIS for geo; Meilisearch/OpenSearch for full-text, typo tolerance, facets | Space and event discovery | MVP |
| File storage & media | S3-compatible object storage in Indonesia region + image CDN; antivirus scanning; generated share images | Photos, decks, documents, event covers, pass PDFs | MVP |
| Content moderation | Image moderation and text classification API (provider TBD) + link-safety API | Event and listing moderation (M36) | MVP |
| Bot protection | Invisible challenge / bot management at the edge (e.g., Cloudflare Turnstile + bot management) | Registration, checkout, waiting room, auth | MVP |
| Virtual waiting room | Built on CDN edge workers with signed tokens, or a waiting-room provider behind an adapter | High-demand on-sales (M34) | P2 |
| Calendar | ICS export and "add to calendar" links (MVP); Google/Microsoft calendar sync (P2) | Venue calendars, site-visit invites, attendee passes | MVP / P2 |
| Wallet passes | Apple PassKit, Google Wallet API | Passes with live updates | P2 |
| Analytics | Product analytics (event tracking with consent), BI warehouse | Funnels, metrics in §3.3 | MVP |
| Monitoring | Error tracking, APM, uptime, synthetic checks on pass and scanner endpoints | Reliability | MVP |
| Accounting export | CSV/XLSX; API/webhooks (P3) | Venue ERP reconciliation; organizer sales and PBJT reports | MVP / P3 |

Integration principles: every external call is wrapped by an internal adapter; webhooks verified by signature, processed idempotently, and stored raw for replay; provider outages surface as clear user-facing states (§12); pass validation never depends on an external provider at the door.

---

## 11. Business rules: fees, money and tax

### 11.1 Fees (all admin-configurable; numbers below are placeholders for business decision)

| Fee | Charged to | Basis | Placeholder |
|---|---|---|---|
| Booking commission | Venue | % of rental + add-ons (excl. PPN, excl. security deposit, excl. pass-through government costs) | 10% (may vary by category, operator contract, or "direct" bookings via widget) |
| Organizer service fee | Organizer | % of rental + add-ons, shown as separate line, min and max caps | 3%, min Rp 50.000, max Rp 2.500.000 per booking |
| Payment processing | Absorbed by Spot-In by default; configurable surcharge for cards | Per transaction | Configurable |
| E-meterai cost | Organizer (default) or split | Per meterai | At cost |
| Promoted listings and events (P2) | Venue or organizer | Package or CPC | Set by Growth |
| Venue cancellation penalty | Venue | % of rental or flat | e.g., 10% of rental, deducted from future payouts |
| Free event listings and registrations | — | — | Free (MVP), including check-in tools |
| Ticketing fee (P2) | Ticket buyer (default) or organizer (if absorbed) | % of face value + fixed amount per paid ticket; excludes PBJT | 4% + Rp 2.000 per paid ticket; free tickets Rp 0 |
| Ticket payment processing (P2) | Included in the ticketing fee by default | Per order | Included |
| Organizer cancellation cost (P2) | Organizer | Non-recoverable payment costs of refunding a cancelled event, deducted from future payouts or invoiced | At cost |

Commission and fees are charged on the amounts actually retained after refunds (e.g., organizer cancels with 50% refund → commission on the 50% the venue keeps).

### 11.2 Payment schedule rules

- Deposit: minimum 20% of the rental total (platform floor); venue default 50%; due within 3 days of acceptance (configurable 1–7).
- Balance: due no later than 14 days before setup start by default (configurable, minimum 3 days).
- If acceptance happens inside the balance window, the full amount is due at acceptance (single payment).
- Security deposit: collected with the balance (default) or with the deposit; never commissionable or taxed; held until claim window closes.
- Bookings are **Confirmed** only when the contract is fully signed **and** the deposit is paid.

### 11.3 Escrow model

- All organizer funds (and, P2, attendee ticket payments) are collected into Spot-In's platform account at a licensed payment provider and tracked per booking or listing in Spot-In's ledger; venue and organizer sub-accounts receive funds only on release.
- Release events: (a) post-event release T+2 business days after dismantle end (venues) or T+3 business days after the last session (ticket revenue); (b) cancellation settlement (venue's retained share per policy); (c) dispute decision; (d) optional partial early release for trusted venues (MVP config) or organizers (P3).
- **Legal check required (§15):** confirm the arrangement fits Bank Indonesia payment regulations through the provider's licensed services, so that Spot-In itself does not need a payment licence — for both rental and ticket flows.

### 11.4 Tax handling (summary; validate with tax adviser)

| Item | Treatment in product |
|---|---|
| Rental of space in land/buildings | Venue's income; PPN charged if venue is PKP (rate configurable); service charge per venue config |
| PPh Final 4(2) | 10% of gross rental value, withheld by corporate tenants that are withholding agents. Organizer declares withholding at acceptance; invoices show net payable; organizer uploads bukti potong per payment; tracked as "slip outstanding" until uploaded. Individuals typically do not withhold — venue self-pays (outside Spot-In). |
| Add-ons that are services (security, cleaning, AV) | May fall under different tax treatment than rent — configurable tax category per add-on (open question) |
| Spot-In organizer service fee, venue commission and ticketing fee | Spot-In's own revenue; PPN charged and Faktur Pajak issued via Coretax/PJAP |
| Stamp duty | E-meterai on contracts recording value at or above the stamp-duty threshold |
| Security deposit | Not income at collection; outside PPN/PPh unless forfeited (forfeiture treatment per adviser) |
| Event tickets (P2) | Regional PBJT on arts and entertainment (§11.7); not subject to PPN; organizer's income |
| Merchandise / goods at checkout (P3) | PPN applies (organizer's sale) |

### 11.5 Ranking and quality rules

- Venues' response rate and median response time are computed on the last 90 days of enquiries.
- Expired enquiries, venue cancellations and upheld disputes reduce ranking; sponsored placement never overrides filters.
- Organizers' event ranking is reduced by organizer cancellations (excluding force majeure), upheld reports and (P2) high refund or complaint rates over the last 180 days.

### 11.6 Ticketing money rules (Phase 2)

- All amounts are integer Rupiah. Per-ticket breakdown: face value − discount = net face value; PBJT = net face value × rate (rounded half-up per ticket); ticketing fee = net face value × fee % + fixed fee (on paid tickets only); total = net face value + PBJT + fee (if passed to buyer).
- When the organizer absorbs the fee, the buyer pays net face value + PBJT, and the fee is deducted from the payout.
- Promo codes discount face value only; PBJT is computed on the discounted value; fees are computed on the discounted value.
- Refund amounts: within-policy refunds return net face value + PBJT; the ticketing fee is kept by Spot-In except on organizer cancellation or material change, when everything is refunded.
- Comps (free tickets on a paid listing, issued through access codes or manual add) carry no fee and no PBJT unless the regional rule says otherwise (Q12).
- Payout and reserve rules: FR-M37-02 and FR-M37-03.

### 11.7 Regional entertainment tax (PBJT jasa kesenian dan hiburan)

- PBJT on arts and entertainment is a regional tax set by each kabupaten/kota (or DKI Jakarta) within the UU HKPD cap (generally up to 10%; higher bands apply only to nightlife venues such as discotheques, karaoke, bars and spas, which Spot-In does not support as event categories).
- Spot-In keeps an admin table of rates by region and category with effective dates and source references (FR-M24-03); the venue's location decides the region.
- The organizer is the taxpayer: they confirm the rate and any exemption per listing (free events are not taxed), the tax is shown separately to buyers, and Spot-In passes the collected PBJT to the organizer in the payout with reports (FR-M37-06).
- Whether any region requires ticket registration/validation with the regional revenue office before sale, or treats the platform as a collector, is an open question (Q12); the data model can record a ticket-validation reference per listing.

### 11.8 Free registration rules (MVP)

- Free listings, registrations, passes, reminders and check-in are free to organizers and attendees.
- Spot-In may limit free usage by organizer tier: Tier 0 organizers may only publish listings linked to a Spot-In booking; capacity above 5,000 per session requires Tier 1 or Company tier and Spot-In ops review.
- Announcements by email and in-app are free; WhatsApp announcements (P2) are charged at cost.

---

## 12. Edge cases and error states

### 12.1 Availability and booking

| Case | Expected behaviour |
|---|---|
| Two organizers accept quotes for the same space/time at the same moment | Atomic check on acceptance; first commit wins and creates the booking hold; the second sees "These dates were just taken" with options: ask venue for alternatives, view similar spaces; venue notified to revise or withdraw the losing quote. |
| Venue sends a quote for dates already booked | Quote builder blocks sending; shows the conflicting booking reference (to venue only). |
| Parent/child conflict (organizer books "Half East" while "Main Atrium" quote is pending) | Child booking hold blocks parent; pending parent quotes flagged "conflict – revise" and cannot be accepted. |
| Tentative hold expires while organizer is mid-payment of deposit | Not possible: tentative holds convert to booking holds at acceptance; booking hold lasts until the deposit deadline. If deposit paid after deadline (late VA callback), system checks availability: if still free, confirm; if not, auto-refund in full and notify. |
| Venue blocks dates that overlap an existing hold | Allowed only after releasing the hold explicitly; holder notified. Blocks cannot overlap confirmed bookings. |
| Event spans midnight or multiple days with different hours | Schedule stored as discrete intervals (setup, event days, dismantle) in property time zone; pricing per interval. |
| Organizer in a different time zone from the property | All event times shown in property time zone with label; user's local time on hover. |
| Public holidays and mall closures | Venue season/closure calendars; enquiries on closed days warn but are allowed for special arrangements. |
| Space unpublished or venue suspended with open enquiries/bookings | Enquiries auto-declined with reason; confirmed bookings continue; Spot-In ops reviews each and contacts organizers. |
| Listing price changes after quote sent | Quotes are snapshots; unaffected. |
| Organizer edits event after quotes sent | Quotes marked "Event changed – review"; acceptance blocked until venue re-confirms or revises. |

### 12.2 Enquiries, quotes and approvals

| Case | Expected behaviour |
|---|---|
| Venue never replies | Auto-expire at deadline; organizer notified with similar-space suggestions; response metrics updated. |
| Approver unavailable | Approval request escalates to Owner/Admin after 24 h; quote validity clock does not start until sent. |
| Approver edits a quote | Edits create a new draft version; leasing member notified; approval trail retained. |
| Organizer tries to accept an expired or superseded version | Blocked; shows latest version. |
| Spam / mass enquiries | Rate limits (max 10 spaces per send, 30 open per event, 50 per day per org); Tier 0 accounts limited further; venues can report spam. |
| Proposal attachment fails virus scan | File rejected with message; other files kept. |
| Off-platform contact attempts in messages | Masking + warning; repeated attempts flagged to Trust & Safety. |

### 12.3 Contracts and signatures

| Case | Expected behaviour |
|---|---|
| Signer fails identity verification at provider | Signer sees provider's reason; can retry or reassign signing to another authorized signatory; deadline unchanged unless ops extends. |
| Signer not authorized (no signatory flag) | Cannot be selected as signer. |
| E-sign provider outage | Contract shows "Signing temporarily unavailable"; retries; deadline auto-extended by outage duration (max 24 h), logged. |
| E-meterai quota exhausted / affix fails | Finance alert; contract held in "awaiting meterai"; booking deadline extended; user sees status. |
| Contract signed by organizer but venue doesn't sign by deadline | Booking lapses; any deposit paid is fully refunded; venue's response metrics penalized. |

### 12.4 Payments, refunds and payouts

| Case | Expected behaviour |
|---|---|
| VA expired before payment | Organizer can generate a new VA until the payment deadline. |
| Payment succeeds at provider but webhook delayed/lost | Poll provider status for pending payments; reconcile daily; user sees "Processing" not "Failed". |
| Duplicate webhook | Idempotent processing; no double ledger entries. |
| Payment made by manual transfer with wrong amount | Exception queue; Finance contacts organizer; booking deadline paused only by Finance decision. |
| Card payment declined / 3DS fails | Clear error; suggest another method; no booking state change. |
| Refund to closed/invalid bank account | Refund fails → payer asked to update account; retried; Finance alerted after 2 failures. |
| Chargeback after event | Booking flagged; evidence pack; if lost, Spot-In recovers from venue only if service not delivered (per terms), otherwise absorbs and pursues organizer; organizer account restricted. |
| Venue bank account changed shortly before payout | 48 h payout hold + notification to all venue Owners/Finance. |
| Payout fails (bank rejects) | Status "Failed – update bank details"; funds stay in escrow; retry after fix. |
| Organizer withholds PPh 4(2) but never uploads bukti potong | Reminders at 7, 14, 30 days; flag on organizer profile visible to venues; does not block venue payout (venue receives net cash) but appears in venue statement as "slip outstanding". |
| Organizer declares no withholding but deducts anyway | Closed VA amounts prevent underpayment; mismatch handled via Finance exception. |
| Venue not PKP | No PPN lines; invoices state non-PKP status. |
| Rounding | All money in integer Rupiah; tax computed per invoice line (and per ticket for PBJT), rounded half-up; totals reconcile to the Rupiah. |

### 12.5 Event operations, claims and disputes

| Case | Expected behaviour |
|---|---|
| Mandatory documents missing at T-3 days | Booking marked "At risk"; both sides and Spot-In ops alerted; venue may refuse load-in per contract (logged). |
| Insurance certificate expires before event | Item auto-reverts to "Changes requested" with reason. |
| Organizer denied access on event day | Urgent support line; dispute can be opened immediately; funds frozen; attendees of a linked listing are notified only once the organizer or ops decides to postpone or cancel. |
| Event overruns dismantle window | Venue logs overtime in handover; claim for overtime per contract rate. |
| Claim exceeds security deposit | Excess requires organizer agreement or dispute decision; collection beyond held funds handled off-platform in MVP (stated in terms). |
| Both parties unresponsive in dispute | Decision made on available evidence after SLA. |
| Force majeure (flood, government restriction) | Either side requests; ops decides; reschedule-or-refund flow; linked listing follows §6.19 (postpone or cancel). |

### 12.6 Accounts and organizations

| Case | Expected behaviour |
|---|---|
| Sole Owner wants to delete account with active bookings or live listings | Blocked; must transfer ownership or complete/cancel bookings and listings first. |
| Attendee deletes account with upcoming passes | Warned; on confirmation passes are cancelled (P2 paid: refund per policy only if within policy, otherwise passes must be transferred or the deletion waits until after the event). |
| Member leaves company with assigned enquiries or listings | Reassignment on removal (FR-M2-09); unassigned items go to Owner. |
| User belongs to both an organizer org and a venue operator | Allowed; cannot enquire to a space owned by an operator they belong to (conflict check). |
| KYB rejected | Operator sees reasons; can resubmit; listings remain unpublished. |
| Duplicate property listed by two operators (e.g., mall management and an agent) | Verification checks right-to-rent; duplicates merged or rejected; only the verified rights holder can list. |
| Account compromise suspected | Force logout all sessions, freeze payouts and bank changes, freeze pass transfers, require re-verification. |

### 12.7 Generic error states (UI)

| State | Copy and behaviour |
|---|---|
| Network offline | Banner "You're offline — changes will not be saved"; forms keep local drafts; My tickets and the scanner keep working from cache. |
| Session expired mid-form | Re-auth modal; draft preserved; checkout hold timer keeps running and is shown. |
| Permission denied | "You don't have access to this — ask an Admin of {org}"; no data leakage in error. |
| Not found / removed listing | Friendly page with similar spaces or similar upcoming events. |
| Provider outage (payment, e-sign, tax, WhatsApp) | Feature-specific status message, retry, and fallback channel (email for notifications). |
| Validation errors | Inline, field-level, bilingual; summary at top for long forms. |
| Server error | Generic message with reference ID; auto-reported. |

### 12.8 Event listings, registration and check-in

| Case | Expected behaviour |
|---|---|
| Linked booking cancelled or lapsed while the listing is published | Listing → Venue change pending; registration paused; 72 h to move or cancel; auto-cancel and notify registrants if no action (§6.21). |
| Booking dates changed by addendum | Sessions outside new booked dates flagged; listing cannot be (re)published until fixed; registrants of moved sessions are notified when the organizer saves the change. |
| Organizer tries to publish a session outside the booked event days, or during setup/dismantle | Blocked with the booked windows shown. |
| Capacity set above the space's layout capacity or the quote's admitted maximum | Blocked; shows the limit and its source. |
| Organizer lowers capacity below current registrations | Blocked; organizer must cancel specific registrations first (with message), or keep capacity. |
| Two people take the last spot at the same moment | Atomic counter; one gets the pass, the other is offered the waitlist with a message. |
| Waitlist offer accepted after it expired (stale tab) | Rejected with "This offer has expired"; shows current waitlist position or availability. |
| Venue approval not given before the scheduled publish time | Listing stays Pending venue approval; organizer notified; escalation per FR-M28-08. |
| Venue requests changes after publish (content complaint) | Venue can flag a published linked listing; organizer has 24 h to edit; otherwise Spot-In ops reviews and may unpublish. |
| Event published at an external venue that turns out to be a Spot-In property | Ops can link it; if the property requires approval, the listing is sent for venue approval without unpublishing (unless the venue objects). |
| Attendee registers for overlapping sessions of different events | Allowed with a warning. |
| Same person creates several accounts to exceed limits | Phone uniqueness per account; device and pattern checks; organizer sees "possible duplicate" flags; P2 per-ID limits for named tickets. |
| Under-18 registrant's guardian doesn't confirm | Registration stays pending for 48 h (or until 2 h before start), then is cancelled; capacity released. |
| Screenshot of a free pass shared with a friend | First scan admits; second scan shows "Already checked in at {time} by {gate}" with the holder's name so staff can check. |
| Scanner device offline for the whole session | Scans continue from the manifest; synced on reconnection; duplicates across devices reported in the post-event check-in report. |
| Pass reissued (e.g., name change) after the device downloaded the manifest | Old version rejected once the device syncs; offline devices accept only the highest version they know and reconcile later. |
| Check-in staff access window expired mid-shift | Organizer can extend it from the dashboard; staff see "Access ended – ask the organizer". |
| External ticket link becomes broken or flagged unsafe | Daily check; organizer warned; unsafe links disabled immediately and replaced with "Tickets unavailable". |
| Organizer suspended with live listings | Listings hidden; registrants notified that the event is under review; P2 payouts held; ops decides cancel/refund. |
| Event in progress when the organizer cancels (e.g., weather) | Remaining sessions cancelled; registrants of future sessions notified; P2 refunds per §6.19; checked-in attendees of the current session get a notice. |
| Mall closed by authorities on event day | Linked booking → force majeure (FR-M18-07); listing → postponed or cancelled by organizer or ops; registrants notified urgently (quiet hours do not apply). |
| Listing timezone differs from attendee's device | Times always shown in venue time zone with label; reminders scheduled in venue time. |
| Organizer imports guests with invalid phone/email | Invalid rows rejected in a report; valid rows imported; no partial passes. |

### 12.9 Paid ticketing (Phase 2)

| Case | Expected behaviour |
|---|---|
| Payment confirmed after the checkout hold expired | If inventory is still free, the order completes; otherwise the payment is refunded in full automatically and the buyer is offered the waitlist. |
| Webhook delayed | Order shows "Processing payment"; status polled; no second payment allowed for the same hold. |
| Promo code reaches its usage limit while two buyers are checking out | Code usage reserved at hold time; the later buyer sees the code expire before paying, with the price recomputed. |
| Price tier switches during checkout | Price locked at the start of the hold; new holds use the new tier. |
| Organizer edits ticket type quantity below sold + held | Blocked. |
| Buyer requests refund after transferring the ticket | Only the current holder can request a refund; refund goes to the original payer; transfer chain recorded. |
| Transfer to a recipient who would exceed per-account or per-ID limits | Transfer blocked with the reason. |
| Named ticket with a mistyped ID number | Holder can correct the name/ID once until the transfer lock; later changes only by the organizer with audit. |
| Waiting-room token reused, shared or replayed | Tokens are single-use, bound to account and device; reuse is rejected and logged. |
| Bot traffic during an on-sale | Edge challenges; suspicious accounts limited to the waitlist; orders from flagged devices held for review before passes are issued. |
| Refund to an e-wallet that is closed | Refund fails → buyer asked for a verified bank account; retried; Finance alerted after 2 failures. |
| Chargeback after the attendee checked in | Evidence pack includes scan records; Spot-In contests; if lost, amount recovered from the organizer's pending payouts or reserve per terms. |
| Organizer cancels after the event's payout was made (P3 early payout or late cancellation of a later session) | Refunds issued from reserve and pending payouts first; remaining amount invoiced to the organizer; Spot-In covers buyers' refunds and pursues recovery. |
| PBJT rate changes between sale and event | Rate locked per order at purchase; reports show both rates. |
| Region where the organizer declares PBJT exemption | Exemption reason required and shown in reports; listing flagged for Finance sampling. |
| Event postponed to a date the buyer can't attend | Refund window per FR-M35-07; after it closes, standard policy applies. |
| High refund rate after event (complaints) | Payout hold (FR-M37-09); complaint cases reviewed in Disputes. |

---

## 13. Acceptance criteria

Format: **Given / When / Then**. Criteria cover MVP scope unless marked P2; each FR is also accepted when its table row behaviour is demonstrable in staging.

### AC-M1 Accounts

1. **Given** a new visitor, **when** they sign up with email and verify it and their phone via OTP, **then** they can create an enquiry; **and** an unverified user attempting to enquire is prompted to verify first.
2. **Given** a venue Owner, **when** they log in without 2FA set up, **then** they are required to enrol 2FA before accessing the dashboard.
3. **Given** a user with two memberships, **when** they switch organization, **then** all data shown (enquiries, bookings, listings, finance) belongs only to the selected organization.
4. **Given** a visitor without an account on an event page, **when** they tap Register and verify their phone by OTP, **then** an account is created and the registration completes in the same flow without setting a password.

### AC-M2 Organizations and roles

1. **Given** a Leasing member scoped to Mall A, **when** they open the pipeline, **then** they see only Mall A enquiries; **and** direct URL access to a Mall B enquiry returns a permission error.
2. **Given** an approval rule "total > Rp 150.000.000", **when** a Leasing member sends a Rp 200.000.000 quote, **then** it goes to Pending approval and is not visible to the organizer until approved.
3. **Given** a member is removed, **when** they had open enquiries or listings, **then** the remover must choose a reassignee before removal completes.
4. **Given** check-in staff invited to one listing, **when** they log in, **then** they can only open the scanner for that listing during the access window and cannot see attendee emails, phones or answers.

### AC-M3 Verification

1. **Given** an operator with KYB pending, **when** they try to publish a space or send a quote, **then** the action is blocked with an explanation.
2. **Given** a venue changes its payout bank account, **when** the change is saved, **then** 2FA is required, all Owners/Finance are notified, and payouts are held 48 hours.
3. **Given** a verified operator, **then** the Verified badge appears on all of its published listings.
4. **Given** a Tier 0 organizer, **when** they try to publish a listing at an external venue, **then** they are asked to complete Tier 1 identity verification first; listings linked to their confirmed Spot-In booking can be published.

### AC-M4/M5 Listings and pricing

1. **Given** a parent space with two children, **when** a child is booked for 12–14 Dec, **then** the parent shows unavailable for those dates, and the sibling remains available.
2. **Given** a space with weekend and Lebaran season rates, **when** an organizer runs a quick estimate across those dates, **then** each day uses the correct rate and setup/dismantle days use the setup rate, labeled non-binding.
3. **Given** a listing in Draft, **when** submitted, **then** it enters review and is not visible in public search until approved.
4. **Given** "price on request" is chosen, **then** an indicative from-price is still required and displayed.

### AC-M6 Calendar and holds

1. **Given** a 1st-option tentative hold and a queued 2nd-option hold, **when** the 1st expires, **then** the 2nd is promoted, and both organizers are notified.
2. **Given** two acceptance requests for the same slot within milliseconds, **then** exactly one booking hold is created and the other request receives a conflict error.
3. **Given** a buffer of 4 hours, **when** a venue tries to quote a booking starting 2 hours after another ends, **then** the quote is blocked.

### AC-M7/M8 Search and shortlists

1. **Given** dates are entered in search, **then** spaces with blocks/bookings overlapping those dates are excluded by default.
2. **Given** a filter "power ≥ 30 kVA" and "allows F&B sampling", **then** only spaces meeting both appear, in list and map views.
3. **Given** a shared shortlist link, **when** opened by a non-logged-in person, **then** they see spaces, notes and indicative prices but cannot see messages or quotes; **and** after revocation the link shows "no longer available".
4. **Given** three quotes in one event, **then** the comparison table shows totals, per-day cost, deposit terms and cancellation summaries aligned per venue and exports to PDF.
5. **Given** the search page, **when** the user switches between Events and Spaces modes, **then** results never mix events and spaces and the chosen mode is remembered.

### AC-M9/M10 Enquiries and messaging

1. **Given** an event with a proposal deck, **when** the organizer sends an enquiry to three spaces, **then** three independent threads are created, each venue sees the deck, and each has its own deadline.
2. **Given** an enquiry receives no venue action for 2 business days, **then** it becomes Expired, the organizer is notified with similar spaces, and the venue's response rate updates.
3. **Given** a message containing a phone number before confirmation, **then** the number is masked for the recipient and the sender sees a notice; **after** confirmation, PIC phone numbers are visible in the booking.
4. **Given** a venue declines, **then** a reason is required and shown to the organizer.

### AC-M11 Site visits

1. **Given** published slots, **when** an organizer requests one and the venue confirms, **then** both receive an .ics invite and reminders at 24 h and 2 h.

### AC-M12 Quotes

1. **Given** a quote draft from the rate card, **then** line items, service charge, PPN, organizer fee, security deposit and payment schedule compute correctly to the Rupiah and match the PDF.
2. **Given** a sent quote v1 and a revision v2, **then** the organizer sees a diff, can only accept v2, and v1 is read-only.
3. **Given** a quote past its validity date, **then** it cannot be accepted and shows Expired.
4. **Given** a balance due date less than 3 days before setup, **then** the quote cannot be sent.

### AC-M13 Contracts

1. **Given** an accepted quote, **then** a contract PDF is generated within 60 seconds containing parties, schedule, price breakdown, payment schedule, cancellation policy and required documents, matching the accepted version.
2. **Given** a contract value at or above the stamp-duty threshold, **then** an e-meterai is affixed before signatures and both parties can download the fully signed PDF with audit trail.
3. **Given** the venue signatory hasn't signed by the deadline, **then** the booking lapses and any deposit is fully refunded.

### AC-M14 Payments and escrow

1. **Given** a booking pending deposit, **when** the organizer pays via VA, **then** the payment is recorded via webhook, the ledger shows funds in escrow, and if the contract is fully signed the booking becomes Confirmed and competing enquiries are notified.
2. **Given** the deposit deadline passes unpaid, **then** the booking lapses, the hold is released, and both parties are notified.
3. **Given** a duplicate webhook for the same payment, **then** only one payment and one set of ledger entries exist.
4. **Given** a company organizer on invoice terms, **then** each invoice has a unique closed VA with the exact amount.

### AC-M15 Invoices and tax

1. **Given** a company organizer declared PPh 4(2) withholding, **then** rental invoices show gross rent, PPN (if PKP), PPh 4(2) at 10% of gross rent, and net payable; the VA amount equals the net payable; and a "withholding slip outstanding" task appears until uploaded.
2. **Given** a payment, **then** a venue rental invoice and a separate Spot-In service-fee invoice are issued with correct issuers and sequential numbers.
3. **Given** a cancelled invoice, **then** a credit note is issued and the original remains in the registry.

### AC-M16 Payouts

1. **Given** a completed booking with no claim or dispute, **then** the venue's net amount (rental − commission − adjustments) is paid out T+2 business days after dismantle end, and the security deposit is refunded to the organizer after the claim window.
2. **Given** an open dispute, **then** payout and security-deposit refund for that booking are held until decision.
3. **Given** daily reconciliation finds a mismatch with provider reports, **then** Finance receives an alert listing the affected bookings or listings.

### AC-M17 Event workspace

1. **Given** a property with required documents, **when** a booking is confirmed, **then** the checklist is created with due dates computed from the event start.
2. **Given** a mandatory item not approved at T-3 days, **then** the booking shows At risk and both sides plus Spot-In ops are notified.
3. **Given** check-in, **then** venue ops can record photos, readings and notes, and the organizer can acknowledge them in-app.
4. **Given** a confirmed booking, **then** the workspace shows a "Publish this event" action that opens a listing draft prefilled with venue, space, event days and capacity ceiling.

### AC-M18 Changes and cancellations

1. **Given** a Moderate policy and an organizer cancelling 20 days before the event, **then** the refund shown before confirmation equals the policy tier amount, and the executed refund matches it.
2. **Given** a venue cancellation, **then** the organizer receives a full refund including the Spot-In fee, and the venue penalty is recorded.
3. **Given** an approved date change, **then** new dates are held, an addendum is signed, price difference is invoiced or refunded, and old dates are released only after signing.

### AC-M19 Claims and disputes

1. **Given** a claim filed within 72 hours of dismantle end for less than the security deposit, **when** the organizer does not respond in 3 business days, **then** the claim is auto-accepted and deducted from the deposit, with the remainder refunded.
2. **Given** an open dispute, **when** Disputes records a decision, **then** the corresponding refunds/payouts execute automatically and both parties receive the decision with rationale.

### AC-M20 Reviews

1. **Given** a completed booking, **then** both parties are invited to review; reviews publish only when both submit or after 14 days.
2. **Given** a venue-cancelled booking, **then** the organizer can review the venue, and the review is labeled "Venue cancelled".
3. (P2) **Given** an attendee who never checked in, **then** they cannot review the event; a checked-in attendee can review within 14 days.

### AC-M21 Notifications

1. **Given** a new enquiry, **then** the assigned venue members receive in-app, email and WhatsApp notifications (per preferences) within 1 minute, deep-linking to the enquiry.
2. **Given** quiet hours, **then** non-urgent WhatsApp messages are deferred until 07:00 recipient time; an event cancellation within 24 hours of start is sent immediately.
3. **Given** a user following 12 organizers that publish 15 events in one day, **then** the user receives at most 3 new-event notifications that day and the rest appear in the in-app inbox.

### AC-M22 Dashboards

1. **Given** a venue Owner, **then** analytics show enquiries, quotes, bookings, conversion, median response time, occupancy, and registrations/check-ins at the property's events for a selected period, matching raw data exports.

### AC-M24 Admin

1. **Given** an admin changes the organizer fee rate, **then** only quotes created after the change use the new rate, and the change is in the audit log.
2. **Given** a manual refund above the threshold, **then** a second Finance user must approve before execution.
3. **Given** Trust & Safety removes a listing, **then** it disappears from search and its page shows "This event is no longer available", registrants are notified, and the action is in the audit log.

### AC-M25 Localization

1. **Given** a property in Bali (WITA), **then** all event times on its listing, quotes, contracts, event pages, passes and notifications are shown in WITA with the label, regardless of the viewer's time zone.
2. **Given** language set to Bahasa Indonesia, **then** all UI, emails, WhatsApp templates, invoices, quote PDFs, passes and receipts render in Indonesian.

### AC-M28 Event listings

1. **Given** a confirmed booking for 12–14 Dec with setup on 11 Dec, **when** the organizer creates a listing, **then** sessions can only be scheduled on 12–14 Dec, and venue, address, map and floor-plan pin are filled from the booking.
2. **Given** a property requiring listing approval, **when** the organizer submits a linked listing, **then** it is not visible publicly until a venue member with permission approves it, and requested changes are shown per field to the organizer.
3. **Given** a space with standing capacity 500 and a quote maximum of 400, **when** the organizer sets capacity 450, **then** publishing is blocked with "Maximum 400 (agreed in quote v2)".
4. **Given** a published listing with 120 registrants, **when** the organizer changes the session start time, **then** a confirmation shows "120 people will be notified", all 120 receive the update, and the page shows the change note.
5. **Given** an unlisted listing, **then** it is reachable by link, absent from search and sitemaps, and marked noindex.

### AC-M29 Event discovery

1. **Given** a visitor in Jakarta on Saturday at 15:00 WIB, **when** they open "Happening now", **then** only sessions in progress at that time in Jakarta-area venues are shown.
2. **Given** filters "Free" and "Workshop & class" within 10 km, **then** only matching published listings appear in list, map and calendar views, and ended or cancelled listings never appear.
3. **Given** a property with "What's on" enabled, **then** its property page lists its upcoming and happening public listings, and unlisted/private listings are not shown.
4. **Given** a user follows Mall A, **when** a new public listing at Mall A is published, **then** the user is notified per their preferences and frequency cap.
5. **Given** a public listing page, **then** its HTML contains valid schema.org Event data whose eventStatus changes to cancelled or postponed when the listing does.

### AC-M30 Registration and RSVP

1. **Given** a session with capacity 100 and 99 registrations, **when** two people submit at the same moment, **then** exactly one gets a pass and the other is offered the waitlist.
2. **Given** an approval-required listing, **then** registrants see Pending and receive no pass until approved; approvals stop at capacity.
3. **Given** a waitlist with offer mode and a 12-hour window, **when** a registrant cancels, **then** the first waitlisted person gets an offer, and if unclaimed after 12 hours the offer moves to the next person.
4. **Given** an all-ages listing, **when** a registrant indicates they are under 18, **then** a pass is issued only after the guardian confirms by OTP.
5. **Given** a listing allowing +2 guests with names required, **then** a registration with 2 guests yields 3 passes, each with its own name and QR.

### AC-M31 Passes

1. **Given** a confirmed registration, **then** the pass appears in My tickets, by email and by WhatsApp link within 1 minute, and opens offline after first load.
2. **Given** a pass reissued after a name change, **then** the previous QR is rejected by an online scanner with "Outdated pass – ask the attendee to refresh".
3. (P2) **Given** a listing with rotating QR, **then** a screenshot taken more than 60 seconds earlier is rejected and the live code is accepted.

### AC-M32 Check-in

1. **Given** a valid pass, **when** scanned, **then** the scanner shows green with name and ticket type in ≤ 500 ms online, and the dashboard count increases within 5 seconds.
2. **Given** a pass already checked in, **when** scanned on another device, **then** the scanner shows red "Already checked in" with time, gate and staff.
3. **Given** a device in airplane mode with a downloaded manifest, **when** 200 passes are scanned, **then** all are validated offline and synced on reconnection without duplicate admissions in the report.
4. **Given** a linked booking, **then** venue operations sees live check-in counts without personal data and gets an alert at 90% of admitted capacity.

### AC-M33 Communications and analytics

1. **Given** a session tomorrow at 10:00, **then** registrants receive reminders at 10:00 today and 08:00 tomorrow (venue time) with directions.
2. **Given** an organizer has sent 3 announcements today for a listing, **when** they try a 4th, **then** it is blocked until the next day.
3. **Given** an export of attendees, **then** it contains only fields collected for that listing and the export is recorded in the org audit log.
4. **Given** traffic from a WhatsApp share link, **then** listing analytics attribute the visits and registrations to that link.

### AC-M34 Paid ticketing (P2)

1. **Given** an organizer without a verified payout account, **when** they choose Paid tickets, **then** setup is blocked with the missing steps listed.
2. **Given** a ticket of face value Rp 300.000, PBJT 10% and a 4% + Rp 2.000 fee passed to the buyer, **then** the all-in price shown is Rp 344.000 (300.000 + 30.000 + 14.000) on the listing, at checkout and on the receipt.
3. **Given** a limit of 1 ticket per NIK per session, **when** a second order uses the same NIK, **then** it is blocked at the attendee-details step.
4. **Given** 10 remaining tickets and 50 buyers in checkout, **then** no more than 10 tickets are ever sold; expired holds return to inventory.
5. **Given** a waiting room with 10,000 users when sales open, **then** users present before opening receive randomized positions, each admitted user's token works once, and sales do not exceed inventory.

### AC-M35 Orders, refunds and transfers (P2)

1. **Given** an organizer cancels a paid listing with 500 orders, **then** all orders are refunded in full including fees, refunds are initiated within 1 business day, and buyers see refund status.
2. **Given** a "Refundable until 7 days before" policy, **when** a buyer requests a refund 10 days before, **then** it is approved automatically for face value + PBJT; at 5 days before, the request goes to the organizer.
3. **Given** a transferable pass, **when** the holder transfers it and the recipient accepts, **then** the recipient holds a new pass version and the sender's QR is rejected.
4. **Given** a transfer lock 24 hours before doors, **then** transfer actions are disabled after that time.
5. **Given** a postponement, **then** tickets remain valid for the new date and buyers can request a full refund for 14 days.

### AC-M36 Trust and safety

1. **Given** an organizer's first listing, **when** they publish, **then** it is held for review and published only after approval.
2. **Given** an external ticket link on a blocklisted domain, **then** the listing cannot be published with that link.
3. **Given** 3 scam reports on a listing within 24 hours, **then** it is hidden from search pending review and Trust & Safety is alerted.

### AC-M37 Ticketing finance (P2)

1. **Given** a listing whose last session ended on Friday with no holds, **then** the organizer payout (face value + PBJT − refunds − absorbed fees − reserve) is sent T+3 business days later with a statement that reconciles to the ledger.
2. **Given** a new organizer, **then** 10% of the payout is reserved and released after 14 days if no chargebacks occur.
3. **Given** a listing in DKI Jakarta in the concert category, **then** the proposed PBJT rate is the current admin-table rate, the organizer must confirm it, and the monthly PBJT report shows collected amounts by region.

### AC-NFR

1. Public listing pages and event pages meet LCP ≤ 2.5 s (p75, 4G) in synthetic tests.
2. Penetration test before launch has no open high/critical findings; a second test before paid ticketing goes live has none either.
3. A data-subject access request can be fulfilled in-app with a downloadable export of the user's personal data, including registrations and passes.
4. (P2) A load test simulating 300,000 concurrent waiting-room users and 3,000 orders/min completes with no oversell and checkout p95 ≤ 2 s.
5. ID numbers collected for named tickets are unreadable in database dumps without the field key and are deleted 90 days after the session.

---

## 14. Release plan

| Milestone | Content | Exit criteria |
|---|---|---|
| **Alpha (internal)** | M1–M8, M9–M12 (no payments), admin basics; M28 listing drafts and public event pages, M29 basic events search | Venue can list and quote; organizer can enquire and compare; an organizer can publish a test event page |
| **Private beta** | + M13–M17, M21, M24 finance; M30–M33, M36 (free RSVP, passes, check-in, communications, moderation); 10–20 hand-onboarded Jabodetabek venues (mix of malls, halls, outdoor), 30–50 organizers, events at beta venues published publicly | 20 end-to-end paid bookings, zero ledger mismatches, legal sign-off on contract/terms; 30 published events with ≥ 3,000 registrations and ≥ 5 events checked in with the scanner, including one offline session |
| **MVP public launch (Jabodetabek)** | All MVP modules incl. M18–M20, M22, M25, M26; events home per city, "What's on" on property pages, follows | §3.3 baseline instrumented; support playbooks (booking, attendee, event-day) live; PSE registration done; content policy published |
| **Phase 2a — paid ticketing pilot** | M34, M35, M37 for 5–10 invited organizers, listings up to 2,000 capacity, no waiting room; Wallet passes; attendee reviews | ≥ 5,000 paid tickets sold, zero oversell, reconciliation clean, refund flows exercised (incl. one cancellation), tax adviser sign-off on PBJT handling, second penetration test passed |
| **Phase 2b** | Paid ticketing for all eligible organizers; waiting room, rotating QR, transfers, wristband redemption; promoted listings and events, interactive floor plans, calendar sync, badges, roadshow checkout, booking and ticket widgets, advanced analytics, venue faktur via PJAP, access passes, SEO collections, 360° tours, recommendations, recurring series; expand to Surabaya, Bandung, Bali | Promoted-listing revenue live; venue NPS ≥ 30; one on-sale ≥ 10,000 tickets handled through the waiting room within SLAs |
| **Phase 3** | AI assistance, concierge, white-label portals, lead marketplace, vendor marketplace, BNPL, embedded insurance, public API; face-value resale via waitlist, presale lottery, door sales, early payouts, merchandise, ticket revenue → venue balance | Per business case |

---

## 15. Risks, assumptions and open questions

### 15.1 Risks

| Risk | Mitigation |
|---|---|
| Off-platform leakage after first contact | Contact masking, escrow protection as a selling point, reviews and documents only on-platform, low organizer fee, payment guarantees for venues; free listing, RSVP and check-in tools give organizers a reason to stay |
| Malls slow to adopt / insist on own contracts | Group plan with custom templates, approval workflows matching their process, hand-held onboarding, white-label later; "What's on" pages as visible value for mall marketing |
| Regulatory exposure on holding funds | Use provider's licensed escrow/sub-account services; legal opinion before beta and again before paid ticketing |
| Tax complexity (PPN, PPh 4(2), service add-ons, regional PBJT) | Tax adviser review, configurable tax categories and regional rate table, venue issues its own rental faktur in MVP, organizer remains PBJT taxpayer |
| E-sign/e-meterai provider dependency | Adapter layer, outage handling, second provider evaluated |
| Low supply quality / fake listings | KYB + right-to-rent verification, review moderation |
| Chicken-and-egg liquidity | Supply-first in Jabodetabek, concierge-style manual matching in beta, SEO pages; events side seeded by events booked through Spot-In and malls' own programmes |
| Thin event catalogue at launch makes the events side look empty | City-level launch only where enough events exist; malls' own events (FR-M28-16); editorial collections; external-venue events from verified organizers; hide categories with no events |
| Scam or fake events and ticket fraud | Organizer verification tiers, first-listing review, link scanning, reports, signed passes, escrow with payout after the event, reserves for new organizers |
| On-sale traffic spikes break the site | Edge-hosted waiting room, load tests, separate scaling for checkout, pilot phase capped at 2,000 capacity |
| Scalping and identity-based limits create privacy risk | Named tickets optional per listing, encrypted ID numbers, masking, short retention, DPIA before launch |
| Children's data | Guardian consent flow, organizer option to disallow minors, no profiling of under-18 users for recommendations |
| Crowd-safety incidents at events listed on Spot-In | Capacity enforcement, venue live counts and alerts, permit attestations/uploads above thresholds, clear terms on organizer responsibility |
| Competition from established ticketing platforms | Differentiate on the venue link (booked venue, mall "What's on", one workflow from booking to check-in), free tools for free events, external ticket links so organizers can keep their ticketing partner |

### 15.2 Assumptions

- Spot-In is a marketplace and payment agent; the rental contract is between the venue and the organizer, and the ticket contract is between the organizer and the attendee (Spot-In sells as the organizer's agent).
- Bookings range from a few hours to 90 days.
- Malls accept escrow with post-event release when paired with a payment guarantee; trusted venues may get partial early release.
- WhatsApp is the preferred notification channel for all sides, and attendees accept phone-OTP login.
- Organizers accept ticket payouts after the event in exchange for escrow-backed buyer trust; established organizers may need early payouts (P3) to switch.
- Most events in the first year are free or low-price, general-admission events in malls and halls; large concerts are a Phase 2b target.

### 15.3 Open questions

| # | Question | Owner |
|---|---|---|
| Q1 | Final commission %, organizer fee %, caps, and whether commission varies by space type (e.g., atrium vs hall). | Business |
| Q2 | Escrow structure legal opinion (Bank Indonesia payment rules) and Spot-In's role in the contract (agent vs. platform only), for rentals and tickets. | Legal |
| Q3 | Tax treatment of service add-ons, security deposit forfeiture, and whether Spot-In fee invoices go to the organizer's billing entity or the EO's client. | Tax adviser |
| Q4 | Which e-signature provider (Privy, Mekari Sign, VIDA) — pricing, API limits, KYC flow; can the same provider run the standalone Tier 1 identity check? | Product / Eng |
| Q5 | Standard contract template content and governing law/dispute forum (e.g., BANI arbitration vs district court). | Legal |
| Q6 | Should venue Faktur Pajak upload be mandatory before payout for PKP venues? | Finance |
| Q7 | Required-document library per city (e.g., permits for crowd events) — who maintains it? Which attendance threshold triggers a permit upload for public listings? | Ops |
| Q8 | Do we allow organizers to pay venues directly for any items (e.g., electricity metered after the event)? Default: no; claims cover it. | Product |
| Q9 | Minimum listing quality bar and photo standards at launch; do we offer a photography service? | Ops / Growth |
| Q10 | Launch cities after Jabodetabek and timing. | Business |
| Q11 | Ticketing fee level (% + fixed), whether it differs by category or ticket price band, and whether free events above a size are charged. | Business |
| Q12 | PBJT: does any launch region treat the ticketing platform as collector or require ticket registration/validation (e.g., stamped or registered tickets) with the regional revenue office before sale? Is PBJT due on comps and on the service fee? | Tax adviser |
| Q13 | Legal basis and retention for collecting NIK on named tickets; is a DPIA plus explicit purpose notice sufficient under UU PDP / PP 33/2026? | Legal / DPO |
| Q14 | Default ticket refund policy and the organizer's liability for refunds if a cancelled event's funds are insufficient (e.g., after early payouts). | Legal / Finance |
| Q15 | Should venues be able to require that ticketed events at their spaces sell through Spot-In (and share in ticket revenue — P3 revenue-share)? | Business |
| Q16 | Which events need age verification beyond self-declaration (alcohol, 21+), and is an ID scan at the door sufficient? | Legal / Ops |
| Q17 | Do we accept political, religious and fundraising events, and under which rules? | Legal / Trust & Safety |
| Q18 | Waiting-room build vs buy, and which on-sale size triggers it by default. | Eng |

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

*This PRD is not legal or tax advice; items marked for legal/tax review must be confirmed with qualified advisers before build.*

