import type { TenantContext } from "../../../../packages/domain/src";

import { buildBootstrapTenantContext } from "../bootstrap-data";
import { buildBootstrapClinicData, type BootstrapClinicData } from "../bootstrap-clinic-data";
import type { AppEnv } from "../config";
import { createPostgresClinicDefinitionRepository } from "./postgres-clinic-definition-repository";
import { getPostgresPool } from "./postgres-pool";

export interface ClinicDefinitionRepository {
  hydrate?(env: AppEnv): Promise<void>;
  getTenantContext(env: AppEnv): TenantContext;
  getClinicData(env: AppEnv): BootstrapClinicData;
  reset?(): void;
}

export const createBootstrapClinicDefinitionRepository =
  (): ClinicDefinitionRepository => ({
    hydrate: async () => {},
    getTenantContext: (env) => buildBootstrapTenantContext(env),
    getClinicData: (env) => buildBootstrapClinicData(env),
  });

let clinicDefinitionRepositoryOverride: ClinicDefinitionRepository | null = null;
let configuredClinicDefinitionRepository:
  | {
      key: string;
      repository: ClinicDefinitionRepository;
    }
  | null = null;

const buildConfiguredRepositoryKey = (env: AppEnv): string =>
  [env.DAYSI_CLINIC_DEFINITION_REPOSITORY, env.DAYSI_BRAND_SLUG].join("::");

const createConfiguredClinicDefinitionRepository = (
  env: AppEnv,
): ClinicDefinitionRepository =>
  env.DAYSI_CLINIC_DEFINITION_REPOSITORY === "postgres"
    ? createPostgresClinicDefinitionRepository(getPostgresPool(env))
    : createBootstrapClinicDefinitionRepository();

export const getClinicDefinitionRepository =
  (env: AppEnv): ClinicDefinitionRepository => {
    if (clinicDefinitionRepositoryOverride) {
      return clinicDefinitionRepositoryOverride;
    }

    const key = buildConfiguredRepositoryKey(env);
    if (!configuredClinicDefinitionRepository || configuredClinicDefinitionRepository.key !== key) {
      configuredClinicDefinitionRepository = {
        key,
        repository: createConfiguredClinicDefinitionRepository(env),
      };
    }

    return configuredClinicDefinitionRepository.repository;
  };

export const initializeClinicDefinitionRepository = async (
  env: AppEnv,
): Promise<void> => {
  const repository = getClinicDefinitionRepository(env);

  if (repository.hydrate) {
    await repository.hydrate(env);
  }
};

export const setClinicDefinitionRepository = (
  repository: ClinicDefinitionRepository,
): void => {
  clinicDefinitionRepositoryOverride = repository;
};

export const resetClinicDefinitionRepository = (): void => {
  clinicDefinitionRepositoryOverride?.reset?.();
  clinicDefinitionRepositoryOverride = null;
  configuredClinicDefinitionRepository?.repository.reset?.();
  configuredClinicDefinitionRepository = null;
};
