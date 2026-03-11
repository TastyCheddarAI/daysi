# Daysi Replatform Brief

## Audit Summary

- the frontend is tightly coupled to the current managed backend from the browser
- account, cart, orders, analytics, learning, referrals, admin, and AI flows depend on that backend
- bookings, payments, catalog sync, gift cards, customer sync, and revenue reporting depend on a third-party commerce stack
- brand identity is still hardcoded across metadata, copy, storage keys, and structured data
- there is no test suite in the repository and no active git metadata in the working directory

## Current Blast Radius

- 40 plus client auth touchpoints
- 20 plus invoked server functions
- 20 plus database tables in the generated client types
- 18 edge/serverless function entrypoints
- 40 plus database migrations

## Target AWS Architecture

- frontend
  CloudFront plus S3 for immediate continuity, with a planned move to server-rendered React for stronger SEO and content velocity
- identity
  Cognito or a dedicated JWT-based auth service behind an application API
- application API
  API Gateway plus Lambda for low-ops workflows, or ECS Fargate if long-lived services and scraping pipelines grow quickly
- primary data
  Aurora PostgreSQL for transactional domains such as users, bookings, orders, products, learning, referrals, and analytics rollups
- search and eventing
  OpenSearch for search and insight retrieval, EventBridge plus SQS plus Step Functions for asynchronous workflows
- files and media
  S3 with signed URLs and lifecycle policies
- observability
  CloudWatch, X-Ray, structured application logs, and explicit audit trails
- infrastructure
  Terraform or AWS CDK, plus git-driven CI and deployment

## AI and Data Moat Direction

- collect first-party interaction events from chat, booking, checkout, retention, referral, and learning flows
- collect first-party skin analyzer assessments and webhook events as structured intake intelligence
- add scheduled market and competitor ingestion through a controlled scraping pipeline
- normalize all captured signals into a governed internal knowledge store
- separate operational AI from intelligence pipelines so customer-facing latency stays predictable
- build ranking, pricing, and conversion models from internal data products, not prompt-only heuristics

## Mandatory Business Scope

- education and learning platform remains in scope
- skin analyzer API and webhook ingestion is in scope
- multi-location operations must support at least 5 locations in the next 24 months
- franchise-style permissions and reporting must be supported
- future locations may be unknown until sold, so location onboarding must be data-driven
- independent providers must be able to manage their own schedules
- admin-defined memberships must control bundled monthly service access
- regular retail pricing must exist alongside memberships, and customers must be able to book services without being members
- referral logic must support discounts, credits, and optional two-level rewards
- coupons and promotions are first-class commerce features
- services must be constrained by machine availability and admin-managed machine schedules
- education offerings must be modeled as admin-managed products that can be free or paid
- education offers can be discounted, unlocked by education memberships, granted free by admin for staff, and reported as a separate revenue stream
- pricing, schedules, service availability, and optional features must all be controllable per location

## Execution Order

1. Freeze new feature work on legacy integrations and create explicit replacement interfaces.
2. Stand up AWS identity, API, database, secrets, and infrastructure as code.
3. Migrate auth and user profiles first so the browser stops depending on the current managed backend for session state.
4. Replace product, cart, checkout, bookings, and order creation flows with internal APIs.
5. Replace admin reporting, referrals, learning, newsletters, and analytics ingestion.
6. Migrate AI runtimes and add ingestion pipelines for first-party intelligence and external market monitoring.
7. Rebrand every remaining public and internal brand reference to `Daysi`.
8. Remove the legacy backend client, migrations, and serverless directory only after parity verification.

## Detailed Plan

See `docs/daysi-cutover-master-plan.md` for the full architecture recommendation, rejected options, and phase-by-phase cutover design.

## Non-Negotiables

- no direct database access from the browser after migration
- no provider-specific business logic inside UI components
- no secrets or privileged workflows exposed to client code
- no cutover of payments or bookings without reconciliation and rollback plans
- no rebrand release until metadata, structured data, emails, assets, and legal pages are aligned
