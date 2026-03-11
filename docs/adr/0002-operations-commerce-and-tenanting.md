# ADR 0002: Operations, Commerce, And Tenanting

## Status

Accepted

## Context

Daysi must support:

- future locations that are not known yet
- franchise-style location controls later
- location-specific pricing and service activation
- shared machine schedules across providers
- admin-defined memberships
- education as commerce

The platform cannot rely on hardcoded locations, fixed tiers, or UI-only entitlement logic.

## Decision

Daysi will use a single platform data model with location-scoped records and location-level feature flags.

Core rules:

- every operational record is scoped to `location_id`
- locations are onboarded dynamically from data, not code
- services can be activated per location
- pricing can vary per location
- machine inventory is location-specific
- machines are shared resources across commissioned providers
- memberships are admin-defined bundles, not fixed platform tiers
- non-members can still book standard services at retail pricing
- optional modules such as education, skin analysis, and future plugins are controlled by location feature flags

Education rules:

- every education offering is an `education_offer`
- an education offer can be free or paid
- education access comes only from entitlements
- coupons can discount education
- education memberships can unlock education
- staff can receive free access if admin grants it
- education revenue is reported separately

## Consequences

Positive:

- future franchise controls do not require schema surgery
- the booking engine can reason about real resource constraints
- commerce and entitlement logic stays consistent across services and education

Negative:

- availability logic becomes more complex
- admin tooling has to be more serious from the start
- reporting must classify revenue streams correctly

## Rejected Alternatives

### Hardcoded membership tiers

Rejected because admin needs to compose bundled value dynamically.

### Separate code paths per location

Rejected because it would rot into unmaintainable branching logic.

### Treat education as a special-case content module

Rejected because education is a revenue-bearing entitlement product.
