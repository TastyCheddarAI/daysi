# Daysi Day 0 Inputs

These are the things I need from you to start implementation cleanly.

## Needed From You

### 1. Git Destination

- where this project should live
  GitHub, GitLab, or other
- repo name
- whether you want one repo or a mono-repo from day one

### 2. AWS Foundation

- AWS account or account ID we are targeting
- preferred region
- whether dev, staging, and prod should all exist from day one
- whether Route 53, SES, Cognito, ECS, Aurora, OpenSearch, S3, EventBridge, SQS, and Step Functions are approved

### 3. Domain And Brand

- final `Daysi` domain
- whether existing domains should redirect
- logo files, colors, and any non-placeholder brand rules
- legal business name, support email, phone, and mailing address

### 4. Data Access

- Supabase project access or exports
- Square exports for customers, orders, gift cards, bookings, services, and catalog
- skin analyzer app webhook payload examples and schema
- skin analyzer image handling requirements
- any other external source exports you care about preserving

### 5. Payments Decision

- whether live card payments remain required
- whether you want ACH, card, gift card, subscriptions, financing, or invoicing
- whether you already have a replacement PSP in mind

### 6. Notifications

- do you want email only, SMS only, or both
- preferred provider if you already have one

### 7. AI Access

- confirm which of these we should wire first
  OpenAI, Grok, Kimi, Perplexity, DataForSEO
- any rate or budget constraints you want enforced
- any jobs that must never send sensitive customer data to third-party AI APIs

### 8. Business Rules

- booking rules
  duration, buffers, cancellation windows, deposits, no-show rules, staff assignment rules, machine constraints, room constraints
- pricing rules
  packages, credits, promos, referrals, bundles, coupons
- learning rules
  access windows, certification, progress requirements
- education commerce rules
  which education products are free, which are paid, whether pricing can vary, whether memberships can unlock them
- membership rules
  tiers, included services, monthly resets, rollover or no rollover, exclusions, and which services remain bookable at standard retail pricing without membership
- provider rules
  commission percentages, payout timing, self-managed schedule permissions, admin override permissions
- location rules
  planned first 5 locations, which are corporate versus franchise-style, whether pricing can vary by location
- feature flag rules
  which modules can be enabled or disabled per location and whether this is admin-managed or internal-only at first

### 9. Operating Model

- how independent providers should be paid
  percent of sales, flat split, per service, mixed model
- whether machines are shared across providers or assigned
- whether some services require specific machines only
- whether memberships and coupons can be location-specific
- whether education is client-facing only, provider-facing only, or both
- whether education products can be discounted with coupons or only purchased at list price
- whether franchise locations should eventually self-manage feature modules such as education and skin analyzer

## Do Not Send In Chat

Do not paste production secrets into chat.

Preferred handling:

- store secrets locally in a secure file for now
- or add them later to AWS Secrets Manager
- if needed, I can give you the exact secret names and env contract next

## Fastest Path

If you want speed, send me these first:

1. preferred AWS region
2. final `Daysi` domain
3. repo destination
4. whether card payments stay
5. whether we can assume dev and prod environments

## Confirmed Decisions So Far

- primary domain is `daysi.ca`
- starter AWS region is `ca-central-1`
- live card payments will use Stripe
- git repo will be created when needed
- skin analyzer webhook will be designed later and is not a current blocker
- education remains in scope as a core platform domain
- all education offerings are treated as products that can be free or paid
- admin can change education pricing and free-versus-paid access
- any product, including education, can be discounted
- memberships can unlock education, but only through education-specific membership entitlements
- staff can receive free education access when admin grants it
- education access is entitlement-based, not page-visibility-based
- education revenue is a separate revenue stream and must be reported separately
- provider schedule self-management is required
- machine-constrained scheduling is required
- multi-location growth and franchise-style operations are in scope
- future locations may be unknown until sold and must be onboarded dynamically
- pricing and service offerings can vary by location
- each location has its own schedule
- optional modules and plugins must be supportable through location-level feature controls
- memberships should stay admin-defined rather than fixed to hardcoded tiers
