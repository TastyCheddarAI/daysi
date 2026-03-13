create table if not exists clinical_ai_run (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  actor_user_id uuid references app_user(id) on delete set null,
  task_key text not null,
  provider_key text not null,
  model_key text not null,
  prompt_version text not null,
  status text not null check (status in ('completed')),
  source_provenance jsonb not null,
  evaluation jsonb not null,
  record jsonb not null,
  created_at timestamptz not null,
  completed_at timestamptz not null
);

create index if not exists clinical_ai_run_location_idx
  on clinical_ai_run (location_slug, created_at desc);

create table if not exists clinical_skin_assessment_intake (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
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
  record jsonb not null,
  received_at timestamptz not null,
  created_at timestamptz not null,
  unique (location_slug, source_app, event_id)
);

create index if not exists clinical_skin_assessment_intake_location_customer_idx
  on clinical_skin_assessment_intake (location_slug, customer_email, received_at desc);

create table if not exists clinical_skin_assessment (
  id uuid primary key default gen_random_uuid(),
  raw_intake_id uuid not null unique
    references clinical_skin_assessment_intake(id) on delete cascade,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
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
  record jsonb not null,
  created_at timestamptz not null
);

create index if not exists clinical_skin_assessment_location_customer_idx
  on clinical_skin_assessment (location_slug, customer_email, captured_at desc);

create index if not exists clinical_skin_assessment_raw_intake_idx
  on clinical_skin_assessment (raw_intake_id);

create table if not exists clinical_treatment_plan (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  customer_email text not null,
  customer_name text,
  source_assessment_id uuid not null
    references clinical_skin_assessment(id) on delete restrict,
  source_ai_run_id uuid not null
    references clinical_ai_run(id) on delete restrict,
  status text not null check (status in ('draft', 'shared', 'accepted', 'archived')),
  summary text not null,
  dominant_concern_keys text[] not null default '{}',
  recommended_service_slugs text[] not null default '{}',
  unresolved_recommended_service_slugs text[] not null default '{}',
  membership_suggestion jsonb,
  next_actions text[] not null default '{}',
  internal_notes text,
  created_by_user_id uuid references app_user(id) on delete set null,
  record jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  shared_at timestamptz,
  accepted_at timestamptz,
  archived_at timestamptz,
  archived_reason text
);

create index if not exists clinical_treatment_plan_location_customer_idx
  on clinical_treatment_plan (location_slug, customer_email, updated_at desc);
