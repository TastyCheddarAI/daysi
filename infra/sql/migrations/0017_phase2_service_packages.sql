create table if not exists service_package_offer (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  slug text not null,
  display_name text not null,
  short_description text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  currency_code text not null default 'CAD',
  price_amount_cents integer not null check (price_amount_cents >= 0),
  feature_tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, slug)
);

create table if not exists service_package_credit (
  id uuid primary key default gen_random_uuid(),
  service_package_offer_id uuid not null references service_package_offer(id) on delete cascade,
  service_id uuid not null references service(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (service_package_offer_id, service_id)
);

create table if not exists service_package_purchase (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  service_package_offer_id uuid not null references service_package_offer(id) on delete cascade,
  source_order_id uuid references sales_order(id) on delete set null,
  actor_user_id uuid references app_user(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz
);

create index if not exists service_package_purchase_actor_idx
  on service_package_purchase (actor_user_id, created_at desc);

create index if not exists service_package_purchase_customer_idx
  on service_package_purchase (location_id, lower(customer_email), created_at desc);

create table if not exists service_package_usage (
  id uuid primary key default gen_random_uuid(),
  service_package_purchase_id uuid not null references service_package_purchase(id) on delete cascade,
  service_id uuid not null references service(id) on delete cascade,
  booking_id uuid references booking(id) on delete set null,
  source_order_id uuid references sales_order(id) on delete set null,
  quantity integer not null check (quantity > 0),
  status text not null default 'consumed'
    check (status in ('consumed', 'reversed')),
  created_at timestamptz not null default now(),
  reversed_at timestamptz
);

create index if not exists service_package_usage_purchase_idx
  on service_package_usage (service_package_purchase_id, status, created_at desc);

drop trigger if exists service_package_offer_set_updated_at on service_package_offer;
create trigger service_package_offer_set_updated_at
before update on service_package_offer
for each row execute function set_updated_at();

drop trigger if exists service_package_purchase_set_updated_at on service_package_purchase;
create trigger service_package_purchase_set_updated_at
before update on service_package_purchase
for each row execute function set_updated_at();
