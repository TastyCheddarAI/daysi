# Daysi Cutover Master Plan

## Executive Call

Build `Daysi` as an AWS-native modular monolith with dedicated worker services, not as a browser-to-database app and not as premature microservices.

That means:

- `web`: Next.js for SSR, SEO, content velocity, and conversion-focused landing experiences
- `api`: a dedicated application service with explicit domain boundaries
- `workers`: async jobs for ingestion, enrichment, analytics, and intelligence pipelines
- `db`: Aurora PostgreSQL as the system of record
- `search`: OpenSearch Serverless for semantic retrieval over scraped and internal intelligence data
- `lake`: S3 plus Glue plus Athena on Iceberg for long-horizon analytics and model feature generation
- `identity`: Cognito for authentication, but roles, profile, entitlements, and business permissions stay in our database
- `orchestration`: EventBridge, SQS, and Step Functions
- `ai`: an internal AI gateway on AWS that can route across Bedrock plus approved external model and data providers

This is the best fit because it removes the current platform lock-in, keeps operational complexity sane, and still leaves room for real AI and data products without turning the stack into architecture theater.

## The Blunt Opinion

The current app is a prototype wearing production clothing.

The good:

- there is a real product surface here
- there are useful business flows already modeled
- the frontend is recoverable
- the team already discovered real demand areas, booking, commerce, learning, referrals, analytics, and AI-assisted conversion

The bad:

- business logic is smeared across React hooks and provider SDK calls
- the browser talks too directly to the backend platform
- the current backend is a collection of provider-coupled functions, not a durable application platform
- Square is being treated as more than a payment/commerce provider, it is effectively part of the app's domain model
- the AI layer is not a moat, it is prompt glue around external APIs
- branding, metadata, domains, storage keys, and content are still hardcoded
- there is no real test safety net

What smells:

- direct browser dependence on auth, tables, and edge functions
- operational domains using third parties as source of truth
- checkout, bookings, CRM sync, revenue, and AI booking all tied to the same external provider seam
- no hard separation between operational data, analytical data, and AI retrieval data

The current shape is fine for proving an idea. It is not fine for a business that wants control, defensibility, and future-proof execution.

## What Best In Class Looks Like

### 1. Product Architecture

One codebase, multiple runtime concerns:

- `apps/web`
  Next.js 15, App Router, SSR and ISR for public pages, authenticated dashboard UI, admin UI
- `apps/api`
  TypeScript API service, preferably Fastify or NestJS, with OpenAPI contracts and strict validation
- `apps/workers`
  queue-driven workers for scraping, enrichment, embeddings, analytics rollups, pricing intelligence, and scheduled maintenance
- `packages/domain`
  domain services and policies with zero framework code
- `packages/contracts`
  API schemas, event schemas, DTOs, and validation

This is a modular monolith, not a spaghetti monolith.

### 2. Domain Model

Own these domains internally:

- identity
- organizations and franchise hierarchy
- locations
- profiles
- provider compensation
- catalog
- pricing
- bookings
- schedules and capacity
- machines and rooms
- orders
- payments
- memberships and subscriptions
- coupons and promotions
- credits and referrals
- customers and CRM notes
- learning and enrollments
- skin analysis intake and assessments
- analytics events
- intelligence documents
- model prompts and AI actions

Provider integrations should become adapters at the edge, never the place where business rules live.

### 2A. Expansion-Ready Operating Model

This platform has to be ready for one brand, multiple locations, and franchise-style operational independence within the next 24 months.

Recommended hierarchy:

- brand
- organization
- location
- staff member
- independent provider
- room
- machine

Key rules:

- every operational record must be scoped to `location_id`
- permissions must support brand-level, organization-level, and location-level access
- reporting must roll up by provider, location, and full network
- location-level feature enablement must be possible for modules such as skin analysis, education, memberships, and future plugins

This supports:

- corporate-owned locations
- franchise-style locations
- shared admin at the brand level
- location-specific staff, pricing, schedules, machines, memberships, and reporting
- dynamic onboarding of future locations that are not known at build time

Do not use database-per-location for the first 5 locations. That adds drag without adding real leverage.

### 2B. Resource-Based Scheduling

Your scheduling engine cannot just book a service and a person.

It must resolve:

- location operating hours
- provider availability
- provider self-managed schedule templates
- admin overrides
- machine availability
- room availability when required
- service duration and cleanup buffers
- machine-to-service capability mapping
- membership entitlement constraints
- blackout windows, maintenance windows, and time-off

For Daysi, availability is a resource constraint problem, not a calendar widget.

Machine sharing rule:

- machines are shared resources across commissioned providers
- each machine has one shared schedule per location
- providers can only book against machine time that is open and compatible with the service they perform
- machine assignment must prevent overlapping bookings across providers

### 2C. Commerce And Entitlements

The commerce model needs more than products and orders.

It must support:

- standard retail service pricing for non-members
- one-time treatments
- packages
- products
- memberships
- coupons
- referral rewards
- service credits
- two-level referrals if enabled
- monthly service entitlements by membership tier

That means we need:

- a ledger for credits and adjustments
- a promotion engine
- a membership entitlement engine
- rules for what can be booked, redeemed, discounted, or excluded

Do not hardcode membership access in frontend checks. It belongs in the booking and commerce domain services.

Core booking rule:

- a customer does not need a membership to book a service unless that specific service is explicitly configured as membership-only
- retail pricing must remain available for bookable services alongside membership pricing, credits, or included entitlements
- memberships are an optional pricing and entitlement layer, not the default gate for service booking

Membership rule:

- do not hardcode membership tiers into the platform
- admin must be able to create a membership plan and bundle included services, discounts, limits, and education access rules dynamically

### 2D. Education System

The education system is part of the core platform.

It should support:

- courses
- modules
- lessons
- progress tracking
- enrollments
- certifications
- gated access by purchase, role, or membership tier
- future provider education and compliance workflows

Commercial rule:

- every education offering must be represented as a productized offer
- an education product can be free or paid
- admin must be able to set and change the price or mark it free
- access is granted only through explicit entitlement rules, never by hardcoded page visibility
- any education product can be discounted by coupons or promotions
- memberships can unlock education only through education-specific membership entitlements
- staff access can be granted for free through admin-controlled entitlements
- education commerce must support selling a single module or a bundled education offer that unlocks multiple modules
- education revenue must be tracked as its own revenue stream and reported separately from services, retail products, memberships, and provider-compensated sales

Audience rule:

- education is primarily for industry learners, proprietary-method students, competitors, and professional trainees
- do not assume education is a standard customer upsell path
- education should still use the same commerce and entitlement engine, but with its own audience, funnel, and reporting lens

Modeling rule:

- do not let inconsistent content naming drive the schema
- use a commercial `education_offer` layer and map it to whatever content units it grants access to
- this avoids baking temporary naming confusion around lessons, modules, and courses into permanent infrastructure

### 2E. Skin Analyzer Intake

The skin analyzer app you are building now should integrate as an inbound event source, not as a loose attachment.

Best-in-class design:

- receive webhook or API posts through a signed ingestion endpoint
- validate source signature and schema version
- store raw payloads and images safely
- normalize results into internal assessment entities
- attach assessments to client profiles, treatment history, and AI retrieval
- preserve source provenance, analyzer version, and timestamp

### 3. Runtime Architecture

Recommended topology:

- CloudFront in front of everything public
- ALB behind CloudFront
- ECS Fargate service for `web`
- ECS Fargate service for `api`
- ECS Fargate service for `workers`
- Aurora PostgreSQL for transactional data
- S3 for assets, exports, scraped raw payloads, and document archives
- OpenSearch Serverless vector collection for semantic retrieval
- EventBridge for domain events
- SQS queues between producer and worker paths
- Step Functions Standard for auditable, exactly-once business workflows
- Step Functions Express for high-volume ingestion and transformation
- an internal AI gateway for inference, routing, cost control, guardrails, and provider failover

Why not microservices first:

- your current complexity is domain chaos, not service count scarcity
- microservices would multiply failure modes before you even own your domains cleanly
- a modular monolith gives speed now and clean extraction points later

### 3A. Inbound Event Architecture

For external producers like the skin analyzer app:

- API Gateway or ALB ingress endpoint
- request signing verification
- raw payload archive to S3
- publish normalized events to EventBridge
- fan out to workers for storage, enrichment, notification, and intelligence updates

This gives replayability, auditing, and resilience instead of brittle webhook handlers that mutate production state directly.

## AI Strategy That Is Actually A Moat

The moat is not "we added chat".

The moat is:

- first-party behavioral data
- clean operational records
- external market intelligence with provenance
- ranking and pricing features built from history
- evaluation and feedback loops
- fast experiments with guardrails and rollback

### Data Layers

- operational store
  bookings, orders, pricing decisions, customer events, referrals, learning completion
- intelligence corpus
  scraped competitor pages, local market pages, treatment pages, reviews, news, regulatory pages
- analytical lake
  raw, normalized, and feature-ready data in S3 and Iceberg
- retrieval index
  semantically searchable documents and chunk metadata in OpenSearch

### AI Capabilities

- conversion copilot
  recommend offers, answer treatment questions, move users to booking
- pricing intelligence
  detect market changes, underpricing, package opportunities, and elasticity signals
- SEO intelligence
  identify topic gaps, schema opportunities, and content decay
- customer intelligence
  segment users by behavior, not just demographics
- operator intelligence
  surface staffing, utilization, and margin issues early
- assessment intelligence
  synthesize skin analyzer inputs, treatment history, and provider notes into decision support

### Non-Negotiable AI Controls

- every generated recommendation needs provenance
- every scraped source gets freshness metadata and trust scoring
- every prompt and tool flow gets evaluation datasets
- every automated action must be idempotent and auditable

## Firecrawl Decision

If you want literal "100% AWS", hosted Firecrawl breaks that rule.

If you want the best scraper reliability, hosted Firecrawl is stronger than self-hosting because the docs state self-hosted instances do not have access to Fire-engine and some endpoints are not supported in self-hosting.

Best-in-class compromise:

- define a `crawler` interface owned by Daysi
- make self-hosted Firecrawl on AWS one adapter
- make Playwright-based internal workers another adapter
- store only normalized output in our systems
- never make the moat depend on the scraper vendor

My recommendation:

- short term, self-host Firecrawl on AWS only if you need it quickly for basic business-site ingestion
- medium term, build internal Playwright workers for high-value targets and brittle sites
- long term, keep Firecrawl optional, not foundational

## Payment Reality Check

This is where magical thinking gets expensive.

If by "standalone app" you mean:

- your own product, booking, pricing, CRM, analytics, and order logic

then yes, do that.

If by "standalone app" you mean:

- store raw card data
- build your own card vault
- become your own payment processor

then no, that is not best in class. That is compliance debt and operational pain.

AWS has Payment Cryptography, but that is infrastructure for payment processing cryptography, not a merchant checkout replacement.

Best-in-class payment design:

- Daysi owns the order, pricing, refunds, credits, ledger, and booking consequences
- a replaceable PSP adapter handles tokenized payment authorization and capture
- the PSP is not the system of record

Square should be removed. But "no Square" does not mean "be your own card network".

## Hosting Decision I Poked Holes In

### Rejected as final answer: stay on Vite SPA

- fast to keep
- bad long-term answer for SEO-heavy growth
- keeps too much logic client-side

### Rejected as final answer: Next.js on Amplify only

- Amplify supports Next.js SSR, ISR, middleware, image optimization, and Next.js versions through 15
- but AWS documents that Amplify Hosting does not support Next.js streaming
- this matters because Daysi wants streamed AI interactions and richer server-driven UX over time

Conclusion:

- use Next.js
- do not make Amplify the hard dependency for all server behavior
- prefer CloudFront plus ECS Fargate for maximum control and no hosting feature ceiling

## Identity Decision I Poked Holes In

### Chosen

- Cognito for authentication only

### Not chosen

- custom auth service on day one

Why:

- Cognito already handles hosted login, OAuth 2.0, tokens, and federation
- AWS documents that Cognito can standardize backend systems on one set of tokens
- rolling custom auth now would burn time without creating moat

Caveat:

- Cognito should not own business authorization
- keep app roles, staff permissions, admin entitlements, and feature flags in Aurora

## Data Layer Decision I Poked Holes In

### Aurora PostgreSQL

Chosen for:

- transactional truth
- relational integrity
- reporting joins
- booking and order correctness

### OpenSearch Serverless

Chosen for:

- vector retrieval over scraped and internal documents
- hybrid search with full-text plus vector plus filters
- better fit than forcing semantic retrieval into the operational database

### S3 plus Glue plus Athena Iceberg

Chosen for:

- historical analytics
- feature generation
- time travel on analytical tables
- large-scale raw and normalized intelligence storage

Caveat:

- Iceberg is for analytics, not your operational write path
- Athena documents limitations around DDL on Lake Formation registered Iceberg tables, so do not overcomplicate governance on day one

## Workflow Design

Use two workflow classes:

- Step Functions Standard
  for money movement, refunds, booking confirmation, cancellation, credits, and other non-idempotent workflows
- Step Functions Express
  for ingestion, normalization, summarization, chunking, and other idempotent high-volume jobs

This split matters because AWS documents Standard workflows as durable and exactly-once, while Express is better for high-volume event processing and uses at-least-once execution.

## The Cutover Plan

### Phase 0. Freeze The Chaos

Goal:

- stop adding new Supabase and Square dependencies

Actions:

- create architecture decision records
- define target domain boundaries
- define adapter interfaces for auth, payments, booking, notifications, AI, analytics, and crawling
- establish git, environments, CI, and infrastructure repositories

Exit criteria:

- no new direct provider SDK calls are merged into UI code

### Phase 1. Foundation

Goal:

- stand up AWS landing zone for the app

Actions:

- VPC, subnets, security groups, IAM boundaries
- ECS cluster, ALB, CloudFront, ECR
- Aurora PostgreSQL, Secrets Manager, KMS, S3
- Cognito user pool and app clients
- EventBridge, SQS, Step Functions
- CloudWatch, alarms, tracing, dashboards
- IaC with Terraform or AWS CDK
- GitHub Actions deployment pipeline

Exit criteria:

- empty app deploys end to end from git to AWS

### Phase 2. Data Model And API

Goal:

- own the domain model before moving traffic

Actions:

- create Aurora schema for users, profiles, roles, organizations, locations, providers, machines, memberships, products, bookings, schedules, orders, credits, referrals, learning, skin assessments, analytics, and intelligence
- model dynamic location onboarding, location feature flags, and location-specific catalog activation
- generate API contracts
- create migration tooling and seed strategy
- implement audit logging and idempotency keys

Exit criteria:

- the new API can represent every critical business flow without provider-specific schema leakage

### Phase 3. Identity Cutover

Goal:

- kill browser dependence on the current auth provider

Actions:

- wire app login to Cognito
- migrate user records and profile links
- move session handling to secure HTTP-only cookie patterns or token exchange flow
- implement backend authorization against app roles in Aurora

Exit criteria:

- all authenticated paths work without the current auth SDK

### Phase 4. Catalog, Cart, Orders

Goal:

- move commerce ownership inside Daysi

Actions:

- rebuild product and pricing services
- model machines and map allowed services per machine
- build membership plans, billing state, and monthly entitlements
- build coupon, promo, and referral rule evaluation
- support location-specific pricing and location-specific service activation
- move cart persistence behind the API
- implement order lifecycle, discounts, credits, membership application, and referral application internally
- treat education modules and courses as sellable or free products with admin-managed pricing
- support bundle-style education purchases where one education offer unlocks multiple modules
- add a payment adapter, but keep Daysi as system of record

Exit criteria:

- cart and order creation work with the new API and DB only

### Phase 5. Booking And Scheduling

Goal:

- remove Square as booking brain

Actions:

- model services, durations, staff, provider-owned schedule templates, machine capacity, blackout windows, maintenance windows, and booking policies
- build availability engine
- enforce location, provider, machine, and entitlement constraints during slot generation
- enforce location-specific service offerings based on machine inventory
- build booking create, reschedule, cancel, reminder, and no-show flows
- build admin schedule management for providers, machines, and location-level overrides
- build provider portal for self-managed schedule control
- model shared machine calendars across providers at each location
- add customer notifications

Exit criteria:

- website booking and admin schedule are fully internal

### Phase 6. Admin, Learning, Referrals, Analytics

Goal:

- complete operational parity

Actions:

- port admin dashboards to the new API
- rebuild learning modules, progress, certifications, and entitlements
- build admin tooling so education pricing and free-versus-paid access can be changed without code
- build education revenue reporting as a separate stream with its own P&L visibility
- rebuild referral logic, two-level referral capability, coupon engine, and credit ledger
- build provider compensation and payout reporting
- build multi-location reporting and operational dashboards
- build location feature controls so franchise modules can be enabled later without schema redesign
- implement first-party analytics ingestion and rollups

Exit criteria:

- admins no longer need the current backend platform for any daily workflow

### Phase 7. AI And Intelligence

Goal:

- replace gimmick AI with governed intelligence

Actions:

- move chat and assistants behind the internal AI gateway
- implement prompt registry, evaluations, guardrails, and provider routing policies
- add ingestion pipelines for competitor/news/regulatory content
- add ingestion for skin analyzer webhook data and normalized assessment features
- chunk, embed, index, and rank documents
- build market, pricing, treatment, and location performance insight services

Exit criteria:

- AI actions are auditable, grounded, and useful to revenue, SEO, and operations

### Phase 8. Brand And SEO Rebuild

Goal:

- launch `Daysi` cleanly

Actions:

- replace all public brand strings, schema, metadata, domains, social links, storage keys, and seeded defaults
- rebuild structured data and sitemap generation
- implement page templates for local SEO and service clusters

Exit criteria:

- no public Prairie Glow references remain

### Phase 9. Legacy Shutdown

Goal:

- safely remove the old world

Actions:

- switch traffic
- reconcile payments, bookings, and customers
- verify analytics continuity
- archive exports from the old platform
- remove old SDKs, old edge functions, old migrations, and old environment variables

Exit criteria:

- no production path depends on the old platform

## What I Would Absolutely Not Do

- do not big-bang migrate everything in one weekend
- do not rebuild payments from raw PCI primitives
- do not put business rules in frontend hooks again
- do not choose microservices because it sounds enterprise
- do not use scraped data without provenance, TTL, and trust scores
- do not make the AI system the place where truth lives
- do not let any provider become your source of truth again
- do not build scheduling without machine and provider resource constraints from day one
- do not bolt franchise support on later with ad hoc location flags
- do not let subscription entitlements live only in billing records
- do not ingest skin analyzer payloads without signature verification, raw archiving, and schema versioning

## Immediate Next Step

Start Phase 0 and Phase 1 now:

1. stand up the AWS foundation
2. create the domain contracts
3. replace direct provider usage with internal interfaces

Until those three are done, every feature request is just more migration debt.

## New Mandatory Domains Based On Business Direction

These are now explicitly in scope for the cutover:

- education and learning platform
- skin analyzer API and webhook ingestion
- multi-location operations for at least 5 locations over 24 months
- future locations may be unknown until sold, so onboarding must be data-driven
- franchise-ready permissions and reporting
- location-specific pricing, schedules, machine inventory, and service availability
- location-level feature flags for optional modules and plugins
- independent provider schedule autonomy
- provider sales commission and payout reporting
- admin-defined membership plans with bundled service entitlements
- two-level referral capability
- coupon and promotion engine
- machine-constrained service scheduling
- admin-editable machine, product, service, and schedule management
- shared machine scheduling across commissioned providers

## AWS Account And Cost-Control Call

Do not treat this as a tag-only "project" inside an existing account.

Best-in-class setup:

- create a dedicated `Daysi` workload boundary under your existing AWS organization
- use at least two AWS accounts from day one
  - `daysi-nonprod`
  - `daysi-prod`
- add a third `daysi-shared` account later if shared services justify it

Why:

- account boundaries are real security and billing boundaries
- AWS Organizations recommends using multiple accounts to organize workloads and separating production from development or test workloads
- budgets, anomaly detection, SCPs, and quotas are cleaner at the account boundary than inside a crowded shared account

Cost controls to enable immediately:

- AWS Budgets with action thresholds
- Cost Anomaly Detection
- AWS User Notifications for cost anomaly routing
- mandatory cost allocation tags
- service quotas review before launch

Recommended starter budget controls:

- monthly budget on `daysi-nonprod`
  automatic action at 80 percent and 100 percent
- monthly budget on `daysi-prod`
  alerts at 50 percent, 80 percent, and 100 percent
- anomaly monitors for linked account and critical cost allocation tags

Important reality:

- AWS Budgets actions can apply IAM policies or SCPs, and can target specific EC2 or RDS instances
- Budgets are useful guardrails, but not a full substitute for good architecture and least-privilege deployment controls

## Starter AWS Specs

These are the starter specs I would choose unless later constraints force a change.

- region
  `ca-central-1`
  Reason: closest sensible home region for Manitoba operations and cleaner Canadian data posture
- `web` ECS Fargate service
  1 task minimum in prod, 0.5 vCPU and 1 GB RAM to start
- `api` ECS Fargate service
  1 task minimum in prod, 1 vCPU and 2 GB RAM to start
- `workers` ECS Fargate service
  event-driven, 0 minimum idle if queue-driven pattern is used, 1 vCPU and 2 GB RAM baseline task size
- Aurora PostgreSQL Serverless v2
  start with 0.5 to 4 ACUs in nonprod
  start with 1 to 8 ACUs in prod
- S3 for assets, raw event archives, exports, and intelligence documents
- OpenSearch Serverless
  provision only when intelligence retrieval work begins, not before

Why this is sane:

- Fargate officially supports the CPU and memory combinations above
- Aurora Serverless v2 can scale by ACUs and supports low minimum ranges suitable for an early-stage workload
- this keeps the initial burn controlled while leaving room for booking, admin, and ingestion workloads

## Research Notes

Official sources reviewed for the decisions above:

- AWS Amplify support for Next.js
  https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- Amazon Bedrock Converse API
  https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html
- Amazon Bedrock Guardrails
  https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html
- Amazon Cognito user pools federation
  https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html
- Amazon OpenSearch Serverless vector search
  https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-vector-search.html
- Aurora PostgreSQL with pgvector for Bedrock knowledge bases
  https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.VectorDB.html
- AWS Glue Iceberg support
  https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format-iceberg.html
- Athena Iceberg support and limitations
  https://docs.aws.amazon.com/athena/latest/ug/querying-iceberg.html
- AWS Step Functions workflow types
  https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Secrets Manager overview and credential rotation guidance
  https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html
  https://docs.aws.amazon.com/secretsmanager/latest/userguide/hardcoded-db-creds.html
- CloudFront WebSocket support
  https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-working-with.websockets.html
- Firecrawl crawl and self-hosting docs
  https://docs.firecrawl.dev/features/crawl
  https://docs.firecrawl.dev/contributing/self-host
- AWS Payment Cryptography announcement
  https://aws.amazon.com/about-aws/whats-new/2023/06/aws-payment-cryptography/
- AWS Organizations multi-account best practices
  https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html
- AWS Well-Architected multi-account guidance
  https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_securely_operate_multi_accounts.html
- AWS Budgets actions
  https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html
- AWS Cost Anomaly Detection
  https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html
- AWS User Notifications with Cost Anomaly Detection
  https://docs.aws.amazon.com/cost-management/latest/userguide/cad-user-notifications.html
- AWS cost allocation tags
  https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/custom-tags.html
  https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- Amazon ECS Fargate task CPU and memory combinations
  https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Aurora Serverless v2 capacity configuration
  https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html
  https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-administration.html
