insert into permission (code, description)
values
  ('admin.room.manage', 'Manage rooms and room schedules.')
on conflict (code) do update
set
  description = excluded.description;

insert into role_permission (role_id, permission_id)
select
  role_table.id,
  permission_table.id
from role as role_table
join permission as permission_table
  on permission_table.code = 'admin.room.manage'
where role_table.code in ('admin', 'owner')
on conflict do nothing;

create table if not exists room_capability (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references room(id) on delete cascade,
  capability_key text not null,
  created_at timestamptz not null default now(),
  unique (room_id, capability_key)
);

create table if not exists room_booking_window (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references room(id) on delete cascade,
  booking_id uuid,
  window_kind text not null default 'booking'
    check (window_kind in ('booking', 'maintenance', 'admin_hold')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists room_booking_window_lookup_idx
  on room_booking_window (room_id, starts_at, ends_at);

create table if not exists service_room_rule (
  id uuid primary key default gen_random_uuid(),
  service_variant_id uuid not null references service_variant(id) on delete cascade,
  capability_key text not null,
  required_room_count integer not null default 1 check (required_room_count > 0),
  created_at timestamptz not null default now(),
  unique (service_variant_id, capability_key)
);

alter table room_booking_window
  drop constraint if exists room_booking_window_booking_id_fkey;

alter table room_booking_window
  add constraint room_booking_window_booking_id_fkey
  foreign key (booking_id) references booking(id) on delete cascade;
