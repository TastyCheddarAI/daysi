create table if not exists ai_run (
  id text primary key,
  brand_id text not null references brand(id) on delete cascade,
  location_id text not null references location(id) on delete cascade,
  actor_user_id text references app_user(id) on delete set null,
  task_key text not null,
  provider_key text not null,
  model_key text not null,
  prompt_version text not null,
  status text not null check (status in ('completed')),
  source_provenance jsonb not null,
  evaluation jsonb not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz not null
);

create index if not exists ai_run_location_idx
  on ai_run (location_id, created_at desc);
