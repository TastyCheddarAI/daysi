import type { AccessAssignment, TenantSetting } from "../../../../packages/domain/src";

import {
  deleteAccessAssignment,
  findAccessAssignmentByEmailAndRole,
  getAccessAssignment,
  getTenantSetting,
  listAccessAssignments,
  listTenantSettings,
  saveAccessAssignment,
  saveTenantSetting,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

export interface ConfigurationRepository {
  tenantSettings: {
    save(setting: TenantSetting): Awaitable<void>;
    get(locationSlug: string, key: string): Awaitable<TenantSetting | undefined>;
    list(locationSlug?: string): Awaitable<TenantSetting[]>;
  };
  accessAssignments: {
    save(assignment: AccessAssignment): Awaitable<void>;
    get(assignmentId: string): Awaitable<AccessAssignment | undefined>;
    delete(assignmentId: string): Awaitable<void>;
    listAll(): Awaitable<AccessAssignment[]>;
    findByEmailAndRole(input: {
      email?: string;
      role: AccessAssignment["role"];
    }): Awaitable<AccessAssignment | undefined>;
  };
}

export const createInMemoryConfigurationRepository = (): ConfigurationRepository => ({
  tenantSettings: {
    save: (setting) => {
      saveTenantSetting(setting);
    },
    get: getTenantSetting,
    list: listTenantSettings,
  },
  accessAssignments: {
    save: (assignment) => {
      saveAccessAssignment(assignment);
    },
    get: getAccessAssignment,
    delete: deleteAccessAssignment,
    listAll: listAccessAssignments,
    findByEmailAndRole: findAccessAssignmentByEmailAndRole,
  },
});
