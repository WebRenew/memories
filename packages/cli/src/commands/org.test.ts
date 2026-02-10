import { describe, expect, it } from "vitest";
import { resolveOrganizationTarget } from "./org.js";

const organizations = [
  {
    id: "org_1",
    name: "Core Team",
    slug: "core-team",
    role: "owner" as const,
  },
  {
    id: "org_2",
    name: "Growth",
    slug: "growth",
    role: "member" as const,
  },
  {
    id: "org_3",
    name: "Growth Ops",
    slug: "growth-ops",
    role: "admin" as const,
  },
];

describe("resolveOrganizationTarget", () => {
  it("resolves personal target", () => {
    const result = resolveOrganizationTarget(organizations, "personal");
    expect(result.orgId).toBeNull();
    expect(result.label).toContain("Personal workspace");
  });

  it("resolves by exact id", () => {
    const result = resolveOrganizationTarget(organizations, "org_2");
    expect(result.orgId).toBe("org_2");
    expect(result.label).toContain("growth");
  });

  it("resolves by exact slug", () => {
    const result = resolveOrganizationTarget(organizations, "growth");
    expect(result.orgId).toBe("org_2");
  });

  it("resolves by exact name (case insensitive)", () => {
    const result = resolveOrganizationTarget(organizations, "core team");
    expect(result.orgId).toBe("org_1");
  });

  it("resolves by unique slug prefix", () => {
    const result = resolveOrganizationTarget(organizations, "core");
    expect(result.orgId).toBe("org_1");
  });

  it("throws on ambiguous slug prefix", () => {
    expect(() => resolveOrganizationTarget(organizations, "growth")).not.toThrow();
    expect(() => resolveOrganizationTarget(organizations, "g")).toThrow(
      /be more specific/i
    );
  });

  it("throws when organization is missing", () => {
    expect(() => resolveOrganizationTarget(organizations, "unknown")).toThrow(
      /not found/i
    );
  });
});
