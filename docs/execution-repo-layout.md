# Execution Repo Layout

## Purpose

This defines the target repository shape for the clinic OS buildout.

It is intentionally migration-aware. The current root Vite app remains in place until the new platform surfaces are ready to absorb its responsibilities. The old managed-backend `supabase/` surface has already been retired from the live repo layout.

## Migration Stance

- do not pretend the current root app is already the final structure
- do not move files around just for aesthetics before the new modules exist
- do not add new provider-coupled business logic to the current React hooks and contexts
- all new durable business logic must go into the target structure below

## Target Layout

```text
/
|-- apps/
|   |-- web/
|   |-- api/
|   `-- workers/
|-- packages/
|   |-- domain/
|   `-- contracts/
|-- infra/
|   |-- sql/
|   `-- terraform/
|-- docs/
|-- assets/
|-- public/
`-- src/                      # temporary compatibility frontend during migration
```

## Directory Responsibilities

### `apps/web`

Next.js application for:

- public marketing pages
- SEO landing pages
- customer booking flows
- customer account area
- provider portal
- admin portal

Rules:

- this becomes the future web surface
- no direct database access from the browser
- all business operations go through the internal API

### `apps/api`

TypeScript API service for:

- REST or RPC contracts
- orchestration across domain modules
- authentication and authorization enforcement
- checkout, booking, membership, referral, education, payout, and reporting actions

Rules:

- owns request validation, idempotency, and transaction boundaries
- does not own domain rules that belong in `packages/domain`

### `apps/workers`

Queue and schedule driven workers for:

- async billing follow-up
- booking reminders
- reporting rollups
- import processing
- AI tasks
- market intelligence ingestion
- future skin analyzer ingestion pipelines

Rules:

- workers consume contracts and domain services
- workers do not invent their own private data rules

### `packages/domain`

Framework-free business logic for:

- policies
- aggregates
- invariants
- pricing and entitlement decisions
- booking and payout calculations

Rules:

- no HTTP framework code
- no React code
- no provider SDK glue

### `packages/contracts`

Shared contracts for:

- OpenAPI shapes
- request and response DTOs
- event schemas
- webhook payload validation

Rules:

- contracts are versioned
- contracts drive both API implementation and client integrations

## Current Legacy Areas

### `src/`

This is the temporary compatibility frontend.

What stays here for now:

- current Vite entrypoint
- current React page and component tree
- temporary compatibility work needed to keep the app running during migration

What must stop happening here:

- new domain rules in hooks
- new provider-specific business logic
- new data access patterns that bypass the future internal API

## Initial Build Order Inside The Repo

1. create contracts in `packages/contracts`
2. create domain modules in `packages/domain`
3. create API orchestration in `apps/api`
4. create Next.js web surface in `apps/web`
5. migrate workerized async flows into `apps/workers`
6. retire the remaining root `src/` compatibility layer once `apps/web` owns the live web surface

## Enforcement Rules

- no tenant-specific app directories
- no tenant-specific branches or schema forks
- no new external provider SDK access directly from web UI code
- no new business logic added to the legacy root app unless it is strictly required for stabilization during migration

## Workspace Transition Note

We are not switching package-manager or workspace tooling in this step.

This document defines the target shape first. Tooling changes should follow once the new directories begin carrying real code, not before.
