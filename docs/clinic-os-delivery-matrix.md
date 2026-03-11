# Clinic OS Delivery Matrix

## Purpose

This document makes `clinic-os-product-spec.md` binding scope.

Rule:

- every capability named in `clinic-os-product-spec.md` is in planned build scope
- not every capability ships on the same day
- anything not in the first production release must still be tracked here with an explicit later phase, not silently dropped

## Phase Definitions

- `Phase 0`
  foundation, contracts, tenancy, infrastructure, and migration prep
- `Phase 1`
  `Daysi` production core needed to run the business safely
- `Phase 2`
  external design-partner readiness
- `Phase 3`
  broader commercial SaaS readiness
- `Phase 4`
  advanced differentiation and premium expansion

## Delivery Rules

- `Daysi` launch cannot skip core operational correctness just to ship AI faster
- external sales cannot start until all `Phase 2` items are production-ready
- broad enterprise positioning cannot happen until all `Phase 3` items are production-ready
- `Phase 4` items are still committed scope, but they are not blockers for tenant one launch

## Scope Matrix

### Tenant And Organization Management

- brand: `Phase 1`
- organization: `Phase 1`
- location: `Phase 1`
- location feature flags: `Phase 2`
- staff and provider access scopes: `Phase 1`
- corporate versus franchise-ready access boundaries: `Phase 2`

### Catalog And Pricing

- services: `Phase 1`
- service variants: `Phase 1`
- products: `Phase 1`
- packages: `Phase 2`
- location-specific activation: `Phase 1`
- location-specific pricing: `Phase 1`
- machine and room requirements: `Phase 1`
- retail pricing plus member pricing or included usage: `Phase 1`

### Booking And Resource Scheduling

- online booking: `Phase 1`
- admin booking: `Phase 1`
- provider self-managed schedules: `Phase 1`
- machine-aware availability: `Phase 1`
- shared machine calendars across providers: `Phase 1`
- room scheduling where needed: `Phase 2`
- cancellation, deposit, buffer, and no-show rules: `Phase 1`
- waitlist and rebooking readiness: `Phase 2`

### Commerce

- cart and checkout: `Phase 1`
- Stripe payment rail: `Phase 1`
- refunds: `Phase 1`
- credit ledger: `Phase 1`
- coupons: `Phase 1`
- promotions: `Phase 1`
- packages: `Phase 2`
- service credits: `Phase 1`
- tax-ready order ledger: `Phase 1`

### Memberships And Subscriptions

- admin-defined plans: `Phase 1`
- location-aware pricing: `Phase 1`
- included monthly services: `Phase 1`
- member discounts: `Phase 1`
- credits or service allowances: `Phase 1`
- renewal and cycle tracking: `Phase 1`
- membership-aware checkout and booking application: `Phase 1`

### Referrals

- referral codes: `Phase 2`
- reward rules: `Phase 2`
- optional 2-level referral logic: `Phase 2`
- credit or discount rewards: `Phase 2`
- fraud and abuse controls later: `Phase 4`

### Provider Compensation

- commission percentage plans: `Phase 1`
- future per-provider and per-service override support: `Phase 2`
- payout periods: `Phase 1`
- payout ledger and reconciliation: `Phase 1`
- provider reporting: `Phase 1`

### Education Commerce

- education offers as products: `Phase 1`
- free or paid education: `Phase 1`
- admin-controlled pricing: `Phase 1`
- education memberships: `Phase 2`
- staff grants: `Phase 1`
- enrollment, progress, and certificates: `Phase 2`
- separate education revenue reporting: `Phase 1`

### Customer Intelligence

- skin analyzer webhook ingestion later: `Phase 4`
- raw event archival: `Phase 2`
- normalized assessment records: `Phase 4`
- image and asset handling: `Phase 4`
- customer notes and segmentation: `Phase 2`
- readiness for consultation and recommendation workflows: `Phase 4`

### AI And Market Intelligence

- internal AI gateway: `Phase 2`
- model routing across approved providers: `Phase 2`
- SEO intelligence: `Phase 4`
- competitor monitoring: `Phase 4`
- pricing intelligence: `Phase 4`
- booking and conversion assistance: `Phase 2`
- retention and upsell recommendations: `Phase 4`
- source provenance and evals: `Phase 2`

### Reporting And Admin

- revenue by stream: `Phase 1`
- location, provider, machine, and service performance: `Phase 2`
- membership performance: `Phase 2`
- education revenue: `Phase 1`
- referral performance: `Phase 2`
- utilization and conversion reporting: `Phase 2`
- audit visibility for operational changes: `Phase 2`

## Commodity Parity Gates

These must be complete before onboarding external design partners:

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

Implementation note:

- some items above depend on import tooling, support tooling, and audit tooling that are not first-day `Daysi` launch blockers but are absolute `Phase 2` blockers

## Enterprise Credibility Gates

These must be planned as real follow-on scope, not hand-waved away:

- intake forms: `Phase 3`
- consent capture: `Phase 3`
- before and after media management: `Phase 3`
- treatment notes or charting equivalent: `Phase 3`
- document retention policies: `Phase 3`
- stronger compliance and privacy posture: `Phase 3`

## Differentiator Investment

These are where the product can actually beat generic scheduling software:

- shared machine-aware scheduling across commissioned providers: `Phase 1`
- location feature flags for franchise-style rollout: `Phase 2`
- integrated education commerce as a native revenue stream: `Phase 1` then expanded in `Phase 2`
- future skin analyzer ingestion as first-party clinic intelligence: `Phase 4`
- AI growth engine that combines first-party events with SEO, competitor, and pricing data: foundations in `Phase 2`, full realization in `Phase 4`
- multi-location performance intelligence tying utilization, conversion, pricing, and retention together: `Phase 4`

## Launch Truth

What ships for `Daysi` first:

- multi-tenant-safe core architecture
- location-aware catalog and pricing
- online and admin booking
- provider schedules and shared machine availability
- Stripe checkout, orders, refunds, credits, and memberships
- provider commission and payout reporting
- education offers as products
- core revenue reporting by stream

What ships before external tenants:

- onboarding flows and import tooling
- tenant admin controls
- auditability
- better reporting
- design-partner-safe permissioning
- AI gateway foundations
- referral program

What ships before broad commercial push:

- stronger clinical parity areas
- support playbooks and incident runbooks
- compliance and retention maturity

## Change Control Rule

If a capability from `clinic-os-product-spec.md` changes, one of these must happen:

- move it to a different phase here with an explicit reason
- split it into smaller deliverables here
- remove it only by explicit decision in a new ADR or spec revision

Anything else is scope drift.
