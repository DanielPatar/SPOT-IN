-- Build 2 (PRD §14): quotes and approval (M12), pilot agreement (M13), sandbox payments (M14),
-- pilot documents and ledger (M15, M16). Money is integer Rupiah (bigint).

create table quotes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries (id) on delete cascade,
  version int not null,
  status text not null default 'draft' check (status in
    ('draft', 'pending_approval', 'approved', 'sent', 'superseded', 'accepted', 'declined', 'expired', 'withdrawn')),
  is_backup boolean not null default false,
  lines jsonb not null default '[]',      -- [{id, kind, label, quantity, unitPrice, discount, amount, taxable}]
  totals jsonb not null default '{}',     -- {rentalAndAddOns, serviceCharge, ppn, venueTotal, organizerFee, organizerTotal}
  pricing_snapshot jsonb not null default '{}', -- fee rate/caps, commission, PPN rule, service charge at creation
  payment_schedule jsonb not null default '{}', -- {mode: "split"|"full", depositBps, depositDays, balanceDaysBefore}
  cancellation_policy text not null,
  policy_snapshot jsonb not null default '[]',
  validity_days int not null default 7 check (validity_days between 1 and 60),
  valid_until timestamptz,
  inclusions text,
  exclusions text,
  special_terms text,
  event_changed boolean not null default false,
  revision_comments jsonb,                -- {general, lines: {lineId: comment}, at, by}
  decline_reason text,
  expire_reason text,
  approval_by uuid references users (id),
  approval_at timestamptz,
  approval_comment text,
  created_by uuid references users (id) on delete set null,
  sent_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (enquiry_id, version)
);
create index quotes_enquiry_idx on quotes (enquiry_id);
create index quotes_status_idx on quotes (status);

create table quote_templates (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces (id) on delete cascade,
  name text not null,
  lines jsonb not null,
  created_at timestamptz not null
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  quote_id uuid not null unique references quotes (id),
  enquiry_id uuid not null references enquiries (id),
  event_id uuid not null references events (id),
  space_id uuid not null references spaces (id),
  organizer_org_id uuid not null references organizations (id),
  operator_id uuid not null references organizations (id),
  days jsonb not null,
  status text not null default 'pending_agreement_and_deposit' check (status in
    ('pending_agreement_and_deposit', 'confirmed', 'balance_due', 'fully_paid', 'in_progress', 'post_event_window', 'on_hold',
     'settled', 'lapsed', 'cancelled_by_organizer', 'cancelled_by_venue')),
  deposit_due_at timestamptz not null,
  balance_due_at timestamptz,
  balance_request_at timestamptz,
  balance_extended boolean not null default false,
  pilot_terms_accepted_at timestamptz not null,
  accepted_by uuid references users (id),
  confirmed_at timestamptz,
  lapsed_at timestamptz,
  cancelled_at timestamptz,
  event_start_at timestamptz not null,
  event_end_at timestamptz not null,
  post_event_window_ends_at timestamptz,
  release_scheduled_at timestamptz,
  at_risk boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index bookings_space_idx on bookings (space_id);
create index bookings_org_idx on bookings (organizer_org_id);
create index bookings_operator_idx on bookings (operator_id);

alter table threads add constraint threads_booking_fk foreign key (booking_id) references bookings (id);
alter table calendar_entries add constraint calendar_booking_fk foreign key (booking_id) references bookings (id);

create table agreements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings (id) on delete cascade,
  status text not null default 'generated' check (status in ('generating', 'generated', 'accepted_by_organizer', 'accepted_by_both', 'voided')),
  file_id uuid references files (id),
  sha256 text,
  acceptances jsonb not null default '[]', -- [{side, userId, typedName, at, ip}]
  attempts int not null default 0,
  last_error text,
  generated_at timestamptz,
  created_at timestamptz not null
);

create table payment_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'balance', 'full')),
  amount bigint not null check (amount > 0),
  venue_part bigint not null,
  fee_part bigint not null,
  due_at timestamptz not null,
  issued_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'paid', 'expired', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null,
  unique (booking_id, kind)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references payment_requests (id) on delete cascade,
  booking_id uuid not null references bookings (id) on delete cascade,
  provider text not null default 'simulator',
  provider_ref text not null unique,
  method text not null check (method in ('test_va', 'test_qris', 'test_ewallet', 'test_card')),
  amount bigint not null,
  status text not null default 'pending' check (status in ('created', 'pending', 'paid', 'expired', 'failed', 'refunded')),
  instructions jsonb not null default '{}', -- e.g. test VA number
  failure_reason text,
  expires_at timestamptz,
  paid_at timestamptz,
  refunded_amount bigint not null default 0,
  created_by uuid references users (id),
  created_at timestamptz not null
);
create index payments_booking_idx on payments (booking_id);

create table payment_webhooks (
  id bigserial primary key,
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  signature_ok boolean not null,
  processed_at timestamptz,
  received_at timestamptz not null,
  unique (provider, event_id)
);

create table receipt_counters (
  issuer_key text primary key,
  last_number int not null default 0
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  kind text not null check (kind in ('receipt', 'credit_note')),
  issuer_org_id uuid not null references organizations (id),
  booking_id uuid not null references bookings (id),
  payment_id uuid references payments (id),
  refers_to uuid references receipts (id),
  lines jsonb not null,
  amount bigint not null,
  file_id uuid references files (id),
  created_at timestamptz not null
);

-- Double-entry ledger per booking (FR-M16-07). Each row moves `amount` from credit_account to
-- debit_account. Append-only.
create table ledger_entries (
  id bigserial primary key,
  booking_id uuid not null references bookings (id),
  debit_account text not null,
  credit_account text not null,
  amount bigint not null check (amount > 0),
  ref_type text not null,
  ref_id text,
  memo text,
  created_at timestamptz not null,
  check (debit_account <> credit_account)
);
create index ledger_booking_idx on ledger_entries (booking_id);
create trigger ledger_append_only before update or delete on ledger_entries
  for each row execute function spotin_forbid_change();

alter table files drop constraint files_purpose_check;
alter table files add constraint files_purpose_check check (purpose in
  ('space_photo', 'property_photo', 'logo', 'avatar', 'proposal', 'message_attachment', 'generated_pdf', 'compliance_document', 'problem_photo', 'event_cover'));
