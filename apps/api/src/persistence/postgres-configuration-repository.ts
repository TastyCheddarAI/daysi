import type { Pool } from "pg";

import type { AccessAssignment, TenantSetting } from "../../../../packages/domain/src";

type Queryable = Pick<Pool, "query">;

interface LocationScopeRow {
  brand_id: string;
  location_id: string;
}

const resolveLocationScope = async (
  db: Queryable,
  locationSlug: string,
): Promise<LocationScopeRow> => {
  const result = await db.query<LocationScopeRow>(
    `
      select brand_id, id as location_id
      from location
      where slug = $1
      order by created_at desc
      limit 2
    `,
    [locationSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(
      `Location ${locationSlug} is not available in Postgres configuration persistence.`,
    );
  }

  if ((result.rowCount ?? 0) > 1) {
    throw new Error(`Location slug ${locationSlug} is ambiguous across brands.`);
  }

  return result.rows[0];
};

const parseTenantSetting = (value: unknown): TenantSetting => value as TenantSetting;
const parseAccessAssignment = (value: unknown): AccessAssignment => value as AccessAssignment;

export const createPostgresConfigurationRepository = (db: Queryable) => ({
  tenantSettings: {
    save: async (setting: TenantSetting): Promise<void> => {
      const scope = await resolveLocationScope(db, setting.locationSlug);

      await db.query(
        `
          insert into configuration_tenant_setting_projection (
            id,
            brand_id,
            location_id,
            location_slug,
            setting_key,
            value_type,
            value,
            updated_by_user_id,
            updated_at,
            record
          )
          values (
            $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb
          )
          on conflict (id) do update
          set
            setting_key = excluded.setting_key,
            value_type = excluded.value_type,
            value = excluded.value,
            updated_by_user_id = excluded.updated_by_user_id,
            updated_at = excluded.updated_at,
            record = excluded.record
        `,
        [
          setting.id,
          scope.brand_id,
          scope.location_id,
          setting.locationSlug,
          setting.key,
          setting.valueType,
          JSON.stringify(setting.value),
          setting.updatedByUserId ?? null,
          setting.updatedAt,
          JSON.stringify(setting),
        ],
      );
    },
    get: async (locationSlug: string, key: string): Promise<TenantSetting | undefined> => {
      const result = await db.query<{ record: TenantSetting }>(
        `
          select record
          from configuration_tenant_setting_projection
          where location_slug = $1
            and setting_key = $2
          order by updated_at desc
          limit 1
        `,
        [locationSlug, key],
      );

      return result.rows[0] ? parseTenantSetting(result.rows[0].record) : undefined;
    },
    list: async (locationSlug?: string): Promise<TenantSetting[]> => {
      const result = await db.query<{ record: TenantSetting }>(
        `
          select record
          from configuration_tenant_setting_projection
          where ($1::text is null or location_slug = $1)
          order by updated_at desc
        `,
        [locationSlug ?? null],
      );

      return result.rows.map((row) => parseTenantSetting(row.record));
    },
  },
  accessAssignments: {
    save: async (assignment: AccessAssignment): Promise<void> => {
      await db.query(
        `
          insert into configuration_access_assignment_projection (
            id,
            email,
            role,
            location_scopes,
            created_at,
            updated_at,
            record
          )
          values (
            $1, $2, $3, $4::jsonb, $5, $6, $7::jsonb
          )
          on conflict (id) do update
          set
            email = excluded.email,
            role = excluded.role,
            location_scopes = excluded.location_scopes,
            updated_at = excluded.updated_at,
            record = excluded.record
        `,
        [
          assignment.id,
          assignment.email,
          assignment.role,
          JSON.stringify(assignment.locationScopes),
          assignment.createdAt,
          assignment.updatedAt,
          JSON.stringify(assignment),
        ],
      );
    },
    get: async (assignmentId: string): Promise<AccessAssignment | undefined> => {
      const result = await db.query<{ record: AccessAssignment }>(
        `
          select record
          from configuration_access_assignment_projection
          where id = $1
          limit 1
        `,
        [assignmentId],
      );

      return result.rows[0] ? parseAccessAssignment(result.rows[0].record) : undefined;
    },
    delete: async (assignmentId: string): Promise<void> => {
      await db.query(
        `
          delete from configuration_access_assignment_projection
          where id = $1
        `,
        [assignmentId],
      );
    },
    listAll: async (): Promise<AccessAssignment[]> => {
      const result = await db.query<{ record: AccessAssignment }>(
        `
          select record
          from configuration_access_assignment_projection
          order by email asc
        `,
      );

      return result.rows.map((row) => parseAccessAssignment(row.record));
    },
    findByEmailAndRole: async (input: {
      email?: string;
      role: AccessAssignment["role"];
    }): Promise<AccessAssignment | undefined> => {
      if (!input.email) {
        return undefined;
      }

      const result = await db.query<{ record: AccessAssignment }>(
        `
          select record
          from configuration_access_assignment_projection
          where lower(email) = $1
            and role = $2
          limit 1
        `,
        [input.email.toLowerCase(), input.role],
      );

      return result.rows[0] ? parseAccessAssignment(result.rows[0].record) : undefined;
    },
  },
});
