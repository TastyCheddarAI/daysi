# Execution API Contract Backlog

## Purpose

This is the contract backlog for the internal API and async event surface.

It defines what we need to expose to `apps/web`, workers, admin tooling, and external webhooks.

## Contract Rules

- external-facing and internal UI contracts belong in `packages/contracts`
- request and response shapes must be versioned
- all write operations that can double-charge or double-book require idempotency support
- webhooks must validate signatures and persist raw payloads before processing
- async events are part of the contract surface, not an afterthought

## Contract Families

- public customer API
- authenticated customer API
- provider API
- admin API
- system webhook API
- async domain events

## Phase 0 Foundations

### Platform

- `GET /v1/health`
- `GET /v1/platform/config`
- `GET /v1/tenants/:tenantSlug/locations`

### Auth

- `POST /v1/auth/session/exchange`
- `POST /v1/auth/session/logout`
- `GET /v1/auth/me`

### Async Events

- `tenant.created`
- `location.created`
- `user.provisioned`

## Phase 1 Daysi Core Contracts

### Public Catalog

- `GET /v1/public/locations/:locationSlug/catalog/services`
- `GET /v1/public/locations/:locationSlug/catalog/services/:serviceSlug`
- `GET /v1/public/locations/:locationSlug/catalog/products`
- `GET /v1/public/locations/:locationSlug/catalog/education-offers`

### Availability And Booking

- `POST /v1/public/availability/search`
- `POST /v1/public/bookings`
- `POST /v1/bookings/:bookingId/reschedule`
- `POST /v1/bookings/:bookingId/cancel`
- `GET /v1/bookings/:bookingId`

### Commerce

- `POST /v1/cart`
- `POST /v1/cart/items`
- `POST /v1/cart/coupons`
- `POST /v1/checkout/quote`
- `POST /v1/checkout/confirm`
- `GET /v1/orders/:orderId`
- `POST /v1/orders/:orderId/refund`

### Memberships

- `GET /v1/memberships/plans`
- `POST /v1/memberships/subscriptions`
- `GET /v1/memberships/subscriptions/:subscriptionId`
- `GET /v1/me/memberships`

### Customer Account

- `GET /v1/me/profile`
- `PATCH /v1/me/profile`
- `GET /v1/me/bookings`
- `GET /v1/me/orders`
- `GET /v1/me/credits`

### Provider

- `GET /v1/provider/me/schedule`
- `PUT /v1/provider/me/schedule/template`
- `POST /v1/provider/me/schedule/exceptions`
- `GET /v1/provider/me/bookings`
- `GET /v1/provider/me/payouts`

### Admin Core

- `GET /v1/admin/locations`
- `POST /v1/admin/locations`
- `PATCH /v1/admin/locations/:locationId`
- `GET /v1/admin/providers`
- `POST /v1/admin/providers`
- `GET /v1/admin/machines`
- `POST /v1/admin/machines`
- `PATCH /v1/admin/machines/:machineId`
- `PUT /v1/admin/machines/:machineId/schedule`
- `GET /v1/admin/services`
- `POST /v1/admin/services`
- `PATCH /v1/admin/service-location-offers/:offerId`
- `GET /v1/admin/memberships/plans`
- `POST /v1/admin/memberships/plans`
- `PATCH /v1/admin/memberships/plans/:planId`
- `GET /v1/admin/orders`
- `GET /v1/admin/bookings`
- `GET /v1/admin/reports/revenue-summary`

### Education Core

- `GET /v1/public/education/offers`
- `GET /v1/admin/education/offers`
- `POST /v1/admin/education/offers`
- `PATCH /v1/admin/education/offers/:offerId`

### Payments Webhooks

- `POST /v1/webhooks/stripe`

### Async Events

- `order.created`
- `payment.succeeded`
- `payment.failed`
- `membership.subscription_activated`
- `membership.cycle_started`
- `booking.created`
- `booking.rescheduled`
- `booking.cancelled`
- `provider.payout_period_closed`
- `education.offer_purchased`

## Phase 2 Design-Partner Readiness Contracts

### Referrals

- `GET /v1/me/referral`
- `POST /v1/referrals/apply`
- `GET /v1/admin/referrals/programs`
- `POST /v1/admin/referrals/programs`

### Tenant Controls

- `GET /v1/admin/location-feature-flags`
- `PATCH /v1/admin/location-feature-flags/:flagId`
- `GET /v1/admin/roles`
- `POST /v1/admin/role-assignments`

### Imports

- `POST /v1/admin/imports`
- `GET /v1/admin/imports/:importJobId`
- `POST /v1/admin/imports/:importJobId/retry`

### Education Progress

- `POST /v1/education/enrollments`
- `GET /v1/me/education/enrollments`
- `POST /v1/me/education/lessons/:lessonId/progress`
- `GET /v1/me/education/certificates`

### Audit And Reporting

- `GET /v1/admin/audit-log`
- `GET /v1/admin/reports/utilization`
- `GET /v1/admin/reports/provider-performance`
- `GET /v1/admin/reports/membership-performance`
- `GET /v1/admin/reports/referral-performance`

### AI Foundation

- `POST /v1/ai/booking-assistant/chat`
- `POST /v1/ai/booking-assistant/recommendations`

### Async Events

- `referral.reward_earned`
- `education.enrollment_created`
- `audit.log_recorded`
- `import.job_completed`
- `ai.run_completed`

## Phase 3 Enterprise Credibility Contracts

- `GET /v1/admin/forms`
- `POST /v1/admin/forms`
- `POST /v1/forms/:formId/submissions`
- `GET /v1/admin/consents`
- `POST /v1/consents/:consentId/accept`
- `POST /v1/admin/media-assets`
- `GET /v1/admin/before-after-sets`
- `POST /v1/admin/treatment-notes`
- `GET /v1/admin/treatment-notes/:noteId`

## Phase 4 Intelligence Contracts

- `POST /v1/webhooks/skin-assessments`
- `GET /v1/admin/customers/:customerId/skin-assessments`
- `POST /v1/ai/customer-recommendations`
- `GET /v1/admin/intelligence/market-signals`
- `GET /v1/admin/intelligence/pricing`
- `GET /v1/admin/intelligence/seo`

### Async Events

- `skin_assessment.received`
- `skin_assessment.normalized`
- `competitor.signal_captured`
- `pricing.signal_captured`
- `recommendation.generated`

## First Contracts To Author

1. auth session exchange and `me`
2. public catalog listing
3. availability search
4. booking create, cancel, and reschedule
5. checkout quote and confirm
6. Stripe webhook ingest
7. admin locations, machines, services, and membership plans
8. provider schedule management
9. revenue summary reporting

## Things We Must Not Screw Up

- do not expose provider SDK semantics through our own API shapes
- do not let the booking contract assume memberships are required for standard services
- do not collapse admin and provider authorization into one sloppy role check
- do not let AI endpoints mutate bookings or payments without explicit action contracts and audit coverage
