create table if not exists operations_provider_payout_run_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  currency text not null,
  status text not null,
  from_date date not null,
  to_date date not null,
  provider_payouts jsonb not null default '[]'::jsonb,
  covered_order_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  created_by_user_id text,
  approved_at timestamptz,
  paid_at timestamptz,
  record jsonb not null
);

create index if not exists operations_provider_payout_run_projection_location_idx
  on operations_provider_payout_run_projection (location_slug, created_at desc);
