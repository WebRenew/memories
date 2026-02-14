import { describe, it, expect } from "vitest";
import {
  parseSetupMode,
  parseSetupScope,
  isPersonalWorkspaceTarget,
  resolveWorkspaceTarget,
  type SetupOrganization,
} from "./init-helpers.js";

describe("init", () => {
  it("should parse setup mode correctly", () => {
    expect(parseSetupMode(undefined)).toBe("auto");
    expect(parseSetupMode("auto")).toBe("auto");
    expect(parseSetupMode("local")).toBe("local");
    expect(parseSetupMode("cloud")).toBe("cloud");
    expect(parseSetupMode("  Cloud  ")).toBe("cloud");
  });

  it("should throw on invalid setup mode", () => {
    expect(() => parseSetupMode("invalid")).toThrow("Invalid setup mode");
  });

  it("should parse setup scope correctly", () => {
    expect(parseSetupScope(undefined)).toBe("auto");
    expect(parseSetupScope("project")).toBe("project");
    expect(parseSetupScope("global")).toBe("global");
    expect(parseSetupScope("  Project  ")).toBe("project");
  });

  it("should throw on invalid setup scope", () => {
    expect(() => parseSetupScope("bad")).toThrow("Invalid scope");
  });

  it("should detect personal workspace target", () => {
    expect(isPersonalWorkspaceTarget("personal")).toBe(true);
    expect(isPersonalWorkspaceTarget("Personal")).toBe(true);
    expect(isPersonalWorkspaceTarget("none")).toBe(true);
    expect(isPersonalWorkspaceTarget("my-org")).toBe(false);
  });

  it("should resolve workspace target to personal", () => {
    const result = resolveWorkspaceTarget([], "personal");
    expect(result.orgId).toBeNull();
    expect(result.label).toBe("Personal workspace");
  });

  it("should resolve workspace target by slug", () => {
    const orgs: SetupOrganization[] = [
      { id: "org-1", name: "My Org", slug: "my-org", role: "owner" },
    ];
    const result = resolveWorkspaceTarget(orgs, "my-org");
    expect(result.orgId).toBe("org-1");
    expect(result.label).toContain("My Org");
  });

  it("should throw for unresolvable workspace target", () => {
    expect(() => resolveWorkspaceTarget([], "nonexistent")).toThrow("not found");
  });
});
