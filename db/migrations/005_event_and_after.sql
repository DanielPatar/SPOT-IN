-- Build 3: required documents (M17), cancellations (M18), post-event window and release (M16),
-- event pages, registration, passes and check-in (M28/M30/M31/M32/M36), contact messages (M26).

-- ---------------------------------------------------------------------------
-- Bookings: cancellation, no-show, problems, release
-- ---------------------------------------------------------------------------
alter table bookings
  add column cancelled_by uuid references users (id),
  add column cancel_reason text,
  add column cancellation jsonb,          -- figures shown and executed (FR-M18-04)
  add column no_show boolean not null default false,
  add column released_at timestamptz,
  add column settlement jsonb,            -- figures at release (FR-M16-09)
  add column settlement_file_id uuid references files (id),
  add column at_risk_reason text;

create table booking_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  name text not null,
  mandatory boolean not null default true,
  due_at timestamptz not null,
  status text not null default 'not_started' check (status in ('not_started', 'submitted', 'changes_requested', 'approved', 'waived')),
  reviewer_comment text,
  reviewed_by uuid references users (id),
  reviewed_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index booking_documents_booking_idx on booking_documents (booking_id);

create table booking_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references booking_documents (id) on delete cascade,
  version int not null,
  file_id uuid not null references files (id),
  uploaded_by uuid references users (id),
  created_at timestamptz not null,
  unique (document_id, version)
);

create table booking_problems (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  reported_by uuid references users (id),
  side text not null check (side in ('organizer', 'venue')),
  description text not null,
  photos jsonb not null default '[]',     -- [fileId]
  status text not null default 'open' check (status in ('open', 'resolved')),
  outcome text check (outcome in ('release_as_is', 'adjusted')),
  adjustment bigint,                      -- simulated amount moved from venue payable back to the organizer
  resolution_note text,
  resolved_by uuid references users (id),
  resolved_at timestamptz,
  created_at timestamptz not null
);
create index booking_problems_open_idx on booking_problems (booking_id) where status = 'open';

-- ---------------------------------------------------------------------------
-- Event pages, sessions, registrations, passes
-- ---------------------------------------------------------------------------
create table event_pages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references events (id),
  booking_id uuid not null references bookings (id),
  organizer_org_id uuid not null references organizations (id),
  slug text not null unique,              -- random, unguessable; the page is unlisted (FR-M28-05)
  title text not null,
  summary text not null check (char_length(summary) <= 160),
  description text not null default '',
  cover_file_id uuid references files (id),
  category text not null,
  age_note text,
  questions jsonb not null default '[]',  -- [{id, kind: text|choice|yesno, label, options?}] max 3 (FR-M30-02)
  close_mode text not null default 'session_start' check (close_mode in ('session_start', 'manual')),
  status text not null default 'draft' check (status in ('draft', 'live', 'registration_closed', 'ended', 'cancelled', 'removed')),
  manually_closed boolean not null default false,
  published_at timestamptz,
  removed_reason text,
  created_by uuid references users (id),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table event_sessions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references event_pages (id) on delete cascade,
  day date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null check (capacity > 0),
  taken int not null default 0 check (taken >= 0),
  unique (page_id, day),
  check (taken <= capacity)              -- capacity enforced atomically (FR-M30-04)
);

create table registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references event_sessions (id) on delete cascade,
  page_id uuid not null references event_pages (id) on delete cascade,
  user_id uuid not null references users (id),
  email citext not null,
  name text not null,
  answers jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  pending_expires_at timestamptz,
  ip text,
  cancelled_at timestamptz,
  cancel_message text,
  cancelled_by text check (cancelled_by in ('attendee', 'organizer', 'system')),
  created_at timestamptz not null,
  confirmed_at timestamptz
);
create unique index registrations_one_per_email on registrations (session_id, email) where status <> 'cancelled';
create index registrations_page_idx on registrations (page_id);

create table pass_counters (
  page_id uuid primary key references event_pages (id) on delete cascade,
  last_number int not null default 0
);

create table passes (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references registrations (id) on delete cascade,
  token text not null unique,             -- random, >= 128 bits (FR-M31-02); shown to the holder in My passes
  number text not null,
  status text not null default 'issued' check (status in ('issued', 'checked_in', 'cancelled', 'voided')),
  checked_in_at timestamptz,
  checked_in_by uuid references users (id),
  issued_at timestamptz not null
);

create table check_in_log (
  id bigserial primary key,
  pass_id uuid not null references passes (id) on delete cascade,
  action text not null check (action in ('check_in', 'undo')),
  actor_id uuid references users (id),
  at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- "Hubungi kami" (FR-M26-02)
-- ---------------------------------------------------------------------------
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete set null,
  subject_type text check (subject_type in ('booking', 'enquiry', 'event_page')),
  subject_id uuid,
  text text not null,
  created_at timestamptz not null
);

alter table auth_tokens drop constraint auth_tokens_purpose_check;
alter table auth_tokens add constraint auth_tokens_purpose_check check (purpose in
  ('verify_email', 'magic_link', 'password_reset', 'pilot_invite', 'org_invite', 'registration'));
