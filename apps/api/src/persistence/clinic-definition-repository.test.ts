import { afterEach, describe, expect, it, vi } from "vitest";

import { buildBootstrapClinicData } from "../bootstrap-clinic-data";
import { buildBootstrapTenantContext } from "../bootstrap-data";
import { loadAppEnv } from "../config";
import {
  initializeClinicDefinitionRepository,
  resetClinicDefinitionRepository,
  setClinicDefinitionRepository,
} from "./clinic-definition-repository";

const env = loadAppEnv({
  ...process.env,
  DAYSI_BRAND_SLUG: "daysi",
  DAYSI_DEFAULT_LOCATION_SLUG: "daysi-flagship",
  DAYSI_DEFAULT_LOCATION_NAME: "Daysi Flagship",
});

afterEach(() => {
  resetClinicDefinitionRepository();
});

describe("clinic definition repository", () => {
  it("hydrates the active repository during initialization", async () => {
    const hydrate = vi.fn(async () => {});

    setClinicDefinitionRepository({
      hydrate,
      getTenantContext: (inputEnv) => buildBootstrapTenantContext(inputEnv),
      getClinicData: (inputEnv) => buildBootstrapClinicData(inputEnv),
    });

    await initializeClinicDefinitionRepository(env);

    expect(hydrate).toHaveBeenCalledWith(env);
  });
});
