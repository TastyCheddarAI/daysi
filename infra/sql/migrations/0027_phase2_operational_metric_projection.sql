create table if not exists analytics_operational_metric_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  event_type text not null
    check (event_type in ('availability_search', 'booking_created', 'waitlist_created', 'booking_paid')),
  service_slug text,
  machine_slug text,
  provider_slug text,
  actor_user_id text,
  customer_email text,
  reference_id text,
  source_order_id text,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  record jsonb not null
);

create index if not exists analytics_operational_metric_projection_location_idx
  on analytics_operational_metric_projection (location_slug, occurred_at desc);

create index if not exists analytics_operational_metric_projection_type_idx
  on analytics_operational_metric_projection (event_type, occurred_at desc);

create index if not exists analytics_operational_metric_projection_source_idx
  on analytics_operational_metric_projection (event_type, source_order_id, reference_id);
