create table if not exists commerce_order_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  actor_user_id text,
  management_token text not null,
  order_code text not null unique,
  status text not null
    check (status in ('awaiting_payment', 'paid', 'payment_failed', 'refunded')),
  payment_status text not null
    check (payment_status in ('not_required', 'requires_payment_method', 'succeeded', 'failed', 'refunded')),
  customer_email text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text,
  currency_code text not null default 'CAD',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  line_items jsonb not null default '[]'::jsonb,
  applied_coupons jsonb not null default '[]'::jsonb,
  applied_account_credit_amount jsonb not null default '{}'::jsonb,
  revenue_breakdown jsonb not null default '[]'::jsonb,
  payment_intent_id text,
  provisioning jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  paid_at timestamptz,
  refunded_at timestamptz,
  record jsonb not null
);

create unique index if not exists commerce_order_projection_payment_intent_idx
  on commerce_order_projection (payment_intent_id)
  where payment_intent_id is not null;

create index if not exists commerce_order_projection_location_status_idx
  on commerce_order_projection (location_slug, status, updated_at desc);

create index if not exists commerce_order_projection_customer_idx
  on commerce_order_projection (location_slug, customer_email, updated_at desc);

create table if not exists commerce_membership_subscription_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  actor_user_id text,
  plan_slug text not null,
  status text not null
    check (status in ('pending_payment', 'active', 'cancelled')),
  customer_email text not null,
  customer_name text not null,
  source_order_id text,
  created_at timestamptz not null,
  activated_at timestamptz,
  cancelled_at timestamptz,
  record jsonb not null
);

create index if not exists commerce_membership_subscription_projection_location_status_idx
  on commerce_membership_subscription_projection (location_slug, status, created_at desc);

create index if not exists commerce_membership_subscription_projection_customer_idx
  on commerce_membership_subscription_projection (location_slug, customer_email, created_at desc);

create index if not exists commerce_membership_subscription_projection_order_idx
  on commerce_membership_subscription_projection (source_order_id)
  where source_order_id is not null;

create table if not exists commerce_membership_usage_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  subscription_id uuid not null
    references commerce_membership_subscription_projection(id) on delete cascade,
  plan_slug text not null,
  service_slug text not null,
  booking_id text,
  quantity integer not null check (quantity > 0),
  source_order_id text,
  status text not null
    check (status in ('consumed', 'reversed')),
  created_at timestamptz not null,
  reversed_at timestamptz,
  record jsonb not null
);

create index if not exists commerce_membership_usage_projection_subscription_idx
  on commerce_membership_usage_projection (subscription_id, service_slug, created_at desc);

create index if not exists commerce_membership_usage_projection_source_order_idx
  on commerce_membership_usage_projection (source_order_id, status)
  where source_order_id is not null;
