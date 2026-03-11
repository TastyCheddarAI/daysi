create table if not exists engagement_customer_event_projection (
  id text primary key,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  actor_user_id text,
  customer_email text not null,
  customer_name text,
  source text not null
    check (source in ('booking', 'commerce', 'learning', 'referral', 'ai', 'skinAnalysis', 'manual')),
  event_type text not null,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  record jsonb not null
);

create index if not exists engagement_customer_event_projection_customer_idx
  on engagement_customer_event_projection (location_slug, lower(customer_email), occurred_at desc);

create index if not exists engagement_customer_event_projection_event_type_idx
  on engagement_customer_event_projection (event_type, occurred_at desc);

create table if not exists engagement_waitlist_projection (
  id text primary key,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  actor_user_id text,
  management_token text not null,
  service_slug text not null,
  service_variant_slug text not null,
  service_name text not null,
  customer_email text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text,
  preferred_provider_slug text,
  preferred_pricing_mode text not null,
  requested_from_date date not null,
  requested_to_date date not null,
  status text not null
    check (status in ('active', 'notified', 'booked', 'cancelled')),
  notes text,
  fulfilled_by_booking_id text,
  status_history jsonb not null default '[]'::jsonb,
  record jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists engagement_waitlist_projection_location_status_idx
  on engagement_waitlist_projection (location_slug, status, updated_at desc);

create index if not exists engagement_waitlist_projection_customer_idx
  on engagement_waitlist_projection (lower(customer_email), updated_at desc);

create index if not exists engagement_waitlist_projection_actor_idx
  on engagement_waitlist_projection (actor_user_id, updated_at desc)
  where actor_user_id is not null;
