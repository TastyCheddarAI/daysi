-- Market intelligence tables: keyword demand, competitors, social trends,
-- content suggestions, customer journey intelligence, market briefs.
-- These are cross-brand admin data (no brand_id FK needed).

-- ── Keyword demand snapshots (DataForSEO) ───────────────────────────────────

create table if not exists mi_keyword_snapshots (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  location text not null,
  keyword text not null,
  monthly_search_volume integer not null default 0,
  competition text not null check (competition in ('LOW', 'MEDIUM', 'HIGH')),
  cpc numeric(10,4) not null default 0,
  trend jsonb not null default '[]'::jsonb,       -- number[]
  trend_direction text not null check (trend_direction in ('RISING', 'STABLE', 'DECLINING')),
  serp jsonb not null default '[]'::jsonb,         -- SerpResult[]
  scanned_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mi_keyword_snapshots_service_location_idx
  on mi_keyword_snapshots (service, location, monthly_search_volume desc);

create index if not exists mi_keyword_snapshots_volume_idx
  on mi_keyword_snapshots (monthly_search_volume desc, scanned_at desc);

-- ── Competitor clinic records (Perplexity) ──────────────────────────────────

create table if not exists mi_competitor_records (
  id uuid primary key default gen_random_uuid(),
  competitor_name text not null,
  website_url text not null,
  location text not null,
  services jsonb not null default '[]'::jsonb,          -- string[]
  pricing jsonb not null default '{}'::jsonb,            -- Record<string, number>
  rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  education_content jsonb not null default '[]'::jsonb,  -- string[]
  scanned_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mi_competitor_records_name_location_idx
  on mi_competitor_records (lower(competitor_name), lower(location));

-- ── Competitor change alerts ─────────────────────────────────────────────────

create table if not exists mi_competitor_alerts (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references mi_competitor_records(id) on delete cascade,
  competitor_name text not null,
  change_type text not null check (change_type in ('PRICE_CHANGE', 'NEW_SERVICE', 'NEW_CONTENT', 'RATING_CHANGE')),
  previous_value text not null,
  new_value text not null,
  significance text not null check (significance in ('LOW', 'MEDIUM', 'HIGH')),
  acknowledged boolean not null default false,
  detected_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mi_competitor_alerts_unacked_idx
  on mi_competitor_alerts (acknowledged, detected_at desc)
  where acknowledged = false;

-- ── Social trend records (xAI/Grok) ─────────────────────────────────────────

create table if not exists mi_social_trends (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('TWITTER', 'REDDIT', 'TIKTOK', 'INSTAGRAM')),
  topic text not null,
  related_services jsonb not null default '[]'::jsonb,  -- string[]
  sentiment_score numeric(4,3) not null default 0,
  velocity numeric(10,2) not null default 0,
  peak_reached_at timestamptz,
  scanned_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mi_social_trends_velocity_idx
  on mi_social_trends (velocity desc, scanned_at desc);

create index if not exists mi_social_trends_recent_idx
  on mi_social_trends (scanned_at desc);

-- ── Content suggestions (bridge: signals → education modules) ────────────────

create table if not exists mi_content_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  outline jsonb not null default '[]'::jsonb,         -- string[]
  source_signals jsonb not null default '{}'::jsonb,  -- { keywords?, competitorGap?, trendTopic?, trendPlatform? }
  estimated_search_volume integer not null default 0,
  priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status text not null check (status in ('PENDING', 'ACCEPTED', 'DISMISSED')) default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mi_content_suggestions_pending_idx
  on mi_content_suggestions (status, priority, estimated_search_volume desc)
  where status = 'PENDING';

-- ── Customer journey intelligence (Kimi 200k) ────────────────────────────────

create table if not exists mi_customer_journeys (
  customer_id text primary key,  -- upsert per customer
  analysis_date timestamptz not null,
  booking_pattern text not null,
  churn_risk text not null check (churn_risk in ('LOW', 'MEDIUM', 'HIGH')),
  churn_risk_reason text not null,
  recommended_outreach text not null,
  lifetime_value_estimate bigint not null default 0,  -- cents
  next_booking_prediction timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mi_customer_journeys_churn_idx
  on mi_customer_journeys (churn_risk, analysis_date desc)
  where churn_risk = 'HIGH';

-- ── Market brief reports (OpenAI weekly synthesis) ───────────────────────────

create table if not exists mi_market_briefs (
  id uuid primary key default gen_random_uuid(),
  week_of date not null unique,
  executive_summary text not null,
  top_keyword_opportunities jsonb not null default '[]'::jsonb,  -- KeywordDemandSnapshot[]
  competitor_alerts jsonb not null default '[]'::jsonb,           -- CompetitorChangeAlert[]
  trending_topics jsonb not null default '[]'::jsonb,             -- SocialTrendRecord[]
  content_suggestions_generated integer not null default 0,
  churn_risks_identified integer not null default 0,
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mi_market_briefs_week_idx
  on mi_market_briefs (week_of desc);
