# Daysi Terraform Scaffold

This folder contains the starter Terraform layout for the Daysi AWS foundation.

## Target Account Layout

- `daysi-nonprod`
- `daysi-prod`

Both accounts should exist under your existing AWS Organization.

## Starter Region

- `ca-central-1`

## Scope Of This Scaffold

This scaffold is intentionally Phase 0 and Phase 1 oriented.

It is meant to hold:

- provider and environment configuration
- shared naming and tagging conventions
- cost guardrail inputs
- future baseline modules for networking, compute, database, storage, identity, and observability

It does not yet provision the full workload.

## Suggested Apply Order

1. bootstrap the nonprod account
2. bootstrap the prod account
3. apply cost guardrails
4. apply networking and state backends
5. apply workload baseline

## Required Inputs Later

- AWS account IDs
- billing alert emails
- Route 53 hosted zone details for `daysi.ca`
- state backend bucket and lock table details
