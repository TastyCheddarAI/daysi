create table if not exists provider (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user(id) on delete set null,
  brand_id uuid not null references brand(id) on delete cascade,
  slug text not null,
  display_name text not null,
  provider_type text not null default 'independent'
    check (provider_type in ('independent', 'employee')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists provider_role_assignment (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider(id) on delete cascade,
  organization_id uuid not null references organization(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  role_label text not null default 'provider',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, location_id)
);

create table if not exists provider_comp_plan (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  provider_id uuid references provider(id) on delete cascade,
  location_id uuid references location(id) on delete cascade,
  plan_name text not null,
  commission_percent numeric(5,2) not null check (commission_percent >= 0 and commission_percent <= 100),
  applies_to_revenue_stream text not null default 'services'
    check (applies_to_revenue_stream in ('services', 'retail', 'mixed')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists machine (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  slug text not null,
  display_name text not null,
  machine_type text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists machine_capability (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references machine(id) on delete cascade,
  capability_key text not null,
  created_at timestamptz not null default now(),
  unique (machine_id, capability_key)
);

create table if not exists location_machine_inventory (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id) on delete cascade,
  machine_id uuid not null references machine(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'maintenance')),
  acquired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, machine_id)
);

create table if not exists machine_schedule (
  id uuid primary key default gen_random_uuid(),
  location_machine_inventory_id uuid not null references location_machine_inventory(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_minute integer not null check (start_minute between 0 and 1439),
  end_minute integer not null check (end_minute between 1 and 1440 and end_minute > start_minute),
  schedule_kind text not null default 'open'
    check (schedule_kind in ('open', 'maintenance', 'blackout')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists machine_booking_window (
  id uuid primary key default gen_random_uuid(),
  location_machine_inventory_id uuid not null references location_machine_inventory(id) on delete cascade,
  booking_id uuid,
  window_kind text not null default 'booking'
    check (window_kind in ('booking', 'maintenance', 'admin_hold')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists machine_booking_window_lookup_idx
  on machine_booking_window (location_machine_inventory_id, starts_at, ends_at);

create table if not exists room (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id) on delete cascade,
  slug text not null,
  display_name text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, slug)
);

create table if not exists room_schedule (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references room(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_minute integer not null check (start_minute between 0 and 1439),
  end_minute integer not null check (end_minute between 1 and 1440 and end_minute > start_minute),
  schedule_kind text not null default 'open'
    check (schedule_kind in ('open', 'maintenance', 'blackout')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists location_schedule (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_minute integer not null check (start_minute between 0 and 1439),
  end_minute integer not null check (end_minute between 1 and 1440 and end_minute > start_minute),
  schedule_kind text not null default 'open'
    check (schedule_kind in ('open', 'holiday', 'blackout')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_schedule_template (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_minute integer not null check (start_minute between 0 and 1439),
  end_minute integer not null check (end_minute between 1 and 1440 and end_minute > start_minute),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_schedule_exception (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  exception_kind text not null
    check (exception_kind in ('time_off', 'blackout', 'manual_override')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists booking_policy (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id) on delete cascade,
  service_id uuid,
  cancellation_window_hours integer not null default 24,
  buffer_minutes integer not null default 0,
  requires_deposit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_category (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  slug text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists service (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  service_category_id uuid references service_category(id) on delete set null,
  slug text not null,
  display_name text not null,
  short_description text not null,
  description text not null,
  revenue_stream text not null default 'services'
    check (revenue_stream in ('services', 'education', 'retail')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists service_variant (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references service(id) on delete cascade,
  slug text not null,
  display_name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, slug)
);

create table if not exists service_location_offer (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id) on delete cascade,
  service_variant_id uuid not null references service_variant(id) on delete cascade,
  is_active boolean not null default true,
  is_bookable boolean not null default true,
  retail_price_cents integer not null check (retail_price_cents >= 0),
  member_price_cents integer check (member_price_cents >= 0),
  membership_required boolean not null default false,
  currency_code text not null default 'CAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, service_variant_id)
);

create table if not exists machine_service_rule (
  id uuid primary key default gen_random_uuid(),
  service_variant_id uuid not null references service_variant(id) on delete cascade,
  capability_key text not null,
  required_machine_count integer not null default 1 check (required_machine_count > 0),
  created_at timestamptz not null default now(),
  unique (service_variant_id, capability_key)
);

create table if not exists product (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  slug text not null,
  display_name text not null,
  short_description text not null,
  revenue_stream text not null default 'retail'
    check (revenue_stream in ('retail', 'education')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists product_location_offer (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id) on delete cascade,
  product_id uuid not null references product(id) on delete cascade,
  is_active boolean not null default true,
  price_cents integer not null check (price_cents >= 0),
  currency_code text not null default 'CAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, product_id)
);

create table if not exists education_offer (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid references location(id) on delete set null,
  slug text not null,
  title text not null,
  short_description text not null,
  price_cents integer not null check (price_cents >= 0),
  currency_code text not null default 'CAD',
  is_free boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

alter table booking_policy
  drop constraint if exists booking_policy_service_id_fkey;

alter table booking_policy
  add constraint booking_policy_service_id_fkey
  foreign key (service_id) references service(id) on delete cascade;

drop trigger if exists provider_set_updated_at on provider;
create trigger provider_set_updated_at
before update on provider
for each row execute function set_updated_at();

drop trigger if exists provider_role_assignment_set_updated_at on provider_role_assignment;
create trigger provider_role_assignment_set_updated_at
before update on provider_role_assignment
for each row execute function set_updated_at();

drop trigger if exists provider_comp_plan_set_updated_at on provider_comp_plan;
create trigger provider_comp_plan_set_updated_at
before update on provider_comp_plan
for each row execute function set_updated_at();

drop trigger if exists machine_set_updated_at on machine;
create trigger machine_set_updated_at
before update on machine
for each row execute function set_updated_at();

drop trigger if exists location_machine_inventory_set_updated_at on location_machine_inventory;
create trigger location_machine_inventory_set_updated_at
before update on location_machine_inventory
for each row execute function set_updated_at();

drop trigger if exists machine_schedule_set_updated_at on machine_schedule;
create trigger machine_schedule_set_updated_at
before update on machine_schedule
for each row execute function set_updated_at();

drop trigger if exists room_set_updated_at on room;
create trigger room_set_updated_at
before update on room
for each row execute function set_updated_at();

drop trigger if exists room_schedule_set_updated_at on room_schedule;
create trigger room_schedule_set_updated_at
before update on room_schedule
for each row execute function set_updated_at();

drop trigger if exists location_schedule_set_updated_at on location_schedule;
create trigger location_schedule_set_updated_at
before update on location_schedule
for each row execute function set_updated_at();

drop trigger if exists provider_schedule_template_set_updated_at on provider_schedule_template;
create trigger provider_schedule_template_set_updated_at
before update on provider_schedule_template
for each row execute function set_updated_at();

drop trigger if exists provider_schedule_exception_set_updated_at on provider_schedule_exception;
create trigger provider_schedule_exception_set_updated_at
before update on provider_schedule_exception
for each row execute function set_updated_at();

drop trigger if exists booking_policy_set_updated_at on booking_policy;
create trigger booking_policy_set_updated_at
before update on booking_policy
for each row execute function set_updated_at();

drop trigger if exists service_category_set_updated_at on service_category;
create trigger service_category_set_updated_at
before update on service_category
for each row execute function set_updated_at();

drop trigger if exists service_set_updated_at on service;
create trigger service_set_updated_at
before update on service
for each row execute function set_updated_at();

drop trigger if exists service_variant_set_updated_at on service_variant;
create trigger service_variant_set_updated_at
before update on service_variant
for each row execute function set_updated_at();

drop trigger if exists service_location_offer_set_updated_at on service_location_offer;
create trigger service_location_offer_set_updated_at
before update on service_location_offer
for each row execute function set_updated_at();

drop trigger if exists product_set_updated_at on product;
create trigger product_set_updated_at
before update on product
for each row execute function set_updated_at();

drop trigger if exists product_location_offer_set_updated_at on product_location_offer;
create trigger product_location_offer_set_updated_at
before update on product_location_offer
for each row execute function set_updated_at();

drop trigger if exists education_offer_set_updated_at on education_offer;
create trigger education_offer_set_updated_at
before update on education_offer
for each row execute function set_updated_at();
