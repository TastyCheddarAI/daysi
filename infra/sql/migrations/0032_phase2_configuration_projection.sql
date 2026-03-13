create table if not exists configuration_tenant_setting_projection (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  location_slug text not null,
  setting_key text not null,
  value_type text not null,
  value jsonb not null,
  updated_by_user_id text,
  updated_at timestamptz not null,
  record jsonb not null
);

create index if not exists configuration_tenant_setting_projection_location_idx
  on configuration_tenant_setting_projection (location_slug, setting_key, updated_at desc);

create table if not exists configuration_access_assignment_projection (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  location_scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  record jsonb not null
);

create index if not exists configuration_access_assignment_projection_email_role_idx
  on configuration_access_assignment_projection (lower(email), role);
