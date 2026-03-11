alter table coupon
  add column if not exists stackable boolean not null default false;

alter table coupon
  add column if not exists config jsonb not null default '{}'::jsonb;

alter table sales_order_item
  add column if not exists discount_amount_cents integer not null default 0 check (discount_amount_cents >= 0);

create table if not exists sales_order_coupon_application (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_order(id) on delete cascade,
  coupon_id uuid not null references coupon(id) on delete cascade,
  code text not null,
  discount_amount_cents integer not null check (discount_amount_cents >= 0),
  created_at timestamptz not null default now(),
  unique (sales_order_id, coupon_id)
);

create table if not exists course (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists module (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references course(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

create table if not exists lesson (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references module(id) on delete cascade,
  slug text not null,
  title text not null,
  body_markdown text not null default '',
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug)
);

create table if not exists education_offer_item (
  id uuid primary key default gen_random_uuid(),
  education_offer_id uuid not null references education_offer(id) on delete cascade,
  course_id uuid references course(id) on delete cascade,
  module_id uuid references module(id) on delete cascade,
  item_type text not null
    check (item_type in ('course', 'module')),
  created_at timestamptz not null default now(),
  check (
    (item_type = 'course' and course_id is not null and module_id is null) or
    (item_type = 'module' and module_id is not null)
  )
);

create table if not exists learning_entitlement (
  id uuid primary key default gen_random_uuid(),
  education_offer_id uuid not null references education_offer(id) on delete cascade,
  user_id uuid references app_user(id) on delete set null,
  source_sales_order_id uuid references sales_order(id) on delete set null,
  membership_subscription_id uuid references membership_subscription(id) on delete set null,
  customer_email text not null,
  access_source text not null
    check (access_source in ('purchase', 'membership', 'admin_grant')),
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists learning_entitlement_lookup_idx
  on learning_entitlement (customer_email, status, granted_at desc);

drop trigger if exists course_set_updated_at on course;
create trigger course_set_updated_at
before update on course
for each row execute function set_updated_at();

drop trigger if exists module_set_updated_at on module;
create trigger module_set_updated_at
before update on module
for each row execute function set_updated_at();

drop trigger if exists lesson_set_updated_at on lesson;
create trigger lesson_set_updated_at
before update on lesson
for each row execute function set_updated_at();
