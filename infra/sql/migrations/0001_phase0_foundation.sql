create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists brand (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  primary_domain text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  slug text not null,
  name text not null,
  legal_name text,
  operating_mode text not null default 'corporate'
    check (operating_mode in ('corporate', 'franchise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists location (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  organization_id uuid not null references organization(id) on delete cascade,
  slug text not null,
  name text not null,
  timezone text not null default 'America/Toronto',
  status text not null default 'active'
    check (status in ('active', 'inactive', 'launching')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists location_feature_flag (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references location(id) on delete cascade,
  feature_key text not null
    check (feature_key in ('education', 'memberships', 'referrals', 'skinAnalysis')),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, feature_key)
);

create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  email text,
  display_name text not null,
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_user_email_unique_idx
  on app_user (lower(email))
  where email is not null;

create table if not exists auth_identity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  provider text not null check (provider in ('cognito')),
  provider_subject text not null,
  provider_email text,
  created_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

create table if not exists profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  brand_id uuid not null references brand(id) on delete cascade,
  profile_type text not null
    check (profile_type in ('customer', 'provider', 'staff', 'admin', 'owner')),
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brand_id)
);

create table if not exists role (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists permission (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists role_permission (
  role_id uuid not null references role(id) on delete cascade,
  permission_id uuid not null references permission(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists user_role_assignment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  role_id uuid not null references role(id) on delete cascade,
  scope_type text not null
    check (scope_type in ('brand', 'organization', 'location')),
  scope_brand_id uuid references brand(id) on delete cascade,
  scope_organization_id uuid references organization(id) on delete cascade,
  scope_location_id uuid references location(id) on delete cascade,
  assigned_by_user_id uuid references app_user(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (scope_type = 'brand' and scope_brand_id is not null and scope_organization_id is null and scope_location_id is null)
    or
    (scope_type = 'organization' and scope_brand_id is not null and scope_organization_id is not null and scope_location_id is null)
    or
    (scope_type = 'location' and scope_brand_id is not null and scope_organization_id is not null and scope_location_id is not null)
  ),
  unique (
    user_id,
    role_id,
    scope_type,
    scope_brand_id,
    scope_organization_id,
    scope_location_id
  )
);

create table if not exists idempotency_key (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  locked_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (scope_key, idempotency_key)
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brand(id) on delete cascade,
  actor_user_id uuid references app_user(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'system')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  scope_type text not null
    check (scope_type in ('brand', 'organization', 'location', 'system')),
  scope_brand_id uuid references brand(id) on delete set null,
  scope_organization_id uuid references organization(id) on delete set null,
  scope_location_id uuid references location(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists audit_log_scope_idx
  on audit_log (scope_type, scope_brand_id, scope_organization_id, scope_location_id, occurred_at desc);

create table if not exists outbox_event (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brand(id) on delete cascade,
  event_name text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'published', 'failed')),
  available_at timestamptz not null default now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists outbox_event_pending_idx
  on outbox_event (status, available_at)
  where status in ('pending', 'processing');

create table if not exists import_job (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  source_system text not null,
  entity_type text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  file_name text,
  initiated_by_user_id uuid references app_user(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists import_job_row (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references import_job(id) on delete cascade,
  row_number integer not null,
  external_id text,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'processed', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_job_id, row_number)
);

create index if not exists import_job_row_status_idx
  on import_job_row (import_job_id, status);

drop trigger if exists brand_set_updated_at on brand;
create trigger brand_set_updated_at
before update on brand
for each row execute function set_updated_at();

drop trigger if exists organization_set_updated_at on organization;
create trigger organization_set_updated_at
before update on organization
for each row execute function set_updated_at();

drop trigger if exists location_set_updated_at on location;
create trigger location_set_updated_at
before update on location
for each row execute function set_updated_at();

drop trigger if exists location_feature_flag_set_updated_at on location_feature_flag;
create trigger location_feature_flag_set_updated_at
before update on location_feature_flag
for each row execute function set_updated_at();

drop trigger if exists app_user_set_updated_at on app_user;
create trigger app_user_set_updated_at
before update on app_user
for each row execute function set_updated_at();

drop trigger if exists profile_set_updated_at on profile;
create trigger profile_set_updated_at
before update on profile
for each row execute function set_updated_at();

drop trigger if exists role_set_updated_at on role;
create trigger role_set_updated_at
before update on role
for each row execute function set_updated_at();

drop trigger if exists import_job_set_updated_at on import_job;
create trigger import_job_set_updated_at
before update on import_job
for each row execute function set_updated_at();

drop trigger if exists import_job_row_set_updated_at on import_job_row;
create trigger import_job_row_set_updated_at
before update on import_job_row
for each row execute function set_updated_at();
