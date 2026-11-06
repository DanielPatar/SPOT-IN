-- Spot-In — Build 1 schema (PRD v1.2 §9.1).
-- Data rule (FR-M38-04): there is deliberately NO column for ID documents, selfies,
-- NIK, NPWP, NIB, deeds, bank account or card numbers. scripts/pii-scan.ts checks this.

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists btree_gist;
create extension if not exists citext;
create extension if not exists unaccent;

-- Immutable wrapper so unaccent can be used in indexes.
create or replace function spotin_unaccent(text) returns text
  language sql immutable parallel safe strict
  as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- ---------------------------------------------------------------------------
-- Settings, holidays, audit, jobs, rate limits
-- ---------------------------------------------------------------------------
create table settings (
  key text primary key,
  value jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table holiday_calendar (
  date date primary key,
  name text not null,
  kind text not null check (kind in ('national', 'cuti_bersama')),
  year int generated always as (extract(year from date)::int) stored
);

create table audit_log (
  id bigserial primary key,
  scope text not null check (scope in ('admin', 'system', 'user')),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  at timestamptz not null
);
create index audit_log_entity_idx on audit_log (entity, entity_id);

-- Append-only: audit rows can never be changed or removed.
create or replace function spotin_forbid_change() returns trigger language plpgsql as $$
begin
  raise exception 'append-only table %', tg_table_name;
end $$;
create trigger audit_log_append_only before update or delete on audit_log
  for each row execute function spotin_forbid_change();

create table jobs (
  id bigserial primary key,
  kind text not null,
  run_at timestamptz not null,
  payload jsonb not null default '{}',
  unique_key text unique,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed', 'cancelled')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index jobs_due_idx on jobs (run_at) where status = 'pending';

create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

create table geocode_cache (
  query text primary key,
  lat double precision,
  lon double precision,
  display_name text,
  fetched_at timestamptz not null default now()
);

create table search_synonyms (
  term text primary key,
  expansion text not null
);

-- ---------------------------------------------------------------------------
-- Users, consent, invites, sessions, tokens (M1, M38)
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null unique,
  email_verified_at timestamptz,
  password_hash text,
  google_sub text unique,
  phone text, -- optional, unverified contact field (FR-M1-05)
  photo_file_id uuid,
  totp_secret text,
  totp_enabled_at timestamptz,
  is_admin boolean not null default false,
  is_18_plus_confirmed boolean not null default false,
  intents text[] not null default '{}', -- find | list (FR-M1-06)
  intent_chosen_at timestamptz,
  is_quick_attendee boolean not null default false,
  notification_prefs jsonb not null default '{}',
  email_bounced_at timestamptz,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  suspended_reason text,
  created_at timestamptz not null,
  last_active_at timestamptz,
  deletion_requested_at timestamptz,
  deleted_at timestamptz
);

create table consent_records (
  id bigserial primary key,
  user_id uuid not null references users (id) on delete cascade,
  document text not null check (document in ('terms', 'privacy', 'pilot_notice')),
  version text not null,
  accepted_at timestamptz not null,
  ip text
);
create index consent_user_idx on consent_records (user_id);

create table pilot_invites (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  invited_by uuid references users (id),
  role_hint text not null check (role_hint in ('venue', 'organizer', 'both')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  created_at timestamptz not null,
  accepted_at timestamptz
);
create unique index pilot_invites_open_email on pilot_invites (email) where status = 'pending';

create table sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  user_agent text,
  ip text,
  two_factor_passed boolean not null default false,
  context text check (context in ('venue', 'organizer')),
  revoked_at timestamptz
);
create index sessions_user_idx on sessions (user_id);

create table auth_tokens (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('verify_email', 'magic_link', 'password_reset', 'pilot_invite', 'org_invite')),
  token_hash text not null unique,
  user_id uuid references users (id) on delete cascade,
  email citext,
  data jsonb not null default '{}',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Files (photos, proposals, attachments, documents)
-- ---------------------------------------------------------------------------
create table files (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  filename text not null,
  mime text not null,
  size_bytes int not null,
  purpose text not null check (purpose in ('space_photo', 'property_photo', 'logo', 'avatar', 'proposal', 'message_attachment')),
  scan_status text not null check (scan_status in ('clean', 'infected', 'error')),
  uploaded_by uuid references users (id) on delete set null,
  created_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Organizations, memberships, org invites (M2, M3)
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('venue_operator', 'organizer')),
  display_name text not null,
  legal_name text, -- free text only (FR-M2-02)
  logo_file_id uuid references files (id),
  city text,
  contact_email citext,
  contact_phone text,
  is_individual boolean not null default false,
  verification_status text not null default 'unsubmitted'
    check (verification_status in ('unsubmitted', 'pending', 'verified', 'rejected')),
  verification_submitted_at timestamptz,
  verified_by_spotin_at timestamptz,
  verification_method text, -- call | chat | meeting (FR-M3-09)
  verification_note text,
  verification_reason text,
  approval_threshold bigint check (approval_threshold is null or approval_threshold > 0), -- FR-M2-06
  status text not null default 'active' check (status in ('active', 'suspended')),
  suspended_reason text,
  created_at timestamptz not null
);

create table memberships (
  user_id uuid not null references users (id) on delete cascade,
  org_id uuid not null references organizations (id) on delete cascade,
  org_kind text not null check (org_kind in ('venue_operator', 'organizer')),
  role text not null check (role in ('owner', 'staff', 'viewer', 'member')),
  created_at timestamptz not null,
  primary key (user_id, org_id),
  -- at most one venue operator and one organizer organization per user (§4.2)
  unique (user_id, org_kind),
  check ((org_kind = 'venue_operator' and role in ('owner', 'staff', 'viewer'))
      or (org_kind = 'organizer' and role in ('owner', 'member')))
);
create index memberships_org_idx on memberships (org_id);

create table org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  email citext not null,
  role text not null,
  token_hash text not null unique,
  invited_by uuid references users (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null
);

create table org_audit_log (
  id bigserial primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  actor_id uuid,
  action text not null,
  details jsonb not null default '{}',
  at timestamptz not null
);
create trigger org_audit_log_append_only before update or delete on org_audit_log
  for each row execute function spotin_forbid_change();

-- ---------------------------------------------------------------------------
-- Properties, spaces, pricing (M4, M5)
-- ---------------------------------------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null unique references organizations (id) on delete cascade, -- one property per operator
  name text not null,
  type text not null check (type in ('mall', 'hall', 'convention_centre', 'outdoor_site', 'other')),
  address_text text not null,
  city text not null,
  area text,
  geo geography(Point, 4326), -- required to submit (FR-M4-01)
  timezone text not null default 'Asia/Jakarta' check (timezone in ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura')),
  operating_hours jsonb not null default '{}', -- {"mon": {"open":"10:00","close":"22:00"} | null, ...}
  parking_notes text,
  loading_notes text,
  house_rules text,
  photos jsonb not null default '[]', -- [{fileId, caption}]
  required_docs jsonb not null default '[]', -- [{id, name, mandatory, dueOffsetDays}] (FR-M4-08)
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index properties_geo_idx on properties using gist (geo);

create table spaces (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  name text not null,
  type text not null check (type in ('atrium', 'booth', 'popup_unit', 'event_hall', 'function_room', 'outdoor_area', 'other')),
  level_text text,
  area_m2 numeric(10, 2),
  ceiling_height_m numeric(6, 2),
  capacities jsonb not null default '{}', -- {standing, theatre, classroom, banquet, booth}
  max_capacity int generated always as (greatest(
    coalesce((capacities ->> 'standing')::int, 0), coalesce((capacities ->> 'theatre')::int, 0),
    coalesce((capacities ->> 'classroom')::int, 0), coalesce((capacities ->> 'banquet')::int, 0))) stored,
  power_kva int,
  environment text not null default 'indoor' check (environment in ('indoor', 'outdoor', 'covered')),
  wifi boolean not null default false,
  accessibility_notes text,
  permitted_activities text[] not null default '{}', -- selling, fnb_sampling, open_flame, live_music, vehicles
  prohibited_categories text,
  min_days int not null default 1 check (min_days >= 1),
  max_days int check (max_days is null or max_days >= min_days),
  media jsonb not null default '[]', -- [{fileId, caption, cover}] max 15 (FR-M4-04)
  video_url text,
  enquiry_questions jsonb not null default '[]', -- [{id, label}] max 5 (FR-M4-09)
  cancellation_policy text not null default 'moderate' check (cancellation_policy in ('flexible', 'moderate', 'strict')),
  buffer_hours int not null default 0 check (buffer_hours >= 0),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'unpublished', 'suspended')),
  review_reason text,
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index spaces_property_idx on spaces (property_id);
create index spaces_status_idx on spaces (status);
create index spaces_name_trgm on spaces using gin (spotin_unaccent(lower(name)) gin_trgm_ops);
create index properties_name_trgm on properties using gin (spotin_unaccent(lower(name || ' ' || city || ' ' || coalesce(area, ''))) gin_trgm_ops);

create table rate_cards (
  space_id uuid primary key references spaces (id) on delete cascade,
  unit text not null check (unit in ('hour', 'half_day', 'day')),
  weekday_price bigint not null check (weekday_price >= 0),
  weekend_price bigint check (weekend_price is null or weekend_price >= 0),
  min_units int not null default 1 check (min_units >= 1),
  min_spend bigint check (min_spend is null or min_spend >= 0),
  show_full_rate_card boolean not null default true,
  from_price bigint not null check (from_price >= 0) -- always required (FR-M5-06)
);

create table rate_seasons (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  price bigint not null check (price >= 0)
);
create index rate_seasons_space_idx on rate_seasons (space_id);

create table add_ons (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  name text not null,
  unit text not null check (unit in ('per_day', 'per_kva_day', 'per_person', 'per_item')),
  price bigint not null check (price >= 0),
  taxable boolean not null default true,
  mandatory boolean not null default false
);

create table tax_settings (
  operator_id uuid primary key references organizations (id) on delete cascade,
  is_pkp boolean not null default false,
  service_charge_bps int not null default 0 check (service_charge_bps between 0 and 10000)
);

-- ---------------------------------------------------------------------------
-- Calendar and holds (M6). Overlapping active entries on one space are impossible:
-- the exclusion constraint makes hold placement and acceptance atomic (FR-M6-07).
-- ---------------------------------------------------------------------------
create table calendar_entries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces (id) on delete cascade,
  during tstzrange not null check (not isempty(during)),
  kind text not null check (kind in ('block', 'tentative_hold', 'booking_hold', 'booked')),
  enquiry_id uuid,
  booking_id uuid,
  series_id uuid, -- weekly recurring blocks share a series
  reason text, -- private to the venue
  expires_at timestamptz,
  released_at timestamptz,
  release_reason text,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null,
  constraint calendar_no_overlap exclude using gist (space_id with =, during with &&) where (released_at is null)
);
create index calendar_space_idx on calendar_entries using gist (space_id, during) where released_at is null;

-- ---------------------------------------------------------------------------
-- Shortlists (M8)
-- ---------------------------------------------------------------------------
create table shortlists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null
);

create table shortlist_items (
  shortlist_id uuid not null references shortlists (id) on delete cascade,
  space_id uuid not null references spaces (id) on delete cascade,
  note text,
  added_at timestamptz not null,
  primary key (shortlist_id, space_id)
);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  shortlist_id uuid not null references shortlists (id) on delete cascade,
  token text not null unique,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null,
  revoked_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Events (projects) and enquiries (M9)
-- ---------------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  organizer_org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  type text not null,
  brand text,
  category text not null,
  description text,
  expected_attendance int not null check (expected_attendance > 0),
  days jsonb not null, -- [{date:"2026-12-12", start:"10:00", end:"22:00"}]
  budget_min bigint,
  budget_max bigint,
  required_facilities text[] not null default '{}',
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table event_files (
  event_id uuid not null references events (id) on delete cascade,
  file_id uuid not null references files (id) on delete cascade,
  primary key (event_id, file_id)
);

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  space_id uuid not null references spaces (id) on delete cascade,
  status text not null default 'submitted' check (status in
    ('submitted', 'viewed', 'info_requested', 'responded', 'quoted', 'accepted', 'declined', 'expired', 'withdrawn', 'lost')),
  answers jsonb not null default '{}',
  warnings text[] not null default '{}',
  response_deadline_at timestamptz not null,
  first_response_at timestamptz,
  viewed_at timestamptz,
  assigned_member_id uuid references users (id) on delete set null,
  internal_notes text, -- venue only (FR-M9-11)
  decline_reason text check (decline_reason in ('dates_unavailable', 'capacity', 'proposal_not_suitable', 'other')),
  decline_note text,
  lost_reason text,
  closed_at timestamptz,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index enquiries_event_idx on enquiries (event_id);
create index enquiries_space_idx on enquiries (space_id);
create unique index enquiries_one_open_per_space on enquiries (event_id, space_id)
  where status not in ('declined', 'expired', 'withdrawn', 'lost');

-- ---------------------------------------------------------------------------
-- Messaging (M10)
-- ---------------------------------------------------------------------------
create table threads (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null unique references enquiries (id) on delete cascade,
  booking_id uuid,
  created_at timestamptz not null,
  last_message_at timestamptz,
  last_message_org_kind text,
  masked_count int not null default 0
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads (id) on delete cascade,
  sender_id uuid references users (id) on delete set null,
  sender_org_kind text not null check (sender_org_kind in ('venue_operator', 'organizer', 'system')),
  kind text not null default 'text' check (kind in ('text', 'system')),
  body text not null, -- original text, visible to the Admin only
  display_body text not null, -- masked before confirmation (FR-M10-03)
  was_masked boolean not null default false,
  attachments jsonb not null default '[]', -- [{fileId, filename, mime, size}]
  created_at timestamptz not null,
  edited_at timestamptz,
  deleted_at timestamptz
);
create index messages_thread_idx on messages (thread_id, created_at);

create table thread_reads (
  thread_id uuid not null references threads (id) on delete cascade,
  org_id uuid not null references organizations (id) on delete cascade,
  last_read_at timestamptz not null,
  primary key (thread_id, org_id)
);

create table saved_replies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Reports, notifications, email outbox
-- ---------------------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('space', 'event_page', 'message')),
  subject_id uuid not null,
  reporter_id uuid references users (id) on delete set null,
  reason text not null,
  text text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  decision text,
  decided_by uuid references users (id),
  decided_at timestamptz,
  created_at timestamptz not null
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  event text not null,
  title text not null,
  body text,
  link text,
  transactional boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null
);
create index notifications_user_idx on notifications (user_id, created_at desc);

create table email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email citext not null,
  subject text not null,
  text_body text not null,
  html_body text,
  category text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'bounced', 'skipped')),
  error text,
  created_at timestamptz not null,
  sent_at timestamptz
);
create index email_outbox_to_idx on email_outbox (to_email, created_at desc);
