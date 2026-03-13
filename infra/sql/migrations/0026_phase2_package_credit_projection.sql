create table if not exists commerce_service_package_purchase_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  actor_user_id text,
  package_slug text not null,
  status text not null
    check (status in ('pending_payment', 'active', 'revoked')),
  customer_email text not null,
  customer_name text not null,
  source_order_id text,
  created_at timestamptz not null,
  activated_at timestamptz,
  revoked_at timestamptz,
  record jsonb not null
);

create index if not exists commerce_service_package_purchase_projection_location_idx
  on commerce_service_package_purchase_projection (location_slug, status, created_at desc);

create index if not exists commerce_service_package_purchase_projection_customer_idx
  on commerce_service_package_purchase_projection (lower(customer_email), created_at desc);

create index if not exists commerce_service_package_purchase_projection_actor_idx
  on commerce_service_package_purchase_projection (actor_user_id, created_at desc)
  where actor_user_id is not null;

create index if not exists commerce_service_package_purchase_projection_source_order_idx
  on commerce_service_package_purchase_projection (source_order_id)
  where source_order_id is not null;

create table if not exists commerce_service_package_usage_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  package_purchase_id uuid not null
    references commerce_service_package_purchase_projection(id) on delete cascade,
  package_slug text not null,
  service_slug text not null,
  booking_id text,
  quantity integer not null,
  source_order_id text,
  status text not null
    check (status in ('consumed', 'reversed')),
  created_at timestamptz not null,
  reversed_at timestamptz,
  record jsonb not null
);

create index if not exists commerce_service_package_usage_projection_purchase_idx
  on commerce_service_package_usage_projection (package_purchase_id, service_slug, status, created_at desc);

create index if not exists commerce_service_package_usage_projection_source_order_idx
  on commerce_service_package_usage_projection (source_order_id, status)
  where source_order_id is not null;

create table if not exists commerce_credit_entry_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  actor_user_id text,
  type text not null
    check (type in ('grant', 'redeem', 'restore')),
  currency_code text not null,
  amount_cents integer not null,
  customer_email text not null,
  source_order_id text,
  note text,
  granted_by_user_id text,
  created_at timestamptz not null,
  record jsonb not null
);

create index if not exists commerce_credit_entry_projection_customer_idx
  on commerce_credit_entry_projection (lower(customer_email), created_at desc);

create index if not exists commerce_credit_entry_projection_actor_idx
  on commerce_credit_entry_projection (actor_user_id, created_at desc)
  where actor_user_id is not null;

create index if not exists commerce_credit_entry_projection_source_order_type_idx
  on commerce_credit_entry_projection (source_order_id, type)
  where source_order_id is not null;
