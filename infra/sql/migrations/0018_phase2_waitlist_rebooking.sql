create table if not exists waitlist_entry (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  service_id uuid not null references service(id) on delete cascade,
  actor_user_id uuid references app_user(id) on delete set null,
  fulfilled_by_booking_id uuid references booking(id) on delete set null,
  customer_email text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text,
  preferred_provider_id uuid references app_user(id) on delete set null,
  preferred_pricing_mode text not null default 'retail'
    check (preferred_pricing_mode in ('retail', 'membership')),
  requested_from_date date not null,
  requested_to_date date not null,
  status text not null default 'active'
    check (status in ('active', 'notified', 'booked', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_from_date <= requested_to_date)
);

create index if not exists waitlist_entry_location_status_idx
  on waitlist_entry (location_id, status, updated_at desc);

create index if not exists waitlist_entry_customer_idx
  on waitlist_entry (location_id, lower(customer_email), created_at desc);

create table if not exists waitlist_status_event (
  id uuid primary key default gen_random_uuid(),
  waitlist_entry_id uuid not null references waitlist_entry(id) on delete cascade,
  status text not null
    check (status in ('active', 'notified', 'booked', 'cancelled')),
  note text,
  fulfilled_by_booking_id uuid references booking(id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index if not exists waitlist_status_event_entry_idx
  on waitlist_status_event (waitlist_entry_id, recorded_at desc);

drop trigger if exists waitlist_entry_set_updated_at on waitlist_entry;
create trigger waitlist_entry_set_updated_at
before update on waitlist_entry
for each row execute function set_updated_at();
