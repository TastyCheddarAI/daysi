import { describe, expect, it } from "vitest";

import { isAssignableScopedRole, listRoleDefinitions } from "./access-control";

describe("access control", () => {
  it("describes roles and assignable scoped roles for the admin control plane", () => {
    const roles = listRoleDefinitions();

    expect(roles.find((role) => role.code === "admin")?.assignable).toBe(true);
    expect(roles.find((role) => role.code === "admin")?.requiresLocationScope).toBe(true);
    expect(roles.find((role) => role.code === "owner")?.assignable).toBe(false);
    expect(roles.find((role) => role.code === "staff")?.permissions).toContain(
      "admin.reporting.read",
    );
    expect(isAssignableScopedRole("admin")).toBe(true);
    expect(isAssignableScopedRole("staff")).toBe(true);
    expect(isAssignableScopedRole("owner")).toBe(false);
  });
});
