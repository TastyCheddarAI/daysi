alter table coupon
  add column if not exists location_id uuid references location(id) on delete cascade;

create index if not exists coupon_location_idx
  on coupon (location_id, lower(code));

alter table service_location_offer
  add column if not exists feature_tags jsonb not null default '[]'::jsonb;

alter table education_offer
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published'));

alter table education_offer
  add column if not exists config jsonb not null default '{}'::jsonb;

create table if not exists provider_service_assignment (
  id uuid primary key default gen_random_uuid(),
  provider_role_assignment_id uuid not null references provider_role_assignment(id) on delete cascade,
  service_id uuid not null references service(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (provider_role_assignment_id, service_id)
);

create index if not exists provider_service_assignment_service_idx
  on provider_service_assignment (service_id);
