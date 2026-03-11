# Daysi AI Provider Strategy

## Core Principle

Run an AWS-owned application platform with an internal AI gateway.

Do not wire product logic directly to any one model vendor.

Every external AI or data API sits behind an internal `AI Gateway` and `Intelligence Ingestion` layer that:

- normalizes requests
- logs provenance
- enforces cost and rate controls
- redacts sensitive inputs
- scores output quality
- routes by task type
- supports vendor failover

If we do this right, the moat belongs to `Daysi`, not to OpenAI, Grok, Perplexity, Kimi, or DataForSEO.

The moat should also absorb first-party diagnostic signals from the skin analyzer app, because those are more defensible than generic chat history.

## Best Use Of Your Existing Paid APIs

### DataForSEO

Use it for structured market and SEO intelligence, not chat.

Best uses:

- daily SERP tracking for target transactional keywords
- keyword expansion and search demand discovery
- historical keyword trends and CPC shifts
- backlink gap analysis versus competitors
- on-page and Lighthouse audits on Daysi pages and competitor pages
- content sentiment and citation monitoring
- Google Business, Trustpilot, Tripadvisor, and public review intelligence
- Google Shopping and Amazon merchant price monitoring where relevant

Why it matters:

- this is directly monetizable intelligence
- this feeds SEO, pricing, offer strategy, and local reputation workflows
- it provides normalized structured data that is easier to score and trend than scraped prose

Holes:

- it is a data feed, not your truth layer
- costs can spike if you treat it like an always-on firehose
- it should power scheduled jobs, dashboards, alerts, and models, not user-facing chat directly

### Perplexity

Use it as a web research engine and citation-aware source scout.

Best uses:

- research briefs with citations for new markets and treatments
- candidate source discovery for ingestion pipelines
- freshness-aware web-grounded answer generation
- search-only retrieval when you want ranked results without LLM synthesis
- embeddings for certain document retrieval experiments

Why it matters:

- it is strong for current web-grounded research
- its Search API is useful when you want results without surrendering synthesis to the provider
- it can shorten the time from question to source list dramatically

Holes:

- do not let answer text become truth without post-processing
- citations are useful, but they are not data contracts
- use Perplexity to find and rank sources, then ingest and normalize those sources into Daysi systems

### xAI / Grok

Use it for real-time trend radar, especially X-native signals.

Best uses:

- monitoring what people are saying on X about treatments, technologies, and local trends
- trend discovery around competitors, pricing complaints, demand spikes, and consumer language
- high-velocity social listening jobs
- selective web-grounded reasoning where Grok is competitive

Why it matters:

- xAI provides `x_search`, which is materially useful for early-signal market detection
- this can give Daysi a faster read on momentum and sentiment than static SEO tools

Holes:

- X is noisy and biased, so treat it as one signal among many
- xAI docs state Responses API is stateful by default and stores history unless disabled
- for sensitive jobs, enforce `store=false`

### Kimi 2.5

Use it for long-context synthesis and repeated large-context tasks.

Best uses:

- digesting large research packets
- comparing many competitor documents in one pass
- long-form policy or strategy synthesis
- repeated analysis over large fixed corpora where context caching pays off

Why it matters:

- Kimi is attractive for very large context tasks
- Moonshot’s official material shows context caching can cut repeated large-context costs substantially

Holes:

- I would not make Kimi the default orchestration brain
- enterprise controls and ecosystem maturity are not as reassuring as OpenAI for core agent runtime
- use it where its long-context economics win, not everywhere

### OpenAI

Use it as the primary orchestration and structured reasoning layer.

Best uses:

- extraction into typed JSON
- internal agents that need strong tool use
- background reasoning jobs
- evaluation harnesses and judge models
- embeddings for retrieval quality
- classification, summarization, enrichment, and decision support

Why it matters:

- OpenAI’s Responses API, background mode, webhooks, file search, and strong structured outputs are useful building blocks
- OpenAI embeddings remain a strong option for multilingual retrieval quality

Holes:

- do not make OpenAI hosted vector stores your moat
- if we use OpenAI file search, it should be for narrow workflows, not as the primary knowledge system
- background mode and some features have storage implications; use intentionally

## Recommended Routing Policy

### Operational AI

These are user-facing or staff-facing production flows.

- booking and conversion assistant
  primary: OpenAI
  fallback: Kimi or Grok depending on task
- customer support and policy QA
  primary: OpenAI
  retrieval: internal index
- structured extraction
  primary: OpenAI
- sensitive operational summaries
  primary: OpenAI with strict prompt and schema controls

### Intelligence AI

These are internal research and analysis flows.

- SEO and SERP intelligence
  primary data: DataForSEO
  synthesis: OpenAI or Kimi
- web research and source scouting
  primary: Perplexity Search or Sonar
  synthesis: OpenAI
- social trend detection
  primary data: xAI `x_search`
  synthesis: OpenAI
- large packet synthesis
  primary: Kimi 2.5
  fallback: OpenAI background jobs

## Architecture Pattern

### AI Gateway Service

The gateway should expose internal tasks, not vendor model names.

Examples:

- `research.web_grounded_brief`
- `research.source_scout`
- `seo.keyword_gap_report`
- `pricing.market_snapshot`
- `social.trend_scan`
- `extract.competitor_offer_schema`
- `support.answer_with_citations`
- `assistant.booking_followup`

Internally the gateway chooses:

- provider
- model
- tool configuration
- rate limit bucket
- fallback policy
- output schema

### Intelligence Ingestion Pipeline

Each pipeline run should produce:

- raw source payload
- normalized record
- extracted entities
- embedding job
- provenance metadata
- confidence score
- freshness timestamp

## Data Products To Build First

### 1. SEO Command Center

Inputs:

- DataForSEO SERP
- DataForSEO Labs
- DataForSEO OnPage
- DataForSEO Backlinks
- Perplexity Search

Outputs:

- rank movement alerts
- keyword gap reports
- competitor content gaps
- local SEO opportunity board
- page-level optimization backlog

### 2. Market Pulse

Inputs:

- xAI X Search
- Perplexity Search
- Firecrawl or internal crawlers
- DataForSEO Content Analysis

Outputs:

- trending topics
- pricing complaints
- competitor launch alerts
- treatment demand language clusters

### 3. Pricing Intelligence

Inputs:

- competitor site crawls
- DataForSEO Merchant where applicable
- first-party conversion and booking data
- credits, package uptake, and cart abandonment

Outputs:

- underpriced service alerts
- bundle recommendations
- elasticity experiments
- local offer recommendations

### 4. Revenue Conversion Brain

Inputs:

- chat transcripts
- booking starts and completions
- checkout funnels
- form dropoff
- content engagement

Outputs:

- high-converting messaging patterns
- offer sequencing recommendations
- objection handling playbooks
- landing page variant ideas

### 5. Assessment Intelligence

Inputs:

- skin analyzer webhook data
- treatment history
- provider notes
- booking cadence
- product purchases

Outputs:

- treatment recommendation support
- progress tracking over time
- membership upgrade opportunities
- provider preparation summaries
- before and after case-study intelligence

## What Not To Do

- do not let provider chat history become the system of record
- do not let cited answers skip ingestion and normalization
- do not let social sentiment drive pricing alone
- do not index sensitive customer data into third-party hosted stores unless explicitly approved
- do not build prompts around raw provider quirks in app code

## Immediate Implementation Plan

1. Build an internal `ai_gateway` contract and route everything through it.
2. Build an internal `intelligence_job` schema and event pipeline.
3. Start with three production jobs:
   - `seo.daily_snapshot`
   - `market.daily_trend_scan`
   - `competitor.weekly_offer_diff`
4. Store all outputs with provenance and freshness metadata.
5. Only after that, expose selected intelligence back to the app UI and admin.

## Research Links

- DataForSEO SERP API overview
  https://docs.dataforseo.com/v3/serp/overview/
- DataForSEO Labs overview
  https://docs.dataforseo.com/v3/dataforseo_labs-overview/
- DataForSEO historical keyword data
  https://docs.dataforseo.com/v3/dataforseo_labs-google-historical_keyword_data-live/
- DataForSEO Keywords Data overview
  https://docs.dataforseo.com/v3/keywords-data-overview/
- DataForSEO OnPage overview
  https://docs.dataforseo.com/v3/on_page-overview/
- DataForSEO Content Analysis overview
  https://docs.dataforseo.com/v3/content_analysis-overview/
- DataForSEO Backlinks overview
  https://docs.dataforseo.com/v3/backlinks-overview/
- DataForSEO Merchant overview
  https://docs.dataforseo.com/v3/merchant-api-overview/
- DataForSEO Business Data overview
  https://docs.dataforseo.com/v3/business_data-overview/
- Perplexity Sonar quickstart
  https://docs.perplexity.ai/docs/sonar/quickstart
- Perplexity Search API
  https://docs.perplexity.ai/api-reference
- Perplexity contextualized embeddings
  https://docs.perplexity.ai/docs/embeddings/contextualized-embeddings
- xAI Responses guide
  https://docs.x.ai/docs/guides
- xAI X Search tool
  https://docs.x.ai/developers/tools/x-search
- xAI security FAQ
  https://docs.x.ai/console/faq/security
- Moonshot Kimi quickstart
  https://platform.moonshot.ai/blog/posts/kimi-api-quick-start-guide
- Moonshot context caching
  https://platform.moonshot.ai/blog/posts/context-caching
- OpenAI data controls
  https://platform.openai.com/docs/models/how-we-use-your-data
- OpenAI file search
  https://platform.openai.com/docs/guides/tools-file-search/
- OpenAI background mode
  https://platform.openai.com/docs/guides/background
- OpenAI embeddings
  https://platform.openai.com/docs/guides/embeddings
