# apps/api

This directory will contain the internal TypeScript API service.

Responsibilities:

- request validation
- auth and authorization enforcement
- orchestration across domain modules
- idempotent financial and booking workflows

Rules:

- business rules live in `packages/domain`
- DTOs and event schemas live in `packages/contracts`
