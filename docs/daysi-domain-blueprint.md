# Daysi Domain Blueprint

## Purpose

This is the minimum serious domain shape for Daysi based on the current product and the added business requirements.

This is not a final schema. It is the architectural truth we will build the schema and API contracts from.

## Organizational Hierarchy

- `brand`
  top-level identity for Daysi
- `organization`
  legal or operating entity, supports future franchise-style ownership
- `location`
  physical business unit, operating hours, local pricing, local resources
- `location_feature_flag`
  enables or disables optional modules such as education, skin analysis, memberships, and future plugins

## People

- `user`
  authenticated identity
- `profile`
  customer or staff-facing person record
- `provider`
  independent service provider or employee provider
- `provider_role_assignment`
  maps a provider to one or more locations and permissions
- `provider_comp_plan`
  payout rule, percentage of sales, service-level override support
- `provider_payout_period`
  calculated payout runs and reconciliation state

## Resources

- `machine`
  a physical machine that can perform a limited set of services
- `machine_capability`
  which services a machine can perform
- `machine_schedule`
  editable admin schedule for machine availability and maintenance
- `machine_booking_window`
  reserved or blocked operating windows derived from bookings and admin holds
- `room`
  optional physical room resource
- `room_schedule`
  room availability and blackout windows

## Scheduling

- `location_schedule`
  business hours and exceptions
- `provider_schedule_template`
  repeating availability owned by the provider
- `provider_schedule_exception`
  time off, blackout, manual overrides
- `booking_policy`
  cancellation windows, deposits, buffers, no-show rules
- `availability_slot`
  computed, not persisted as source of truth

## Catalog

- `service_category`
- `service`
  treatment definition
- `service_variant`
  duration, pricing tier, resource requirements
- `service_location_offer`
  location-specific activation, pricing, bookability
- `product`
- `product_location_offer`
- `location_machine_inventory`
  which machines a given location actually has
- `machine_service_rule`
  explicit machine/service compatibility and required count

## Commerce

- `cart`
- `cart_item`
- `order`
- `order_item`
- `payment`
- `refund`
- `credit_ledger`
- `credit_entry`
- `coupon`
- `coupon_redemption`
- `promotion_rule`

## Memberships

- `membership_plan`
  admin-defined plan definition
- `membership_price`
  region or location-aware pricing if needed
- `membership_entitlement`
  monthly included services, discounts, or product access
- `membership_subscription`
  customer enrollment and billing state
- `membership_cycle`
  monthly accrual and reset period
- `membership_usage`
  what entitlements were consumed and when

Rules:

- memberships are optional for service booking unless a specific offer is configured as membership-only
- the platform must support standard retail pricing for services alongside membership discounts, credits, or included usage
- membership state changes price and entitlements, not the existence of a general booking path

## Referrals

- `referral_program`
- `referral_code`
- `referral_relationship`
  customer-to-customer link
- `referral_reward_rule`
  supports level 1 and optional level 2 rewards
- `referral_reward_event`
  the moment a reward becomes earned
- `referral_reward_redemption`

## Booking

- `booking`
- `booking_line`
  one booking may involve one or more service lines
- `booking_resource_assignment`
  provider, machine, room
- `booking_status_history`
- `booking_note`
- `booking_membership_application`
- `booking_coupon_application`

## Customer Intelligence

- `skin_assessment_source`
  source system and schema version
- `skin_assessment`
  normalized assessment record
- `skin_assessment_asset`
  images or attached artifacts
- `skin_assessment_metric`
  normalized numeric or categorical findings
- `skin_assessment_event`
  raw inbound event and processing state
- `customer_note`
- `customer_segment`
- `customer_tag`

## Education

- `education_offer`
  commercial wrapper for a course, module, or bundled education access offer, can be free or paid
- `course`
- `module`
- `lesson`
- `education_offer_item`
  maps one education offer to one or more modules or other content groups
- `enrollment`
- `lesson_progress`
- `certificate`
- `learning_entitlement`
  granted by purchase, role, or membership

Rules:

- no education access without an entitlement
- entitlements can come from a free education offer, paid purchase, membership, or role-based grant
- admin can change whether an education offer is free or paid and can update its value without code deploys
- coupons and promotions may discount education offers
- staff may receive admin-granted free education entitlements
- an education membership may unlock education offers without direct purchase
- one education offer may unlock multiple modules
- education revenue is tracked separately from treatment, retail, membership, and provider-compensated revenue
- membership plans must be admin-composable, not hardcoded to fixed tier logic

## Analytics And Intelligence

- `event`
  first-party product analytics
- `seo_snapshot`
- `market_signal`
- `competitor_document`
- `intelligence_document`
- `intelligence_chunk`
- `embedding_job`
- `ai_run`
- `ai_run_source`
- `ai_recommendation`

## Authorization

- `role`
- `permission`
- `role_permission`
- `user_role_assignment`
- `location_scope`

## Critical Rules

### Booking Rule

A slot is only bookable if all are true:

- the location is open
- the provider is available
- the machine is available and compatible
- the machine is not already reserved by another provider booking in that time window
- the room is available if required
- the customer has valid entitlement if the service requires it
- coupon, credit, and referral rules validate

Pricing outcome:

- if the customer is not a member, the system must still allow booking at the configured retail price
- if the customer is a member, the system may apply included usage, member pricing, discounts, or credits according to Daysi entitlement rules
- membership cannot be assumed as a prerequisite for booking standard services

### Membership Rule

Entitlements live in Daysi, not in the billing provider.

Billing tells us whether a subscription is active. Daysi decides what the member can actually do.

### Education Commerce Rule

Education is part of commerce.

That means:

- every sellable or free education offering is modeled as a product
- the product shape is `education_offer`, not a hardcoded assumption about course versus module naming
- checkout, discounts, coupons, memberships, and reporting can apply where allowed
- access control is derived from entitlements, not from content flags in the UI

### Education Revenue Rule

Education revenue is a separate revenue stream.

That means:

- it must be reported independently
- it should not automatically flow into provider commission logic
- dashboards must break out education revenue from services, products, memberships, and other streams

### Franchise Rule

Franchise-style independence is handled through scoped permissions and reporting boundaries, not separate code paths.

### Location Feature Rule

Optional modules such as skin analysis, education, memberships, and future plugins must be enableable or disableable per location.

The first corporate location does not need the full franchise UI on day one, but the schema and authorization model must leave room for it.

### Skin Analyzer Rule

Every inbound assessment must keep:

- source system
- schema version
- raw payload archive
- normalized internal representation
- processing status

## First API Surfaces To Design

- auth and session
- organization and location management
- provider scheduling
- machine and service management
- booking availability and booking lifecycle
- membership and entitlement evaluation
- coupons and referrals
- skin assessment ingestion
- education access and progress
- provider payout reporting
