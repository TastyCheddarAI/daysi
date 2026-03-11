alter table provider_comp_plan
  add column if not exists service_id uuid references service(id) on delete set null;

create unique index if not exists provider_comp_plan_default_unique_idx
  on provider_comp_plan (location_id, provider_id)
  where service_id is null and ends_at is null;

create unique index if not exists provider_comp_plan_service_unique_idx
  on provider_comp_plan (location_id, provider_id, service_id)
  where service_id is not null and ends_at is null;

create index if not exists provider_comp_plan_service_idx
  on provider_comp_plan (service_id, starts_at desc)
  where service_id is not null;
