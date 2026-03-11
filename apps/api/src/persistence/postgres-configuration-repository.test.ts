import { describe, expect, it } from "vitest";

import type { AccessAssignment, TenantSetting } from "../../../../packages/domain/src";
import { createPostgresConfigurationRepository } from "./postgres-configuration-repository";

const queryResult = <T>(rows: T[]) => ({
  rowCount: rows.length,
  rows,
});

describe("postgres configuration repository", () => {
  it("round-trips json tenant settings and deletes access assignments", async () => {
    const tenantSettings = new Map<string, TenantSetting>();
    const accessAssignments = new Map<string, AccessAssignment>();
    const db = {
      query: async <T>(
        queryText: string,
        params: unknown[] = [],
      ): Promise<{ rowCount: number; rows: T[] }> => {
        if (queryText.includes("from location")) {
          return queryResult([
            {
              brand_id: "brand_daysi",
              location_id: "loc_daysi_flagship",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (queryText.includes("insert into configuration_tenant_setting_projection")) {
          const setting = JSON.parse(String(params[9])) as TenantSetting;
          tenantSettings.set(`${setting.locationSlug}::${setting.key}`, setting);
          return queryResult([]) as { rowCount: number; rows: T[] };
        }

        if (
          queryText.includes("from configuration_tenant_setting_projection") &&
          queryText.includes("setting_key = $2")
        ) {
          const setting = tenantSettings.get(`${params[0]}::${params[1]}`);
          return queryResult(setting ? [{ record: setting }] : []) as {
            rowCount: number;
            rows: T[];
          };
        }

        if (
          queryText.includes("from configuration_tenant_setting_projection") &&
          queryText.includes("where ($1::text is null or location_slug = $1)")
        ) {
          const rows = [...tenantSettings.values()]
            .filter((setting) => (params[0] ? setting.locationSlug === params[0] : true))
            .map((setting) => ({ record: setting }));
          return queryResult(rows) as { rowCount: number; rows: T[] };
        }

        if (queryText.includes("insert into configuration_access_assignment_projection")) {
          const assignment = JSON.parse(String(params[6])) as AccessAssignment;
          accessAssignments.set(assignment.id, assignment);
          return queryResult([]) as { rowCount: number; rows: T[] };
        }

        if (queryText.includes("delete from configuration_access_assignment_projection")) {
          accessAssignments.delete(String(params[0]));
          return queryResult([]) as { rowCount: number; rows: T[] };
        }

        if (
          queryText.includes("from configuration_access_assignment_projection") &&
          queryText.includes("where id = $1")
        ) {
          const assignment = accessAssignments.get(String(params[0]));
          return queryResult(assignment ? [{ record: assignment }] : []) as {
            rowCount: number;
            rows: T[];
          };
        }

        if (
          queryText.includes("from configuration_access_assignment_projection") &&
          queryText.includes("where lower(email) = $1")
        ) {
          const assignment = [...accessAssignments.values()].find(
            (entry) =>
              entry.email.toLowerCase() === String(params[0]) && entry.role === params[1],
          );
          return queryResult(assignment ? [{ record: assignment }] : []) as {
            rowCount: number;
            rows: T[];
          };
        }

        if (
          queryText.includes("from configuration_access_assignment_projection") &&
          queryText.includes("order by email asc")
        ) {
          return queryResult(
            [...accessAssignments.values()]
              .sort((left, right) => left.email.localeCompare(right.email))
              .map((assignment) => ({ record: assignment })),
          ) as { rowCount: number; rows: T[] };
        }

        throw new Error(`Unexpected SQL in test: ${queryText}`);
      },
    } as unknown as Parameters<typeof createPostgresConfigurationRepository>[0];

    const repository = createPostgresConfigurationRepository(db);
    const tenantSetting: TenantSetting = {
      id: "tset_business_profile_1",
      locationSlug: "daysi-flagship",
      key: "business.profile",
      valueType: "json",
      value: {
        businessName: "Prairie Glow",
        city: "Niverville",
        province: "MB",
        metaDescription: "Daysi profile",
      },
      updatedAt: "2026-03-09T15:00:00.000Z",
      updatedByUserId: "usr_admin_1",
    };

    await repository.tenantSettings.save(tenantSetting);

    expect(await repository.tenantSettings.get("daysi-flagship", "business.profile")).toEqual(
      tenantSetting,
    );
    expect(await repository.tenantSettings.list("daysi-flagship")).toEqual([tenantSetting]);

    const assignment: AccessAssignment = {
      id: "assign_admin_1",
      email: "manager@daysi.ca",
      role: "admin",
      locationScopes: ["daysi-flagship"],
      createdAt: "2026-03-09T15:05:00.000Z",
      updatedAt: "2026-03-09T15:05:00.000Z",
    };

    await repository.accessAssignments.save(assignment);
    expect(
      await repository.accessAssignments.findByEmailAndRole({
        email: assignment.email,
        role: assignment.role,
      }),
    ).toEqual(assignment);

    await repository.accessAssignments.delete(assignment.id);
    expect(await repository.accessAssignments.get(assignment.id)).toBeUndefined();
  });
});
