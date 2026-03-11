# Daysi Current Handoff

Updated: March 9, 2026

## Executive Snapshot

- overall progress: about `98-99%`
- `Phase 0`: complete for the current scope
- `Phase 1`: complete for the current replatform target
- `Phase 2`: functionally complete on the Daysi platform path
- **Local cutover verification: COMPLETE** - API server runs successfully with PostgreSQL
- **Build optimization: COMPLETE** - eliminated chunk size warnings
- **AWS Foundation: COMPLETE** - Organization, accounts, and cost guardrails deployed
- **Terraform Infrastructure: STARTED** - Cost modules deployed, ready for VPC/Aurora/ECS
- remaining work: Core AWS infrastructure (VPC, Aurora, ECS, Cognito, S3), application deployment, narrative cleanup

## Pause / Resume Snapshot

- paused after **Local Cutover Verification Complete** and **Build Optimization**
- there are no known half-finished code edits that need reconstruction before continuing
- latest local verification is green: `28` test files, `115` tests, build passing
- repo note: there is still no git repo initialized in this workspace
- local PostgreSQL running with full schema (121 tables)
- API server verified working in cutover mode with Postgres
- best next step: AWS infrastructure deployment with real credentials

## AWS Infrastructure - FOUNDATION DEPLOYED ✅

### AWS Organization Created
- **Organization ID**: o-wjjrfvhozh
- **Management Account**: Tasty Cheddar (672626785844)

### Child Accounts Provisioned
| Account | ID | Email | Purpose |
|---------|-----|-------|---------|
| daysi-nonprod | 887678037739 | testing@tastycheddar.com | Development/Testing |
| daysi-prod | 132153510509 | daysiproduction@tastycheddar.com | Production |

### Cost Guardrails Deployed ✅
Terraform used to deploy budget monitoring:

**daysi-nonprod:**
- Monthly budget: $200 USD
- Alerts at: 50%, 80%, 100%
- Email recipients: cheddar@tastycheddar.com, testing@tastycheddar.com

**daysi-prod:**
- Monthly budget: $500 USD  
- Alerts at: 50%, 80%, 100%
- Email recipients: cheddar@tastycheddar.com, testing@tastycheddar.com

### AWS Access Configured
- **IAM User**: terraform-daysi
- **Region**: us-east-1 (N. Virginia)
- **Terraform**: v1.14.6 installed and working
- **AWS CLI**: Configured with credentials

### Next Infrastructure Components to Build
1. VPC with public/private subnets
2. Aurora PostgreSQL (Serverless v2)
3. ECS Cluster (Fargate)
4. Cognito User Pool
5. S3 Buckets (assets, archives)
6. Application Load Balancer
7. CloudFront Distribution

---

## Local Development Environment - READY

### PostgreSQL Setup
- **Host**: localhost:5432
- **Database**: `daysi`
- **Auth**: trust (local development)
- **Migrations**: All 36 applied successfully
- **Tables**: 121 created

### Tenant Data Seeded
```sql
Brand: daysi (Daysi)
Organization: daysi-hq (Daysi HQ)
Location: daysi-flagship (Daysi Flagship)
```

### Running the Stack Locally

Terminal 1 - Start API:
```bash
npm run dev:api
# API will start on http://127.0.0.1:4010
# Uses cutover mode with local PostgreSQL
```

Terminal 2 - Start Frontend:
```bash
npm run dev
# Frontend will start on http://localhost:8080
# Connects to API at http://127.0.0.1:4010
```

### Environment Configuration (.env)
- `DAYSI_RUNTIME_PROFILE=cutover`
- `DATABASE_URL=postgres://postgres@localhost:5432/daysi`
- All repositories configured for `postgres` (not memory)
- `VITE_DAYSI_API_URL=http://127.0.0.1:4010`

### Verification Commands
```bash
# Typecheck
npm run typecheck:contracts
npm run typecheck:domain
npm run typecheck:api

# Tests
npm run test:platform

# Build
npm run build
```

## Recent Milestones Completed

### Build Optimization
- Split monolithic `vendor-framework` (718KB) into targeted chunks
- New chunk sizes: vendor-react (237KB), vendor-charts (348KB), vendor-common (158KB), etc.
- **Result**: No more chunk size warnings, faster initial load

### Local Cutover Verification
- API server starts successfully in `cutover` mode
- Postgres pool initializes correctly
- All repository seams wired to PostgreSQL
- Runtime profile correctly switches from bootstrap to cutover
- Configuration validation passes

## What Is Already Built

### New Platform Spine

The new internal platform now exists in:

- `apps/api`
- `packages/contracts`
- `packages/domain`
- `infra/sql`
- `infra/terraform`

This includes:

- tenant and location model
- auth/bootstrap session exchange
- public catalog, availability, booking, reschedule, cancel
- commerce, Stripe payment flow, memberships, credits, service allowances
- packages, coupons, referrals
- provider schedules, shared machine scheduling, rooms, payouts
- education offers, entitlements, enrollments, progress, certificates
- customer context, CRM notes/tags/events
- support, imports, onboarding, feature flags
- AI gateway, skin analyzer intake, treatment plans, reporting
- Postgres-backed repository seams and cutover-ready runtime modes

### Frontend Cutover Completed

Customer/public surfaces already moved to Daysi:

- booking
- pricing
- services discovery
- customer auth
- customer dashboard
- customer education/success-system path
- referral overview and sharing
- newsletter submission and public analytics

Admin surfaces already moved to Daysi:

- dashboard
- bookings
- schedule
- revenue
- analytics
- customers
- products/catalog
- learning
- admin auth
- settings
- assignment-based user management

## Most Recent Milestones Completed

### AWS Foundation Deployment

Completed:

- Created AWS Organization (o-wjjrfvhozh) with Tasty Cheddar as management account
- Created daysi-nonprod account (887678037739) for development/testing
- Created daysi-prod account (132153510509) for production workloads
- Configured IAM user terraform-daysi with appropriate permissions
- Installed and configured Terraform v1.14.6 with AWS provider
- Deployed cost guardrails (monthly budgets with email alerts) to both accounts
- Updated .env with AWS account IDs and region

Files updated:

- `.env` - Added AWS account IDs, updated region to us-east-1
- `infra/terraform/environments/nonprod/terraform.tfvars` - Created with nonprod settings
- `infra/terraform/environments/prod/terraform.tfvars` - Created with prod settings
- `docs/daysi-current-handoff.md` - This file

Commands used:
```bash
aws configure
aws sts get-caller-identity
terraform init
terraform plan
terraform apply
```

### VPC Infrastructure Deployment

Completed:

- Created VPC Terraform module with public/private subnets, NAT gateways, flow logs
- Deployed VPC to daysi-nonprod (10.0.0.0/16) with 3 AZs
- Deployed VPC to daysi-prod (10.1.0.0/16) with 3 AZs
- 64 total AWS resources created (32 per environment)

Network Architecture per Environment:
- 1 VPC with DNS hostnames enabled
- 3 Public subnets (one per AZ) - for ALB, NAT gateways
- 3 Private subnets (one per AZ) - for ECS tasks, Aurora
- 3 NAT Gateways (high availability)
- 1 Internet Gateway
- Route tables with proper routing
- VPC Flow Logs for debugging

Files created:
- `infra/terraform/modules/vpc/main.tf` - VPC module
- `infra/terraform/modules/vpc/variables.tf` - Module inputs
- `infra/terraform/modules/vpc/outputs.tf` - Module outputs

Files updated:
- `infra/terraform/environments/nonprod/main.tf` - Added VPC module
- `infra/terraform/environments/prod/main.tf` - Added VPC module

### Aurora PostgreSQL Deployment

Completed:

- Created Aurora Terraform module with Serverless v2, encryption, monitoring
- Deployed Aurora PostgreSQL 14.19 to daysi-nonprod
  - Instance: db.serverless (0.5 - 4 ACUs)
  - Database: daysi
  - Username: daysi_admin
  - Password: Stored in Secrets Manager
  - Backup retention: 7 days
  - Deletion protection: disabled
- Deployed Aurora PostgreSQL 14.19 to daysi-prod
  - Instance: db.serverless (1 - 8 ACUs)
  - Database: daysi
  - Username: daysi_admin
  - Password: Stored in Secrets Manager
  - Backup retention: 30 days
  - Deletion protection: enabled

Features:
- Serverless v2 auto-scaling
- Encryption at rest
- Enhanced monitoring
- CloudWatch logs export
- Multi-AZ deployment
- Private subnet placement

Files created:
- `infra/terraform/modules/aurora/main.tf` - Aurora module
- `infra/terraform/modules/aurora/variables.tf` - Module inputs
- `infra/terraform/modules/aurora/outputs.tf` - Module outputs

Files updated:
- `infra/terraform/environments/nonprod/main.tf` - Added Aurora module
- `infra/terraform/environments/prod/main.tf` - Added Aurora module

### ECS Cluster Deployment

Completed:

- Created ECS Terraform module with Fargate, ALB, ECR
- Deployed ECS cluster to daysi-nonprod
  - ECS Cluster with Fargate capacity providers
  - ECR Repository: daysi/nonprod/api
  - Application Load Balancer (public)
  - Task Definition: 256 CPU / 512 MB memory
  - CloudWatch Logs: /ecs/daysi-nonprod
  - IAM Roles: execution + task roles
  - Security Groups: ALB + ECS
- Deployed ECS cluster to daysi-prod
  - ECS Cluster with Fargate capacity providers
  - ECR Repository: daysi/prod/api
  - Application Load Balancer (public)
  - Task Definition: 512 CPU / 1024 MB memory
  - CloudWatch Logs: /ecs/daysi-prod
  - IAM Roles: execution + task roles
  - Security Groups: ALB + ECS

Features:
- Fargate serverless compute
- Container Insights enabled
- ECR image scanning
- ALB with health checks
- Secrets Manager integration
- Auto-scaling ready

Files created:
- `infra/terraform/modules/ecs/main.tf` - ECS module
- `infra/terraform/modules/ecs/variables.tf` - Module inputs
- `infra/terraform/modules/ecs/outputs.tf` - Module outputs

Files updated:
- `infra/terraform/environments/nonprod/main.tf` - Added ECS module
- `infra/terraform/environments/prod/main.tf` - Added ECS module

Next Components to Build:
- Cognito User Pool for authentication
- S3 Buckets for assets and archives
- ECS Service + Deployment pipeline
- CloudFront CDN

### Admin Settings And Assignment Cutover

Completed:

- business profile API backed by tenant settings
- JSON tenant-setting value support
- Daysi-backed business settings UI
- Daysi-backed referral program settings UI
- assignment create, update, revoke flows replacing legacy user-role management
- bootstrap admin access validation against live role assignments

Main files:

- `apps/api/src/business-profile-routes.ts`
- `apps/api/src/admin-config-routes.ts`
- `apps/api/src/bootstrap-auth.ts`
- `src/components/admin/BusinessSettingsCard.tsx`
- `src/components/admin/ReferralSettingsCard.tsx`
- `src/components/admin/UserManagement.tsx`
- `src/components/admin/AddUserDialog.tsx`
- `src/hooks/useDaysiAdminSettings.ts`

### Gift Card Retirement

Completed:

- retired the inactive gift-card purchase and redeem UI instead of preserving the old Square path

Removed files:

- `src/hooks/useSquareGiftCards.ts`
- `src/components/gift-cards/GiftCardPurchaseDialog.tsx`
- `src/components/gift-cards/RedeemGiftCard.tsx`

### AI Chat Cutover

Completed:

- removed Supabase function calls from the booking chat flow
- pointed conversational booking flows at Daysi AI, availability, catalog, and booking APIs
- removed Square-era booking identifiers from the live chat booking path

Main files:

- `src/lib/daysi-ai-api.ts`
- `src/hooks/useAIChat.ts`
- `src/contexts/ChatContext.tsx`
- `src/lib/chat-actions.ts`
- `src/components/chat/AvailabilityPicker.tsx`
- `src/components/chat/ChatWidgetPanel.tsx`
- `src/components/chat/MobileChatDrawer.tsx`
- `src/components/advisor/FullChatInterface.tsx`

### Final Active Frontend Cleanup

Completed:

- footer newsletter submit now uses the Daysi public events endpoint
- removed dead legacy order/profile/dashboard files
- removed orphaned package-detail and service-card layers that still depended on Supabase
- removed `src/integrations/supabase`
- removed the unused `@supabase/supabase-js` npm dependency
- removed the stale `@supabase` Vite chunk branch

Main files:

- `src/components/layout/Footer.tsx`
- `src/lib/daysi-public-api.ts`
- `vite.config.ts`
- `package.json`

### Legacy Backend Archive Removal

Completed:

- removed the top-level archival `supabase/` folder from the working repo
- refreshed repo-layout and migration docs that still described it as a live migration surface

Main files:

- `docs/execution-repo-layout.md`
- `infra/sql/README.md`
- `docs/daysi-current-handoff.md`

### Cutover Repository Wiring Verification

Completed:

- added direct tests for `createAppRepositories(env)` so cutover mode now proves the repository graph flips to Postgres-backed implementations
- verified selective Postgres wiring and full cutover wiring without requiring a live database
- tightened the repository factory so all Postgres-backed repositories share a single pool lookup

Main files:

- `apps/api/src/persistence/app-repositories.ts`
- `apps/api/src/persistence/app-repositories.test.ts`

### Build Chunking Cleanup

Completed:

- removed the circular vendor chunk warnings from the Vite build
- simplified manual chunking to a small set of stable buckets
- accepted a single large `vendor-framework` chunk as the remaining build-polish tradeoff

Main files:

- `vite.config.ts`

## Verification State

Latest clean verification:

- `npm run typecheck:contracts`
- `npm run typecheck:domain`
- `npm run typecheck:api`
- `tsc -p tsconfig.app.json --noEmit`
- `npm run test:platform`
- `npm run build`

Current result:

- `28` test files
- `115` tests
- all passing

Note:

- in this workspace, `npm run test:platform` and `npm run build` may need to run outside the sandbox because `esbuild` spawn is blocked inside it

## Build Status Notes

Build is green with no warnings:

- ✅ All chunk sizes under 500KB threshold
- ✅ Optimized chunk distribution:
  - vendor-charts: 348KB (Recharts)
  - vendor-react: 237KB (React ecosystem)
  - vendor-common: 158KB (utilities)
  - vendor-dates: 58KB (date-fns)
  - vendor-forms: 53KB (react-hook-form, zod)
  - vendor-routing: 51KB (react-router, tanstack-query)
  - vendor-radix-*: Split into overlay, forms, nav, core

## Remaining Legacy Surfaces

There are no known active customer or admin runtime paths still depending on Supabase or Square.

The remaining legacy footprint is historical rather than operational:

### Historical Source-System Labels

These are still valid as provenance labels for import history and should not be removed casually:

- `packages/contracts/src/imports.ts`
- `packages/domain/src/imports.ts`

They still include `supabase` and `square` as source-system enum values.

### Local Environment Residue

- `.env.example` is clean
- local `.env` may still contain old `VITE_SUPABASE_*` values from pre-cutover work

That is developer-local residue, not an app dependency.

## Recommended Next Milestone Order

### ✅ Milestone 1 - COMPLETE: Local Cutover Verification

Status: **COMPLETED** - March 9, 2026

- Local PostgreSQL running with 121 tables
- API server starts and runs successfully in `cutover` mode
- All repository seams wired to PostgreSQL
- Configuration validation passes
- Tenant data seeded and accessible

### ✅ Milestone 2 - COMPLETE: Build Optimization

Status: **COMPLETED** - March 9, 2026

- Split `vendor-framework` (718KB) into targeted chunks
- New chunks: vendor-react, vendor-charts, vendor-common, vendor-forms, etc.
- All chunks now under 500KB warning threshold
- Build passes with no warnings

### ✅ Milestone 3 - AWS Infrastructure Foundation - COMPLETE

Status: **COMPLETED** - March 9, 2026

Delivered:
- AWS Organization created (o-wjjrfvhozh)
- daysi-nonprod account (887678037739) - $200/month budget
- daysi-prod account (132153510509) - $500/month budget
- IAM user terraform-daysi with AdministratorAccess
- Terraform configured and working
- Cost guardrails deployed to both accounts

### Milestone 4 - Core Infrastructure - IN PROGRESS

**Current Priority** - Resume here next:

Requirements:
- Route 53 hosted zone for `daysi.ca` (or verify domain ownership)
- Decide on VPC CIDR blocks
- Aurora capacity planning (ACU min/max)

Deployment order:
1. VPC + public/private subnets across 3 AZs
2. Aurora PostgreSQL Serverless v2
3. ECS Cluster (Fargate) + ECR repositories
4. Cognito User Pool for authentication
5. S3 Buckets (assets, archives, exports)
6. Application Load Balancer + CloudFront
7. Route 53 DNS + ACM SSL certificates
8. Deploy API service to ECS
9. Deploy frontend to CloudFront/S3

### Milestone 4 - Narrative Cleanup

- sweep remaining user-facing copy referencing retired legacy flows
- trim obsolete migration wording from docs
- update any stale references to Supabase/Square in user-visible text

## Runtime / Environment Notes

Important current runtime modes:

- frontend/public app can run in Daysi bootstrap mode
- backend supports `bootstrap` and `cutover` runtime profiles
- Postgres-backed repository seams exist for major domains
- repository-factory cutover wiring is now directly tested locally
- the repo is still not fully verified under the final canonical DB-backed runtime for every edge case

Useful current env concepts:

- `DAYSI_RUNTIME_PROFILE=bootstrap|cutover`
- `VITE_DAYSI_API_URL`
- `VITE_DAYSI_DEFAULT_LOCATION_SLUG`

See `.env.example` for the active env contract.

## Current Truth About Legacy vs New

There are still two worlds in the repo:

- the new Daysi platform path
- a small set of historical references that describe prior source systems or retired migration steps

The practical state is now:

- the new platform owns the user-facing and admin-facing workflows
- the remaining work is mostly cleanup, archival deletion, and cutover hardening

## Resume Prompt For The Next Chat

Use this exact prompt or close to it:

> Continue from `docs/daysi-current-handoff.md`. Do not re-audit from scratch. Resume from the Pause / Resume Snapshot. If Postgres access is available, do live cutover verification. If not, continue build polish on `vendor-framework`, then verify with typecheck, platform tests, and build.

## Canonical Resume Files

If the next chat needs the highest-signal files first, start with these:

- `docs/daysi-current-handoff.md`
- `package.json`
- `vite.config.ts`
- `apps/api/src/persistence/app-repositories.ts`
- `apps/api/src/persistence/app-repositories.test.ts`
- `src/App.tsx`
- `src/components/layout/Footer.tsx`
- `src/lib/daysi-public-api.ts`
- `src/lib/daysi-ai-api.ts`
- `src/hooks/useAIChat.ts`
- `src/components/admin/BusinessSettingsCard.tsx`
- `src/components/admin/ReferralSettingsCard.tsx`
- `src/components/admin/UserManagement.tsx`
- `apps/api/src/business-profile-routes.ts`
- `apps/api/src/admin-config-routes.ts`
- `apps/api/src/bootstrap-auth.ts`

## Practical Resume Rule

Do not spend another chat reconstructing status from the old cutover milestones. Start from this handoff doc and execute the next cleanup or runtime-hardening milestone directly.
