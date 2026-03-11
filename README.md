# Daysi

This repository is being replatformed into a fully AWS-owned application and removed from legacy generator-managed infrastructure.

## Current Priorities

- replace the managed auth, database, realtime, and function layer with AWS-native services
- replace external booking, payment, catalog, gift-card, and customer-sync flows with internal platform capabilities
- centralize branding under `Daysi`
- move deployment to git-driven delivery with AWS hosting and infrastructure as code

## Local Development

```sh
npm install
npm run dev
```

## Replatform Docs

See `docs/daysi-cutover-master-plan.md` for the full target architecture, critical assessment, and cutover plan.

See `docs/daysi-replatform-brief.md` for the condensed audit summary.

See `docs/clinic-os-product-spec.md` for the licensable multi-tenant clinic platform spec with `Daysi` as tenant one.

See `docs/clinic-os-delivery-matrix.md` for the phased build commitment tied directly to the product spec.

See `docs/daysi-current-handoff.md` for the current milestone state, verification status, remaining legacy surfaces, and the exact resume point for the next chat.

See `docs/execution-repo-layout.md`, `docs/execution-domain-modules.md`, `docs/execution-schema-backlog.md`, and `docs/execution-api-contract-backlog.md` for the execution artifacts that convert the spec into build structure and backlog.

See `docs/daysi-ai-provider-strategy.md` for the multi-provider AI and intelligence plan.

See `docs/daysi-day-0-inputs.md` for the inputs needed to start implementation.

See `docs/daysi-domain-blueprint.md` for the core domain model we will build the cutover around.

See `docs/asset-onboarding-spec.md` for the intake workflow for logos, marketing images, and before-and-after media.

See `docs/adr/` for accepted architecture decisions.

See `infra/terraform/` for the starter AWS foundation scaffold.

See `infra/sql/` for the new Aurora PostgreSQL migration path.

See `.env.example` for the new environment contract.
