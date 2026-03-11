create table if not exists provider_payout_period (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  currency_code text not null default 'CAD',
  gross_revenue_cents integer not null default 0 check (gross_revenue_cents >= 0),
  payout_amount_cents integer not null default 0 check (payout_amount_cents >= 0),
  status text not null default 'open'
    check (status in ('open', 'closed', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  check (ends_at > starts_at)
);

create table if not exists provider_payout_entry (
  id uuid primary key default gen_random_uuid(),
  provider_payout_period_id uuid not null references provider_payout_period(id) on delete cascade,
  sales_order_id uuid references sales_order(id) on delete set null,
  booking_id uuid references booking(id) on delete set null,
  revenue_amount_cents integer not null check (revenue_amount_cents >= 0),
  commission_percent numeric(5,2) not null check (commission_percent >= 0 and commission_percent <= 100),
  payout_amount_cents integer not null check (payout_amount_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists provider_payout_period_provider_idx
  on provider_payout_period (provider_id, starts_at, ends_at);

drop trigger if exists provider_payout_period_set_updated_at on provider_payout_period;
create trigger provider_payout_period_set_updated_at
before update on provider_payout_period
for each row execute function set_updated_at();
