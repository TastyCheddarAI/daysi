create table if not exists customer_note (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  customer_email text not null,
  customer_name text,
  body text not null,
  created_by_user_id uuid references app_user(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_note_location_customer_idx
  on customer_note (location_id, lower(customer_email), updated_at desc);

create table if not exists customer_tag (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  customer_email text not null,
  label text not null,
  created_by_user_id uuid references app_user(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now()
);

create unique index if not exists customer_tag_location_customer_label_unique_idx
  on customer_tag (location_id, lower(customer_email), lower(label));

create index if not exists customer_tag_location_label_idx
  on customer_tag (location_id, lower(label));

create table if not exists customer_event (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  actor_user_id uuid references app_user(id) on delete set null,
  customer_email text not null,
  customer_name text,
  source text not null
    check (source in ('booking', 'commerce', 'learning', 'referral', 'ai', 'manual')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists customer_event_location_customer_idx
  on customer_event (location_id, lower(customer_email), occurred_at desc);

create index if not exists customer_event_location_type_idx
  on customer_event (location_id, event_type, occurred_at desc);

drop trigger if exists customer_note_set_updated_at on customer_note;
create trigger customer_note_set_updated_at
before update on customer_note
for each row execute function set_updated_at();
