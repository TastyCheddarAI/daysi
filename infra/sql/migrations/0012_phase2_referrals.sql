create table if not exists referral_program (
  id text primary key,
  brand_id text not null references brand(id) on delete cascade,
  location_id text not null references location(id) on delete cascade,
  name text not null,
  status text not null check (status in ('draft', 'active', 'inactive', 'archived')),
  code_prefix text not null,
  referred_reward jsonb,
  advocate_reward jsonb,
  second_level_reward jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger referral_program_set_updated_at
before update on referral_program
for each row execute function set_updated_at();

create table if not exists referral_code (
  id text primary key,
  referral_program_id text not null references referral_program(id) on delete cascade,
  location_id text not null references location(id) on delete cascade,
  owner_user_id text references app_user(id) on delete set null,
  owner_email text not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (location_id, code)
);

create table if not exists referral_relationship (
  id text primary key,
  referral_program_id text not null references referral_program(id) on delete cascade,
  location_id text not null references location(id) on delete cascade,
  referral_code_id text not null references referral_code(id) on delete restrict,
  referrer_user_id text references app_user(id) on delete set null,
  referrer_email text not null,
  referee_user_id text references app_user(id) on delete set null,
  referee_email text not null,
  status text not null check (status in ('applied', 'qualified')),
  first_qualified_order_id text references commerce_order(id) on delete set null,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger referral_relationship_set_updated_at
before update on referral_relationship
for each row execute function set_updated_at();

create unique index if not exists referral_relationship_unique_referee_per_location
  on referral_relationship (location_id, lower(referee_email));

create table if not exists referral_reward_event (
  id text primary key,
  referral_program_id text not null references referral_program(id) on delete cascade,
  referral_relationship_id text not null references referral_relationship(id) on delete cascade,
  location_id text not null references location(id) on delete cascade,
  recipient_user_id text references app_user(id) on delete set null,
  recipient_email text not null,
  recipient_role text not null check (recipient_role in ('referee', 'referrer', 'referrer_level_2')),
  reward jsonb not null,
  source_order_id text references commerce_order(id) on delete set null,
  status text not null check (status in ('earned', 'reversed')),
  credit_entry_id text references credit_entry(id) on delete set null,
  created_at timestamptz not null default now(),
  reversed_at timestamptz
);

create index if not exists referral_reward_event_location_idx
  on referral_reward_event (location_id, created_at desc);
