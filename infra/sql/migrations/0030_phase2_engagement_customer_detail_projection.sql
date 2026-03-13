create table if not exists engagement_customer_note_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  customer_email text not null,
  customer_name text,
  body text not null,
  created_by_user_id text,
  created_by_email text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  record jsonb not null
);

create index if not exists engagement_customer_note_projection_customer_idx
  on engagement_customer_note_projection (location_slug, lower(customer_email), updated_at desc);

create table if not exists engagement_customer_tag_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  customer_email text not null,
  label text not null,
  created_by_user_id text,
  created_by_email text,
  created_at timestamptz not null,
  record jsonb not null
);

create index if not exists engagement_customer_tag_projection_customer_idx
  on engagement_customer_tag_projection (location_slug, lower(customer_email), lower(label));
