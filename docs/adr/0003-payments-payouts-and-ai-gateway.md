# ADR 0003: Payments, Provider Payouts, And The AI Gateway

## Status

Accepted

## Context

Daysi needs:

- live card payments now
- provider compensation as a percentage of sales
- future flexibility for more complex payout logic
- safe use of multiple paid AI and data providers without locking business logic to any one vendor

## Decision

### Payments

Daysi will use Stripe for live card payments now.

Daysi remains the system of record for:

- orders
- order items
- discounts
- memberships
- credits
- referrals
- booking consequences

Stripe is the payment rail, not the business truth layer.

Stripe Billing and Stripe Entitlements can be used as billing-side signals for subscription state changes, but Daysi remains the source of truth for operational entitlements.

### Provider payouts

Provider compensation will be modeled as an internal commission engine and payout ledger.

Initial behavior:

- percentage-based compensation
- shared machine scheduling does not change payout ownership
- education revenue is excluded from provider commission by default

Future-proofing:

- support a global default percentage
- allow per-provider and per-service overrides later without schema redesign

Stripe Connect is explicitly not required on day one unless Daysi later needs direct settlement to separate businesses as part of franchise operations.

If franchise or marketplace-style direct settlements become necessary later, revisit Stripe Connect with separate charges and transfers or another suitable Connect flow.

### AI gateway

Daysi will use an internal AI gateway hosted on AWS.

The gateway routes by task, not by vendor name.

Initial provider set:

- OpenAI
- xAI
- Perplexity
- Moonshot Kimi
- DataForSEO

## Consequences

Positive:

- payment and payout logic stays portable
- vendor failover becomes possible
- AI costs and retention can be governed centrally

Negative:

- more internal plumbing is required
- payout reconciliation must be designed carefully
- provider routing policies must be maintained

## Rejected Alternatives

### Let Stripe or another provider own business rules

Rejected because that recreates the Square problem with a different logo.

### Route model calls directly from app code

Rejected because it destroys governance, cost control, and portability.
