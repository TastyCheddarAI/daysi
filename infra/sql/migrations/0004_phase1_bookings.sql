create table if not exists booking (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  customer_user_id uuid references app_user(id) on delete set null,
  customer_email text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text,
  booking_code text not null unique,
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  currency_code text not null default 'CAD',
  applied_pricing_mode text not null
    check (applied_pricing_mode in ('retail', 'membership')),
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists booking_location_time_idx
  on booking (location_id, starts_at, ends_at);

create table if not exists booking_line (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id) on delete cascade,
  service_variant_id uuid not null references service_variant(id) on delete restrict,
  display_name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists booking_resource_assignment (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id) on delete cascade,
  provider_id uuid references provider(id) on delete set null,
  location_machine_inventory_id uuid references location_machine_inventory(id) on delete set null,
  room_id uuid references room(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id) on delete cascade,
  status text not null
    check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  note text,
  changed_by_user_id uuid references app_user(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists booking_note (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id) on delete cascade,
  note text not null,
  created_by_user_id uuid references app_user(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists booking_membership_application (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id) on delete cascade,
  membership_subscription_id uuid,
  membership_usage_amount integer not null default 0 check (membership_usage_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists booking_coupon_application (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id) on delete cascade,
  coupon_code text not null,
  discount_amount_cents integer not null default 0 check (discount_amount_cents >= 0),
  created_at timestamptz not null default now()
);

alter table machine_booking_window
  drop constraint if exists machine_booking_window_booking_id_fkey;

alter table machine_booking_window
  add constraint machine_booking_window_booking_id_fkey
  foreign key (booking_id) references booking(id) on delete cascade;

drop trigger if exists booking_set_updated_at on booking;
create trigger booking_set_updated_at
before update on booking
for each row execute function set_updated_at();
