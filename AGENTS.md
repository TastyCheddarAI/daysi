# Daysi Admin - Agent Reference

## Architecture Overview

This is a React 18 + Vite + TypeScript SPA with a Node.js API backend.

**Stack:**
- Frontend: React 18, TanStack Query, React Router, Tailwind CSS, shadcn/ui
- Backend: Node.js, ECS Fargate, Aurora PostgreSQL
- Auth: Bootstrap token-based (owner/admin/staff/associate roles)

---

## Admin Dashboard Structure

### Navigation Categories

1. **Operations** (5 pages)
   - Dashboard, Calendar, Appointments, Time Clock, Waitlist

2. **Catalog** (4 pages)
   - Services, Products, Inventory, Packages

3. **Tools** (4 pages)
   - AI Assistant, Education, Import Jobs, Intake Forms

4. **Customers** (4 pages)
   - Customer List, Customer Journey, Memberships, Education Plans

5. **Growth** (3 pages)
   - Gift Cards, Referral Programs, Campaigns

6. **Reports** (2 pages)
   - Analytics, Audit Log

7. **Settings** (2 pages)
   - Business Profile, Staff

---

## Repository Pattern

All new features follow this repository pattern:

```typescript
// 1. Define interface
export interface FeatureRepository {
  listAll(options?: FeatureListOptions): Promise<Feature[]>;
  get(id: string): Promise<Feature | undefined>;
  save(feature: Feature): Promise<void>;
  delete(id: string): Promise<void>;
}

// 2. Create in-memory implementation
export const createInMemoryFeatureRepository = (): FeatureRepository => {
  const items = new Map<string, Feature>();
  return {
    listAll: async (options) => { /* ... */ },
    get: async (id) => items.get(id),
    save: async (feature) => { items.set(feature.id, feature); },
    delete: async (id) => { items.delete(id); }
  };
};

// 3. Add to AppRepositories interface
export interface AppRepositories {
  // ... existing repos
  feature: FeatureRepository;
}

// 4. Create in createAppRepositories
export const createAppRepositories = (): AppRepositories => ({
  // ... existing repos
  feature: createInMemoryFeatureRepository()
});
```

---

## API Routes Pattern

```typescript
// apps/api/src/feature-routes.ts
export const handleFeatureRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  // Check admin access
  if (!requireAdminActor(input)) return true;
  
  // List all
  if (input.method === "GET" && input.pathname === "/v1/admin/feature") {
    const items = await input.repositories.feature.listAll();
    sendJson(input.response, { items });
    return true;
  }
  
  // Create
  if (input.method === "POST" && input.pathname === "/v1/admin/feature") {
    const body = await parseBody(input.request);
    // ... validate and create
    await input.repositories.feature.save(item);
    // ... audit log
    sendJson(input.response, { item }, 201);
    return true;
  }
  
  return false;
};
```

---

## Frontend Hooks Pattern

```typescript
// src/hooks/useDaysiAdminFeature.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useDaysiAdminFeatures(input?: { locationSlug?: string }) {
  return useQuery({
    queryKey: ["daysi-admin", "features", input?.locationSlug],
    queryFn: () => daysiAdminApi.listFeatures({ locationSlug: input?.locationSlug }),
  });
}

export function useCreateDaysiAdminFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: daysiAdminApi.createFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daysi-admin", "features"] });
    },
  });
}

export function useUpdateDaysiAdminFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: daysiAdminApi.updateFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daysi-admin", "features"] });
    },
  });
}

export function useDeleteDaysiAdminFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: daysiAdminApi.deleteFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daysi-admin", "features"] });
    },
  });
}
```

---

## Role-Based Access Control

```typescript
// Permission hierarchy
const ROLES = {
  owner: { level: 4, fullAccess: true },
  admin: { level: 3, fullAccess: true },
  staff: { level: 2, operations: true, reports: true },
  associate: { level: 1, dashboard: true }
};

// Use in routes
if (!hasRole(input.actor, ["owner", "admin"])) {
  sendError(input.response, "Forbidden", 403);
  return true;
}
```

---

## Audit Logging

All data mutations should log to the audit system:

```typescript
// In route handler
await input.repositories.audit.log({
  timestamp: new Date().toISOString(),
  actor: { type: "admin", email: input.actor.email, name: input.actor.name },
  action: "create",
  entityType: "feature",
  entityId: feature.id,
  summary: `Created feature: ${feature.name}`,
  metadata: { feature },
  ipAddress: getClientIp(input.request),
  locationSlug: input.actor.locationSlug
});
```

---

## Build Commands

```bash
# Frontend build
npm run build
# Output: dist-new/ (dist/ has file locks)

# Type check
npx tsc --noEmit

# API build
cd apps/api && npm run build
```

---

## File Locations Reference

| Type | Path Pattern |
|------|-------------|
| API Routes | `apps/api/src/*-routes.ts` |
| Repositories | `apps/api/src/persistence/*-repository.ts` |
| Frontend Hooks | `src/hooks/useDaysiAdmin*.ts` |
| Admin Pages | `src/pages/admin/*.tsx` |
| API Client | `src/lib/daysi-admin-api.ts` |

---

## New Features Implementation Guide

To add a new admin feature:

1. **Create Repository** (`apps/api/src/persistence/feature-repository.ts`)
   - Define Feature interface
   - Create FeatureRepository interface
   - Implement createInMemoryFeatureRepository

2. **Register Repository** (`apps/api/src/persistence/app-repositories.ts`)
   - Add to AppRepositories interface
   - Add to createAppRepositories

3. **Create API Routes** (`apps/api/src/feature-routes.ts`)
   - Implement handleFeatureRoutes function
   - Add REST endpoints

4. **Wire Routes** (`apps/api/src/router.ts`)
   - Import handleFeatureRoutes
   - Add to routeRequest function

5. **Add API Types** (`src/lib/daysi-admin-api.ts`)
   - Define DaysiAdminFeature type
   - Add CRUD functions

6. **Create Frontend Hooks** (`src/hooks/useDaysiAdminFeature.ts`)
   - useDaysiAdminFeatures query hook
   - useCreate/Update/DeleteDaysiAdminFeature mutation hooks

7. **Build Page** (`src/pages/admin/Feature.tsx`)
   - Use hooks for data fetching
   - Implement CRUD UI
   - Add proper loading/error states

---

## Known Issues

### Pre-existing TypeScript Errors (Not in new code)
- `bootstrap-auth.ts` - Type mismatches
- `education-module-routes.ts` - Type casting
- `router.ts` - Route handler types
- `ai-service.ts` - API key types

### Build Output
- `dist/` folder has file locks from running processes
- Build outputs to `dist-new/` as workaround
- Does not affect functionality

---

## Documentation

- This file: Architecture and patterns
- `ADMIN_FEATURES_IMPLEMENTATION_REPORT.md`: Feature implementation summary
- `README.md`: General project info
