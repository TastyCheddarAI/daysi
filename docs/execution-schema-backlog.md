# Execution Schema Backlog

## Purpose

This is the database build backlog derived from the domain blueprint and delivery matrix.

It is not final DDL. It is the ordered schema backlog we will implement against Aurora PostgreSQL.

## Schema Rules

- tenant and location scope must be explicit where applicable
- all money movement tables need immutable ledger-style records or status history
- all externally triggered state changes need idempotency support
- important operational changes need audit visibility
- reporting tables may be derived, but operational truth must stay in normalized core tables

## Phase 0 Foundations

Build first:

- `brand`
- `organization`
- `location`
- `location_feature_flag`
- `app_user`
- `auth_identity`
- `profile`
- `role`
- `permission`
- `role_permission`
- `user_role_assignment`
- `idempotency_key`
- `audit_log`
- `outbox_event`
- `import_job`
- `import_job_row`

Why first:

- tenancy, auth linkage, idempotency, auditability, and migration tooling are cross-cutting blockers

## Phase 1 Daysi Core

### Providers And Resources

- `provider`
- `provider_role_assignment`
- `provider_comp_plan`
- `machine`
- `machine_capability`
- `location_machine_inventory`
- `machine_schedule`
- `machine_booking_window`
- `room`
- `room_schedule`
- `location_schedule`
- `provider_schedule_template`
- `provider_schedule_exception`
- `booking_policy`

### Catalog And Pricing

- `service_category`
- `service`
- `service_variant`
- `service_location_offer`
- `machine_service_rule`
- `product`
- `product_location_offer`
- `price_book`
- `price_book_entry`

### Promotions And Memberships

- `coupon`
- `coupon_redemption`
- `promotion_rule`
- `membership_plan`
- `membership_price`
- `membership_entitlement`
- `membership_subscription`
- `membership_cycle`
- `membership_usage`

### Commerce And Payments

- `cart`
- `cart_item`
- `sales_order`
- `sales_order_item`
- `payment`
- `refund`
- `credit_ledger`
- `credit_entry`

### Booking

- `booking`
- `booking_line`
- `booking_resource_assignment`
- `booking_status_history`
- `booking_note`
- `booking_membership_application`
- `booking_coupon_application`

### Provider Compensation

- `provider_payout_period`
- `provider_payout_entry`

### Education Core

- `education_offer`
- `education_offer_item`
- `course`
- `module`
- `lesson`
- `learning_entitlement`

### Reporting Seeds

- `event`
- `reporting_snapshot_job`

## Phase 2 Design-Partner Readiness

### Tenant Controls And Support

- `tenant_setting`
- `admin_action_log`
- `support_case`
- `support_case_event`

### Imports And Reconciliation Expansion

- `import_mapping_profile`
- `reconciliation_issue`

### Referrals

- `referral_program`
- `referral_code`
- `referral_relationship`
- `referral_reward_rule`
- `referral_reward_event`
- `referral_reward_redemption`

### Education Progress

- `enrollment`
- `lesson_progress`
- `certificate`

### Customer Context

- `customer_note`
- `customer_segment`
- `customer_tag`

### Reporting

- `kpi_rollup_daily`
- `utilization_rollup_daily`
- `revenue_rollup_daily`

## Phase 3 Enterprise Credibility

- `intake_form`
- `intake_form_version`
- `form_submission`
- `consent_document`
- `consent_acceptance`
- `media_asset`
- `media_asset_variant`
- `before_after_set`
- `treatment_note`
- `treatment_note_version`
- `record_retention_policy`
- `record_retention_event`

Why here:

- these are necessary for stronger enterprise credibility, but they should not block `Daysi` core operational cutover

## Phase 4 Intelligence And Moat

- `skin_assessment_source`
- `skin_assessment_event`
- `skin_assessment`
- `skin_assessment_asset`
- `skin_assessment_metric`
- `seo_snapshot`
- `market_signal`
- `competitor_document`
- `intelligence_document`
- `intelligence_chunk`
- `embedding_job`
- `ai_run`
- `ai_run_source`
- `ai_recommendation`

## First Migrations To Write

1. tenancy and auth tables
2. access control tables
3. import and audit foundation
4. provider and resource tables
5. catalog and location offers
6. memberships and promotion tables
7. commerce and payments
8. booking and resource assignment tables
9. provider payout tables
10. education commerce core

## Things We Must Not Screw Up

- do not let payment provider identifiers become primary business identifiers
- do not model memberships in a way that blocks normal retail service booking
- do not collapse education revenue into treatment or provider revenue
- do not make machine availability an afterthought; it is a first-class constraint
- do not skip idempotency and audit support for financial or booking workflows
