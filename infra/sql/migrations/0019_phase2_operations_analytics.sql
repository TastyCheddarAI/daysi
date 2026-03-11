create table if not exists operational_metric_event (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  actor_user_id uuid references app_user(id) on delete set null,
  event_type text not null
    check (event_type in ('availability_search', 'booking_created', 'waitlist_created', 'booking_paid')),
  service_id uuid references service(id) on delete set null,
  machine_id uuid references machine(id) on delete set null,
  provider_user_id uuid references app_user(id) on delete set null,
  source_order_id uuid references sales_order(id) on delete set null,
  reference_id text,
  customer_email text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists operational_metric_event_location_type_idx
  on operational_metric_event (location_id, event_type, occurred_at desc);

create index if not exists operational_metric_event_location_service_idx
  on operational_metric_event (location_id, service_id, occurred_at desc);

create unique index if not exists operational_metric_event_booking_paid_dedupe_idx
  on operational_metric_event (event_type, source_order_id, reference_id)
  where event_type = 'booking_paid' and source_order_id is not null and reference_id is not null;
