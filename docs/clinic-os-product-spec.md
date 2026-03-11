# Clinic OS Product Spec

## Executive Decision

Build the platform as a licensable, multi-tenant clinic operating system from day one.

Use `Daysi` as tenant one, not as a one-off app that later gets awkwardly converted into SaaS.

Working structure:

- parent product company or internal studio name: `Tasty Cheddar`
- platform product: a multi-tenant clinic OS
- first production tenant: `Daysi`

This is the right move because the market is validated, the problem is operationally complex enough to support real SaaS pricing, and the current product ideas already map better to a platform than to a single hardcoded app.

This spec is not aspirational fluff.

Delivery tracking for every capability in this document lives in `docs/clinic-os-delivery-matrix.md`.

## Product Thesis

The platform should not position as generic spa software.

It should position as an operating system for laser, skin, and device-heavy aesthetic clinics that need:

- machine-aware booking
- multi-location control
- independent provider scheduling and commission payouts
- memberships plus standard retail booking
- education commerce
- AI-assisted growth and operational intelligence
- franchise-ready controls without tenant-specific code forks

## Target Customer Profile

Primary customers:

- single-location premium laser or skin clinics that have already outgrown cheap scheduling software
- 2 to 20 location operators who need centralized reporting with local flexibility
- future franchise groups that need permission boundaries, feature controls, and rollout discipline

Poor-fit customers:

- generic salons looking for the cheapest scheduler
- clinics that only need online booking and basic POS
- businesses that expect heavy one-off customization in exchange for low subscription pricing

## Non-Negotiable Product Rules

- build multi-tenant aware from day one
- keep `Daysi` as the first real-world tenant
- validate with 2 to 3 external design partners before broad selling
- productize onboarding, imports, permissions, reporting, billing, and support before calling it SaaS
- preserve standard retail pricing for services so non-members can still book
- treat memberships as optional pricing and entitlement logic, not the default booking gate
- keep all business rules in the platform, not in Stripe, not in external schedulers, and not in frontend conditionals
- do not allow tenant-specific forks in schema, code, or deployment unless a future premium isolation tier justifies it

## Core Product Surface

### 1. Tenant And Organization Management

- brand
- organization
- location
- location feature flags
- staff and provider access scopes
- corporate versus franchise-ready access boundaries

### 2. Catalog And Pricing

- services
- service variants
- products
- packages
- location-specific activation
- location-specific pricing
- machine and room requirements
- retail pricing plus member pricing or included usage

### 3. Booking And Resource Scheduling

- online booking
- admin booking
- provider self-managed schedules
- machine-aware availability
- shared machine calendars across providers
- room scheduling where needed
- cancellation, deposit, buffer, and no-show rules
- waitlist and rebooking readiness

### 4. Commerce

- cart and checkout
- Stripe payment rail
- refunds
- credit ledger
- coupons
- promotions
- packages
- service credits
- tax-ready order ledger

### 5. Memberships And Subscriptions

- admin-defined plans
- location-aware pricing
- included monthly services
- member discounts
- credits or service allowances
- renewal and cycle tracking
- membership-aware checkout and booking application

### 6. Referrals

- referral codes
- reward rules
- optional 2-level referral logic
- credit or discount rewards
- fraud and abuse controls later

### 7. Provider Compensation

- commission percentage plans
- future per-provider and per-service override support
- payout periods
- payout ledger and reconciliation
- provider reporting

### 8. Education Commerce

- education offers as products
- free or paid education
- admin-controlled pricing
- education memberships
- staff grants
- enrollment, progress, and certificates
- separate education revenue reporting

### 9. Customer Intelligence

- skin analyzer webhook ingestion later
- raw event archival
- normalized assessment records
- image and asset handling
- customer notes and segmentation
- readiness for consultation and recommendation workflows

### 10. AI And Market Intelligence

- internal AI gateway
- model routing across approved providers
- SEO intelligence
- competitor monitoring
- pricing intelligence
- booking and conversion assistance
- retention and upsell recommendations
- source provenance and evals

### 11. Reporting And Admin

- revenue by stream
- location, provider, machine, and service performance
- membership performance
- education revenue
- referral performance
- utilization and conversion reporting
- audit visibility for operational changes

## Commodity Parity Vs True Differentiation

### Commodity Parity We Must Have Before External Sales

If we do not have these, we are not a serious clinic SaaS product no matter how clever the AI sounds:

- stable online booking
- admin booking and schedule management
- Stripe billing and refund correctness
- memberships and retail pricing working together cleanly
- coupons and promotions
- provider schedules and payout reporting
- location-based permissions
- import tooling for customers, services, memberships, bookings, and balances
- support tooling and tenant admin controls
- reliable reporting
- audit logs for important changes

### Likely Required Before Broad Enterprise Positioning

These are the areas incumbents already lean on heavily. If we skip them for too long, enterprise claims become bullshit:

- intake forms
- consent capture
- before and after media management
- treatment notes or charting equivalent
- document retention policies
- stronger compliance and privacy posture

### True Differentiators

These are the features that can actually move the product out of commodity territory:

- shared machine-aware scheduling across commissioned providers
- location feature flags for franchise-style rollout
- integrated education commerce as a native revenue stream
- future skin analyzer ingestion as first-party clinic intelligence
- AI growth engine that combines first-party events with SEO, competitor, and pricing data
- multi-location performance intelligence that ties utilization, conversion, pricing, and retention together

## SaaS Architecture Spec

### Tenancy Model

Default model:

- pooled application tier
- pooled database with strict tenant and location scoping
- pooled worker tier
- shared platform services

Isolation controls:

- every business record must carry tenant and location scope as applicable
- authorization must include tenant context and scoped permissions
- logs, metrics, jobs, and exports must preserve tenant attribution
- premium bridge or silo isolation can be added later for enterprise customers without redesigning the product model

What we avoid:

- one code branch per tenant
- one schema per tenant as the default model
- manual onboarding steps that do not scale

### Runtime Shape

- `apps/web`
  Next.js for public site, booking flows, customer portal, provider portal, and admin
- `apps/api`
  TypeScript API service with strict contracts and tenant-aware policies
- `apps/workers`
  ingestion, rollups, AI jobs, notifications, exports, and scheduled maintenance
- `packages/domain`
  core business rules
- `packages/contracts`
  API and event schemas

### Infrastructure Baseline

- AWS Organization workload boundary for `daysi-nonprod` and `daysi-prod`
- ECS Fargate for app runtimes
- Aurora PostgreSQL Serverless v2 for the transactional system of record
- S3 for assets, raw inbound payloads, export bundles, and lake storage
- EventBridge, SQS, and Step Functions for orchestration
- CloudFront in front of web delivery
- Cognito for authentication only
- OpenSearch Serverless for semantic retrieval if intelligence search proves valuable enough

### Billing And Payouts

- Stripe handles card rails and recurring billing
- Daysi platform owns orders, prices, entitlements, credits, refunds, and operational consequences
- provider compensation is computed internally
- Stripe Connect is deferred unless direct settlement to separate businesses becomes necessary

## Tenant Packaging Spec

Do not price this like a cheap scheduler.

Recommended packaging shape:

- platform implementation fee
- monthly platform subscription
- per-location pricing
- premium add-ons for intelligence, franchise controls, and advanced education workflows
- optional migration and onboarding services

What not to do:

- race low-end schedulers on price
- promise unlimited custom work inside the base subscription
- sell broad enterprise plans before onboarding and support are productized

## Design Partner Program Spec

### Tenant One

- `Daysi` is the first production tenant and reference account

### Tenant Two And Three

- recruit 2 to 3 external design partners that fit the target profile
- require operational seriousness, not hobby operators
- use them to pressure-test onboarding, imports, permissions, reporting, and billing

### Exit Criteria Before Broad Sale

- Daysi successfully runs core booking, checkout, memberships, provider payouts, and reporting
- at least 2 external tenants onboard without code forks
- onboarding is repeatable
- support playbooks exist
- reporting is trusted
- operational incidents have clear runbooks

## Commercial Launch Gates

Do not broadly sell the platform until these are true:

- multi-tenant boundaries are proven
- imports are real product features
- permissioning works across brand, organization, and location scopes
- non-member retail booking and membership booking both work cleanly
- provider commission and payout reporting reconcile cleanly
- location-specific pricing and machine-aware availability work in production
- admin can enable or disable modules per location without engineering work
- billing and entitlement disagreements are traceable

## Risks And Hole-Poking

### If We Move Too Fast

- we will end up selling services disguised as SaaS
- every new clinic will become a special-case fork
- onboarding pain will erase margin

### If We Overbuild Too Early

- we will drown in settings pages no one uses
- we will burn time on enterprise theater before Daysi proves the workflows

### If We Skip Clinical Baselines

- incumbents will still look safer for real operators
- our positioning will sound stronger than our actual operational depth

### If We Let Vendors Own Core Logic

- Stripe will start acting like the membership brain
- AI vendors will start acting like the recommendation brain
- we will lose the moat we are supposedly building

## Recommended Build Sequence

1. Build the multi-tenant foundation and shared domain model.
2. Launch `Daysi` on the platform as tenant one.
3. Productize onboarding, imports, permissions, reporting, support, and billing operations.
4. Add clinical parity features required for serious external sales.
5. Onboard 2 to 3 design partners.
6. Only then package and sell more broadly.

## Bottom Line

This is a legitimate product opportunity if we build it as a platform company.

It is not a legitimate opportunity if we build a one-off app, bolt on tenant IDs later, and pretend that counts as SaaS.

The correct move is to build the clinic operating system once, run `Daysi` on it first, harden it with design partners, and commercialize only after the boring operational machinery is real.

## Research Anchors

- AWS Well-Architected SaaS Lens: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html
- AWS SaaS tenant isolation strategies: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html
- AWS multi-account guidance: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html
- Stripe Billing Entitlements: https://docs.stripe.com/billing/entitlements
- Stripe Connect separate charges and transfers: https://docs.stripe.com/connect/separate-charges-and-transfers
- Stripe subscriptions overview: https://docs.stripe.com/billing/subscriptions/overview
- Zenoti pricing and enterprise positioning: https://www.zenoti.com/pricing-zenoti
- Boulevard medspa and franchise positioning: https://www.joinblvd.com/medspas
- Pabau enterprise positioning: https://pabau.com/for/enterprise/
- Aesthetic Record pricing: https://www.aestheticrecord.com/pricing/
