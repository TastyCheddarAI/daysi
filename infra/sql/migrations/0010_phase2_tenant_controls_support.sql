create table if not exists tenant_setting (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  setting_key text not null,
  value_type text not null
    check (value_type in ('boolean', 'number', 'string', 'string_array')),
  value_json jsonb not null,
  updated_by_user_id uuid references app_user(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, setting_key)
);

create index if not exists tenant_setting_location_idx
  on tenant_setting (location_id, setting_key);

create table if not exists admin_action_log (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid references location(id) on delete cascade,
  actor_user_id uuid references app_user(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_log_location_idx
  on admin_action_log (location_id, created_at desc);

create table if not exists support_case (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  subject text not null,
  category text not null,
  priority text not null
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null
    check (status in ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  opened_by_user_id uuid references app_user(id) on delete set null,
  opened_by_email text,
  assigned_to_user_id uuid references app_user(id) on delete set null,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_case_location_idx
  on support_case (location_id, status, updated_at desc);

create table if not exists support_case_event (
  id uuid primary key default gen_random_uuid(),
  support_case_id uuid not null references support_case(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  event_type text not null
    check (event_type in ('note', 'internal_note', 'status_changed', 'assignment_changed')),
  visibility text not null
    check (visibility in ('internal', 'tenant')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_user(id) on delete set null,
  created_by_display_name text,
  created_at timestamptz not null default now()
);

create index if not exists support_case_event_case_idx
  on support_case_event (support_case_id, created_at asc);

create table if not exists reconciliation_issue (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references import_job(id) on delete cascade,
  import_job_row_id uuid references import_job_row(id) on delete cascade,
  location_id uuid references location(id) on delete cascade,
  issue_code text not null,
  severity text not null
    check (severity in ('warning', 'error')),
  status text not null default 'open'
    check (status in ('open', 'resolved', 'ignored')),
  summary text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists reconciliation_issue_import_job_idx
  on reconciliation_issue (import_job_id, status, created_at desc);

drop trigger if exists tenant_setting_set_updated_at on tenant_setting;
create trigger tenant_setting_set_updated_at
before update on tenant_setting
for each row execute function set_updated_at();

drop trigger if exists support_case_set_updated_at on support_case;
create trigger support_case_set_updated_at
before update on support_case
for each row execute function set_updated_at();

drop trigger if exists reconciliation_issue_set_updated_at on reconciliation_issue;
create trigger reconciliation_issue_set_updated_at
before update on reconciliation_issue
for each row execute function set_updated_at();
