create table if not exists skin_assessment_intake (
  id uuid primary key default gen_random_uuid(),
  location_slug text not null,
  source_app text not null,
  event_id text not null,
  event_type text not null,
  source_version text,
  external_assessment_id text not null,
  customer_email text not null,
  customer_name text,
  customer_external_id text,
  signature_verified boolean not null default false,
  signature_header text,
  raw_payload jsonb not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (location_slug, source_app, event_id)
);

create index if not exists skin_assessment_intake_location_customer_idx
  on skin_assessment_intake (location_slug, customer_email, received_at desc);

create table if not exists skin_assessment (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null unique references skin_assessment_intake(id) on delete cascade,
  location_slug text not null,
  source_app text not null,
  event_id text not null,
  external_assessment_id text not null,
  customer_email text not null,
  customer_name text,
  customer_external_id text,
  analyzer_version text,
  captured_at timestamptz not null,
  received_at timestamptz not null,
  summary text not null,
  skin_type text,
  fitzpatrick_type text,
  confidence_score numeric(5,2),
  dominant_concern_keys text[] not null default '{}',
  concerns jsonb not null default '[]'::jsonb,
  treatment_goals text[] not null default '{}',
  contraindications text[] not null default '{}',
  recommended_service_slugs text[] not null default '{}',
  unresolved_recommended_service_slugs text[] not null default '{}',
  images jsonb not null default '[]'::jsonb,
  image_count integer not null default 0,
  signals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists skin_assessment_location_customer_idx
  on skin_assessment (location_slug, customer_email, captured_at desc);

create index if not exists skin_assessment_external_assessment_idx
  on skin_assessment (location_slug, external_assessment_id);
