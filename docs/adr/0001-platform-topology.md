# ADR 0001: Daysi Platform Topology

## Status

Accepted

## Context

Daysi needs to replace the current browser-coupled backend with an AWS-owned platform that can support:

- multiple locations
- future franchise-style expansion
- shared machine scheduling
- commerce, memberships, education, referrals, and provider compensation
- AI and intelligence pipelines

The current app is not structurally capable of carrying that complexity safely.

## Decision

Daysi will be built as an AWS-native modular monolith with worker services.

Primary topology:

- `web`: Next.js on ECS Fargate behind CloudFront and ALB
- `api`: TypeScript application service on ECS Fargate
- `workers`: queue-driven worker services on ECS Fargate
- `db`: Aurora PostgreSQL Serverless v2
- `search`: OpenSearch Serverless when retrieval workloads justify it
- `storage`: S3 for assets, raw event archives, exports, and intelligence documents
- `identity`: Cognito for authentication only
- `orchestration`: EventBridge, SQS, Step Functions
- `ai`: internal AI gateway hosted on AWS

AWS account layout:

- `daysi-nonprod`
- `daysi-prod`

Chosen starter region:

- `ca-central-1`

## Consequences

Positive:

- strong separation between UI and domain logic
- clean path to multi-location and franchise controls
- real account-level cost and security boundaries
- avoids provider lock-in while keeping operational complexity sane

Negative:

- initial migration cost is higher than a patchwork rewrite
- requires new infrastructure, CI, and operational disciplines
- forces domain cleanup before feature work

## Rejected Alternatives

### Keep the current SPA and rewire provider calls

Rejected because it preserves the core architectural problems.

### Premature microservices

Rejected because the current problem is domain chaos, not a lack of service count.

### Single shared AWS account

Rejected because it weakens cost isolation, blast-radius control, and production discipline.
