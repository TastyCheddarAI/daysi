create table if not exists enrollment (
  id uuid primary key default gen_random_uuid(),
  learning_entitlement_id uuid not null references learning_entitlement(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  education_offer_slug text not null,
  education_offer_title text not null,
  actor_user_id uuid references app_user(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  module_slugs jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger enrollment_set_updated_at
before update on enrollment
for each row execute function set_updated_at();

create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollment(id) on delete cascade,
  module_slug text not null,
  status text not null check (status in ('not_started', 'in_progress', 'completed')),
  percent_complete integer not null check (percent_complete between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (enrollment_id, module_slug)
);

create trigger lesson_progress_set_updated_at
before update on lesson_progress
for each row execute function set_updated_at();

create table if not exists certificate (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollment(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  education_offer_slug text not null,
  education_offer_title text not null,
  actor_user_id uuid references app_user(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  issued_at timestamptz not null default now(),
  unique (enrollment_id)
);
