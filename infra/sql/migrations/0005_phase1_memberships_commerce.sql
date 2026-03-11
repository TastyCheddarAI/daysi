create table if not exists coupon (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  code text not null,
  description text,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  discount_value numeric(10,2) not null check (discount_value >= 0),
  applies_to_revenue_stream text
    check (applies_to_revenue_stream in ('services', 'memberships', 'retail', 'education')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, code)
);

create table if not exists coupon_redemption (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupon(id) on delete cascade,
  user_id uuid references app_user(id) on delete set null,
  sales_order_id uuid,
  redeemed_at timestamptz not null default now()
);

create table if not exists promotion_rule (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  rule_name text not null,
  rule_type text not null
    check (rule_type in ('coupon', 'bundle', 'membership', 'education')),
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists membership_plan (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid references location(id) on delete cascade,
  slug text not null,
  display_name text not null,
  description text not null,
  billing_interval text not null default 'month'
    check (billing_interval in ('month')),
  education_only boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists membership_price (
  id uuid primary key default gen_random_uuid(),
  membership_plan_id uuid not null references membership_plan(id) on delete cascade,
  location_id uuid references location(id) on delete cascade,
  currency_code text not null default 'CAD',
  amount_cents integer not null check (amount_cents >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists membership_entitlement (
  id uuid primary key default gen_random_uuid(),
  membership_plan_id uuid not null references membership_plan(id) on delete cascade,
  entitlement_type text not null
    check (entitlement_type in ('service_credit', 'member_discount', 'education_access')),
  service_id uuid references service(id) on delete cascade,
  education_offer_id uuid references education_offer(id) on delete cascade,
  quantity integer check (quantity is null or quantity >= 0),
  discount_percent numeric(5,2) check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists membership_subscription (
  id uuid primary key default gen_random_uuid(),
  membership_plan_id uuid not null references membership_plan(id) on delete cascade,
  user_id uuid references app_user(id) on delete set null,
  location_id uuid references location(id) on delete set null,
  source_sales_order_id uuid,
  customer_email text not null,
  customer_name text not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'past_due', 'cancelled')),
  billing_provider text not null default 'stripe'
    check (billing_provider in ('stripe')),
  billing_provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists membership_cycle (
  id uuid primary key default gen_random_uuid(),
  membership_subscription_id uuid not null references membership_subscription(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists membership_usage (
  id uuid primary key default gen_random_uuid(),
  membership_subscription_id uuid not null references membership_subscription(id) on delete cascade,
  membership_cycle_id uuid references membership_cycle(id) on delete cascade,
  booking_id uuid references booking(id) on delete set null,
  service_id uuid references service(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists cart (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid references location(id) on delete set null,
  user_id uuid references app_user(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'converted', 'abandoned')),
  currency_code text not null default 'CAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cart_item (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references cart(id) on delete cascade,
  item_type text not null
    check (item_type in ('booking', 'membership_plan', 'product', 'education_offer')),
  booking_id uuid references booking(id) on delete cascade,
  membership_plan_id uuid references membership_plan(id) on delete cascade,
  product_id uuid references product(id) on delete cascade,
  education_offer_id uuid references education_offer(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists sales_order (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid references location(id) on delete set null,
  user_id uuid references app_user(id) on delete set null,
  order_code text not null unique,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'paid', 'payment_failed', 'refunded')),
  payment_status text not null default 'requires_payment_method'
    check (payment_status in ('not_required', 'requires_payment_method', 'succeeded', 'failed', 'refunded')),
  customer_email text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_phone text,
  currency_code text not null default 'CAD',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales_order_item (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_order(id) on delete cascade,
  item_type text not null
    check (item_type in ('booking', 'membership_plan', 'product', 'education_offer')),
  revenue_stream text not null
    check (revenue_stream in ('services', 'memberships', 'retail', 'education')),
  booking_id uuid references booking(id) on delete set null,
  membership_plan_id uuid references membership_plan(id) on delete set null,
  product_id uuid references product(id) on delete set null,
  education_offer_id uuid references education_offer(id) on delete set null,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  subtotal_amount_cents integer not null check (subtotal_amount_cents >= 0),
  final_amount_cents integer not null check (final_amount_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists payment (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_order(id) on delete cascade,
  provider text not null default 'stripe'
    check (provider in ('stripe')),
  provider_payment_intent_id text,
  status text not null default 'requires_payment_method'
    check (status in ('not_required', 'requires_payment_method', 'succeeded', 'failed', 'refunded')),
  currency_code text not null default 'CAD',
  amount_cents integer not null check (amount_cents >= 0),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);

create unique index if not exists payment_provider_intent_unique_idx
  on payment (provider, provider_payment_intent_id)
  where provider_payment_intent_id is not null;

create table if not exists refund (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payment(id) on delete cascade,
  reason text,
  amount_cents integer not null check (amount_cents >= 0),
  provider_refund_id text,
  created_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  user_id uuid not null references app_user(id) on delete cascade,
  currency_code text not null default 'CAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, user_id, currency_code)
);

create table if not exists credit_entry (
  id uuid primary key default gen_random_uuid(),
  credit_ledger_id uuid not null references credit_ledger(id) on delete cascade,
  sales_order_id uuid references sales_order(id) on delete set null,
  entry_type text not null
    check (entry_type in ('grant', 'redeem', 'adjustment', 'refund')),
  amount_cents integer not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists stripe_webhook_event (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table coupon_redemption
  drop constraint if exists coupon_redemption_sales_order_id_fkey;

alter table coupon_redemption
  add constraint coupon_redemption_sales_order_id_fkey
  foreign key (sales_order_id) references sales_order(id) on delete cascade;

alter table membership_subscription
  drop constraint if exists membership_subscription_source_sales_order_id_fkey;

alter table membership_subscription
  add constraint membership_subscription_source_sales_order_id_fkey
  foreign key (source_sales_order_id) references sales_order(id) on delete set null;

drop trigger if exists coupon_set_updated_at on coupon;
create trigger coupon_set_updated_at
before update on coupon
for each row execute function set_updated_at();

drop trigger if exists promotion_rule_set_updated_at on promotion_rule;
create trigger promotion_rule_set_updated_at
before update on promotion_rule
for each row execute function set_updated_at();

drop trigger if exists membership_plan_set_updated_at on membership_plan;
create trigger membership_plan_set_updated_at
before update on membership_plan
for each row execute function set_updated_at();

drop trigger if exists membership_price_set_updated_at on membership_price;
create trigger membership_price_set_updated_at
before update on membership_price
for each row execute function set_updated_at();

drop trigger if exists membership_subscription_set_updated_at on membership_subscription;
create trigger membership_subscription_set_updated_at
before update on membership_subscription
for each row execute function set_updated_at();

drop trigger if exists cart_set_updated_at on cart;
create trigger cart_set_updated_at
before update on cart
for each row execute function set_updated_at();

drop trigger if exists sales_order_set_updated_at on sales_order;
create trigger sales_order_set_updated_at
before update on sales_order
for each row execute function set_updated_at();

drop trigger if exists payment_set_updated_at on payment;
create trigger payment_set_updated_at
before update on payment
for each row execute function set_updated_at();

drop trigger if exists credit_ledger_set_updated_at on credit_ledger;
create trigger credit_ledger_set_updated_at
before update on credit_ledger
for each row execute function set_updated_at();
