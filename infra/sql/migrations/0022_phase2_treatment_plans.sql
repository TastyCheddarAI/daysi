create table if not exists treatment_plan (
  id uuid primary key default gen_random_uuid(),
  location_slug text not null,
  customer_email text not null,
  customer_name text,
  source_assessment_id uuid not null references skin_assessment(id),
  source_ai_run_id uuid not null references ai_run(id),
  status text not null check (status in ('draft', 'shared', 'accepted', 'archived')),
  summary text not null,
  dominant_concern_keys text[] not null default '{}',
  recommended_service_slugs text[] not null default '{}',
  unresolved_recommended_service_slugs text[] not null default '{}',
  membership_suggestion jsonb,
  next_actions text[] not null default '{}',
  internal_notes text,
  created_by_user_id uuid references app_user(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shared_at timestamptz,
  accepted_at timestamptz,
  archived_at timestamptz,
  archived_reason text
);

create trigger treatment_plan_set_updated_at
before update on treatment_plan
for each row execute function set_updated_at();

create index if not exists treatment_plan_location_customer_idx
  on treatment_plan (location_slug, customer_email, updated_at desc);

create table if not exists treatment_plan_line (
  id uuid primary key default gen_random_uuid(),
  treatment_plan_id uuid not null references treatment_plan(id) on delete cascade,
  service_slug text not null,
  service_name text not null,
  rationale text not null,
  retail_amount_cents integer not null default 0,
  member_amount_cents integer not null default 0,
  duration_minutes integer not null,
  priority integer not null,
  created_at timestamptz not null default now()
);

create index if not exists treatment_plan_line_plan_priority_idx
  on treatment_plan_line (treatment_plan_id, priority);
