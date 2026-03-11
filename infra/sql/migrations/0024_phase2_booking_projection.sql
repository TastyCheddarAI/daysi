create table if not exists commerce_booking_projection (
  id text primary key,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  actor_user_id text,
  management_token text not null,
  booking_code text not null unique,
  status text not null check (status in ('confirmed', 'cancelled')),
  source_assessment_id text,
  source_treatment_plan_id text,
  service_slug text not null,
  service_variant_slug text not null,
  service_name text not null,
  customer_email text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text,
  provider_slug text not null,
  provider_name text not null,
  machine_slug text not null,
  machine_name text not null,
  room_slug text,
  room_name text,
  currency_code text not null default 'CAD',
  retail_amount_cents integer not null check (retail_amount_cents >= 0),
  member_amount_cents integer check (member_amount_cents is null or member_amount_cents >= 0),
  final_amount_cents integer not null check (final_amount_cents >= 0),
  membership_required boolean not null default false,
  applied_pricing_mode text not null check (applied_pricing_mode in ('retail', 'membership')),
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cancelled_at timestamptz,
  cancelled_reason text,
  status_history jsonb not null default '[]'::jsonb,
  record jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  check (ends_at > starts_at)
);

create index if not exists commerce_booking_projection_location_time_idx
  on commerce_booking_projection (location_slug, starts_at, ends_at);

create index if not exists commerce_booking_projection_location_status_idx
  on commerce_booking_projection (location_slug, status, starts_at);

create index if not exists commerce_booking_projection_customer_idx
  on commerce_booking_projection (location_slug, customer_email, updated_at desc);
