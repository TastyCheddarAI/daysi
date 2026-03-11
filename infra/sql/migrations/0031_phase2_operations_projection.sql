create table if not exists operations_admin_action_log_projection (
  id text primary key,
  brand_id uuid references brand(id) on delete cascade,
  location_id uuid references location(id) on delete cascade,
  location_slug text,
  actor_user_id text,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  record jsonb not null
);

create index if not exists operations_admin_action_log_projection_location_idx
  on operations_admin_action_log_projection (location_slug, occurred_at desc);

create index if not exists operations_admin_action_log_projection_action_idx
  on operations_admin_action_log_projection (action, occurred_at desc);

create table if not exists operations_support_case_projection (
  id text primary key,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  subject text not null,
  category text not null,
  priority text not null,
  status text not null,
  opened_by_user_id text,
  opened_by_email text,
  assigned_to_user_id text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  resolved_at timestamptz,
  record jsonb not null
);

create index if not exists operations_support_case_projection_location_idx
  on operations_support_case_projection (location_slug, updated_at desc);

create table if not exists operations_support_case_event_projection (
  id text primary key,
  support_case_id text not null,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  type text not null,
  visibility text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id text,
  created_by_display_name text,
  created_at timestamptz not null,
  record jsonb not null
);

create index if not exists operations_support_case_event_projection_case_idx
  on operations_support_case_event_projection (support_case_id, created_at asc);

create table if not exists operations_import_job_projection (
  id text primary key,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  source_system text not null,
  entity_type text not null,
  status text not null,
  file_name text,
  metadata jsonb not null default '{}'::jsonb,
  counts jsonb not null,
  rows jsonb not null default '[]'::jsonb,
  initiated_by_user_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  error_message text,
  record jsonb not null
);

create index if not exists operations_import_job_projection_location_idx
  on operations_import_job_projection (location_slug, created_at desc);

create table if not exists operations_import_mapping_profile_projection (
  id text primary key,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  source_system text not null,
  entity_type text not null,
  name text not null,
  status text not null,
  field_mappings jsonb not null default '[]'::jsonb,
  updated_by_user_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  record jsonb not null
);

create index if not exists operations_import_mapping_profile_projection_location_idx
  on operations_import_mapping_profile_projection (location_slug, name asc);

create table if not exists operations_reconciliation_issue_projection (
  id text primary key,
  import_job_id text not null,
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  row_number integer not null,
  external_id text,
  issue_code text not null,
  severity text not null,
  status text not null,
  summary text not null,
  detail text,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  resolved_at timestamptz,
  record jsonb not null
);

create index if not exists operations_reconciliation_issue_projection_job_idx
  on operations_reconciliation_issue_projection (import_job_id, row_number asc);
