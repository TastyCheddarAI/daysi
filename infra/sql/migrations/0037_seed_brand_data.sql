-- Seed brand, organization, and location data
insert into brand (id, slug, name, primary_domain)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'daysi',
  'Daysi',
  'daysi.ca'
)
on conflict (slug) do update
set
  name = excluded.name,
  primary_domain = excluded.primary_domain,
  updated_at = now();

insert into organization (id, brand_id, slug, name, legal_name, operating_mode)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'daysi-flagship',
  'Daysi Flagship',
  'Daysi Medical Aesthetics Inc.',
  'corporate'
)
on conflict (brand_id, slug) do update
set
  name = excluded.name,
  legal_name = excluded.legal_name,
  updated_at = now();

insert into location (id, brand_id, organization_id, slug, name, timezone, status)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  'daysi-flagship',
  'Daysi Flagship Location',
  'America/Toronto',
  'active'
)
on conflict (brand_id, slug) do update
set
  name = excluded.name,
  timezone = excluded.timezone,
  status = excluded.status,
  updated_at = now();
