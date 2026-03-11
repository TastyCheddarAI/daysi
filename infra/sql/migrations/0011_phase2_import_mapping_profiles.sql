create table if not exists import_mapping_profile (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brand(id) on delete cascade,
  location_id uuid not null references location(id) on delete cascade,
  source_system text not null,
  entity_type text not null,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  field_mappings jsonb not null,
  updated_by_user_id uuid references app_user(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_mapping_profile_location_idx
  on import_mapping_profile (location_id, source_system, entity_type, status);

drop trigger if exists import_mapping_profile_set_updated_at on import_mapping_profile;
create trigger import_mapping_profile_set_updated_at
before update on import_mapping_profile
for each row execute function set_updated_at();
