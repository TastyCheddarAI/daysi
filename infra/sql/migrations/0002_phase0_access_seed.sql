insert into role (code, name, description)
values
  ('customer', 'Customer', 'Default customer-facing role.'),
  ('provider', 'Provider', 'Independent or employed service provider.'),
  ('staff', 'Staff', 'Operational staff role with limited location access.'),
  ('admin', 'Admin', 'Location or organization administrator.'),
  ('owner', 'Owner', 'Highest-trust operating role.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

insert into permission (code, description)
values
  ('platform.config.read', 'Read platform configuration.'),
  ('location.read', 'Read location summaries and availability context.'),
  ('catalog.read', 'Read public catalog information.'),
  ('booking.create', 'Create a booking as a customer.'),
  ('booking.manage.self', 'Manage self-owned bookings.'),
  ('booking.manage.location', 'Manage bookings for a location.'),
  ('membership.read.self', 'Read self membership state.'),
  ('provider.schedule.read.self', 'Read provider-owned schedule data.'),
  ('provider.schedule.write.self', 'Write provider-owned schedule data.'),
  ('provider.payout.read.self', 'Read provider payout reporting.'),
  ('admin.location.manage', 'Manage location settings.'),
  ('admin.machine.manage', 'Manage machines and machine schedules.'),
  ('admin.service.manage', 'Manage services and offers.'),
  ('admin.membership.manage', 'Manage membership plans and entitlements.'),
  ('admin.reporting.read', 'Read administrative reporting.')
on conflict (code) do update
set
  description = excluded.description;

insert into role_permission (role_id, permission_id)
select
  role_table.id,
  permission_table.id
from role as role_table
join permission as permission_table
  on (
    (role_table.code = 'customer' and permission_table.code in (
      'platform.config.read',
      'location.read',
      'catalog.read',
      'booking.create',
      'booking.manage.self',
      'membership.read.self'
    ))
    or
    (role_table.code = 'provider' and permission_table.code in (
      'platform.config.read',
      'location.read',
      'catalog.read',
      'booking.manage.self',
      'provider.schedule.read.self',
      'provider.schedule.write.self',
      'provider.payout.read.self'
    ))
    or
    (role_table.code = 'staff' and permission_table.code in (
      'platform.config.read',
      'location.read',
      'catalog.read',
      'booking.manage.location',
      'admin.reporting.read'
    ))
    or
    (role_table.code in ('admin', 'owner') and permission_table.code in (
      'platform.config.read',
      'location.read',
      'catalog.read',
      'booking.manage.location',
      'admin.location.manage',
      'admin.machine.manage',
      'admin.service.manage',
      'admin.membership.manage',
      'admin.reporting.read'
    ))
  )
on conflict do nothing;
