create table if not exists integration_processed_webhook_event_projection (
  source text not null
    check (source in ('stripe')),
  event_id text not null,
  processed_at timestamptz not null,
  primary key (source, event_id)
);

create index if not exists integration_processed_webhook_event_projection_processed_idx
  on integration_processed_webhook_event_projection (processed_at desc);
