# apps/web

This directory will contain the future Next.js web application for `Daysi` and later clinic OS tenants.

It will replace the current root Vite app over time.

Rules:

- no direct provider SDK business logic
- no direct browser-to-database patterns
- consume contracts from `packages/contracts`
- call the internal API only
