# Execution Domain Modules

## Purpose

This is the implementation-facing module map for the clinic OS.

It translates the product and domain blueprints into actual bounded modules we can code against.

## Module Rules

- each module owns its own invariants and persistence model
- cross-module orchestration happens in application services, not by reaching into another module's tables ad hoc
- module code belongs in `packages/domain`
- API-specific DTOs and event contracts belong in `packages/contracts`

## Module Map

### `tenanting`

Owns:

- brand
- organization
- location
- location feature flags
- tenant bootstrap defaults

Public responsibilities:

- create and manage tenant hierarchy
- resolve location and organization scope
- answer whether a module is enabled for a location

### `identity`

Owns:

- user
- profile
- authentication linkage records

Public responsibilities:

- map Cognito identities to app users
- manage profile data
- manage customer versus staff identity shape

### `access-control`

Owns:

- roles
- permissions
- scoped assignments

Public responsibilities:

- answer what an actor may do at brand, organization, and location level
- enforce provider, staff, and admin scopes

### `providers`

Owns:

- provider records
- provider location assignments
- provider compensation plan linkage

Public responsibilities:

- model independent providers versus employee providers
- expose provider availability and compensation context

### `resources`

Owns:

- machines
- machine capabilities
- rooms
- location machine inventory
- maintenance and blackout state

Public responsibilities:

- answer which physical resources can satisfy a service
- enforce shared machine capacity across providers

### `scheduling`

Owns:

- location schedules
- provider schedule templates
- provider schedule exceptions
- machine schedules
- room schedules
- booking policy inputs

Public responsibilities:

- resolve open hours, blackout windows, and schedulable operating windows

### `catalog`

Owns:

- service categories
- services
- service variants
- products
- education offers

Public responsibilities:

- manage what can be sold or booked
- expose treatment and education offers

### `pricing`

Owns:

- location-specific prices
- member price rules
- package pricing
- promotion eligibility inputs

Public responsibilities:

- compute candidate price context before discounts, credits, or entitlements are applied

### `promotions`

Owns:

- coupons
- promotion rules
- discount applicability

Public responsibilities:

- validate and apply coupon and promotion logic

### `memberships`

Owns:

- membership plans
- membership prices
- entitlements
- subscriptions
- cycles
- usage tracking

Public responsibilities:

- decide what a member is entitled to
- track included usage and member discounts
- preserve non-member retail access for standard services

### `commerce`

Owns:

- carts
- orders
- order items
- refunds
- credit ledger

Public responsibilities:

- construct orders
- apply credits, discounts, and referral rewards
- maintain order and refund state

### `payments`

Owns:

- payment intents and payment records
- Stripe interaction boundary
- payment reconciliation state

Public responsibilities:

- translate internal order intent into Stripe payment actions
- consume Stripe webhooks
- never become the source of truth for entitlements or bookings

### `availability`

Owns:

- slot generation logic
- resource matching logic

Public responsibilities:

- compute bookable slots from location, provider, machine, room, and policy inputs

### `bookings`

Owns:

- bookings
- booking lines
- resource assignments
- status history
- booking notes
- booking applications for membership or coupon usage

Public responsibilities:

- create, reschedule, cancel, and reconcile bookings
- enforce availability decisions at commit time

### `referrals`

Owns:

- referral programs
- referral codes
- referral relationships
- reward rules
- reward events and redemption

Public responsibilities:

- evaluate referral eligibility
- grant discounts or credits

### `provider-comp`

Owns:

- commission plans
- payout periods
- payout ledger entries
- reconciliation views

Public responsibilities:

- calculate provider payout obligations
- separate provider-compensated revenue from house-only revenue such as education

### `education`

Owns:

- education offers
- enrollment
- lesson and module progress
- certificates
- staff education grants

Public responsibilities:

- manage paid and free education commerce linkage
- enforce learning entitlements
- report education revenue separately

### `customer-intelligence`

Owns:

- customer notes
- customer tags and segments
- future skin assessment source, event, asset, and normalized records

Public responsibilities:

- maintain first-party consultation and assessment context

### `analytics`

Owns:

- event ingestion
- reporting rollup definitions
- cross-domain KPI projections

Public responsibilities:

- produce operational and growth reporting
- preserve revenue-by-stream truth

### `ai-gateway`

Owns:

- model routing rules
- prompt and tool policies
- provider-specific adapters
- provenance and evaluation records

Public responsibilities:

- route approved AI tasks across OpenAI, Perplexity, xAI, Kimi, and later Bedrock if needed
- return structured outputs to product workflows

### `notifications`

Owns:

- outbound message intents
- email and SMS provider boundaries
- reminder and follow-up dispatch state

Public responsibilities:

- send booking, payment, membership, and education lifecycle messages

### `imports`

Owns:

- import jobs
- import row state
- reconciliation outcomes

Public responsibilities:

- ingest legacy customers, services, memberships, balances, bookings, and catalog records safely

## Recommended Package Shape

```text
packages/domain/
|-- tenanting/
|-- identity/
|-- access-control/
|-- providers/
|-- resources/
|-- scheduling/
|-- catalog/
|-- pricing/
|-- promotions/
|-- memberships/
|-- commerce/
|-- payments/
|-- availability/
|-- bookings/
|-- referrals/
|-- provider-comp/
|-- education/
|-- customer-intelligence/
|-- analytics/
|-- ai-gateway/
|-- notifications/
`-- imports/
```

## Immediate Build Priority

Build these first:

1. `tenanting`
2. `identity`
3. `access-control`
4. `resources`
5. `scheduling`
6. `catalog`
7. `pricing`
8. `memberships`
9. `commerce`
10. `payments`
11. `availability`
12. `bookings`
13. `provider-comp`
14. `education`

Reason:

- these modules are enough to run `Daysi` core operations without pretending the AI moat matters before the business engine works
