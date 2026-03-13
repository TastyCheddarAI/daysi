create table if not exists growth_referral_program_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  name text not null,
  status text not null,
  code_prefix text not null,
  referred_reward jsonb,
  advocate_reward jsonb,
  second_level_reward jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  record jsonb not null
);

create index if not exists growth_referral_program_projection_location_idx
  on growth_referral_program_projection (location_slug, updated_at desc);

create table if not exists growth_referral_code_projection (
  id uuid primary key default gen_random_uuid(),
  program_id text not null,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  owner_user_id text,
  owner_email text not null,
  code text not null,
  created_at timestamptz not null,
  record jsonb not null
);

create index if not exists growth_referral_code_projection_location_idx
  on growth_referral_code_projection (location_slug, created_at desc);

create index if not exists growth_referral_code_projection_owner_idx
  on growth_referral_code_projection (lower(owner_email), location_slug);

create table if not exists growth_referral_relationship_projection (
  id uuid primary key default gen_random_uuid(),
  program_id text not null,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  referral_code_id text not null,
  referral_code text not null,
  referrer_user_id text,
  referrer_email text not null,
  referee_user_id text,
  referee_email text not null,
  status text not null,
  first_qualified_order_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  qualified_at timestamptz,
  record jsonb not null
);

create index if not exists growth_referral_relationship_projection_location_idx
  on growth_referral_relationship_projection (location_slug, created_at desc);

create table if not exists growth_referral_reward_event_projection (
  id uuid primary key default gen_random_uuid(),
  program_id text not null,
  relationship_id text not null,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  recipient text not null,
  recipient_user_id text,
  recipient_email text not null,
  reward jsonb not null,
  source_order_id text,
  status text not null,
  credit_entry_id text,
  created_at timestamptz not null,
  reversed_at timestamptz,
  record jsonb not null
);

create index if not exists growth_referral_reward_event_projection_location_idx
  on growth_referral_reward_event_projection (location_slug, created_at desc);
