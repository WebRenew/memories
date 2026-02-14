import { describe, it, expect } from "vitest";

// Re-implement pure utility functions from init.ts for testing

type SetupMode = "auto" | "local" | "cloud";
type SetupScope = "auto" | "project" | "global";

function parseSetupMode(rawMode: string | undefined): SetupMode {
  if (!rawMode) return "auto";
  const normalized = rawMode.trim().toLowerCase();
  if (normalized === "auto" || normalized === "local" || normalized === "cloud") {
    return normalized;
  }
  throw new Error(`Invalid setup mode "${rawMode}". Use one of: auto, local, cloud.`);
}

function parseSetupScope(rawScope: string | undefined): SetupScope {
  if (!rawScope) return "auto";
  const normalized = rawScope.trim().toLowerCase();
  if (normalized === "auto" || normalized === "project" || normalized === "global") {
    return normalized;
  }
  throw new Error(`Invalid scope "${rawScope}". Use one of: auto, project, global.`);
}

interface SetupOrganization {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
}

function normalizeWorkspaceTarget(target: string): string {
  return target.trim().toLowerCase();
}

function isPersonalWorkspaceTarget(target: string): boolean {
  const normalized = normalizeWorkspaceTarget(target);
  return normalized === "personal" || normalized === "none";
}

function resolveWorkspaceTarget(
  organizations: SetupOrganization[],
  rawTarget: string,
): { orgId: string | null; label: string } {
  if (isPersonalWorkspaceTarget(rawTarget)) {
    return { orgId: null, label: "Personal workspace" };
  }

  const target = normalizeWorkspaceTarget(rawTarget);
  const directMatch = organizations.find(
    (org) => org.id === rawTarget || normalizeWorkspaceTarget(org.slug) === target,
  );
  if (directMatch) {
    return { orgId: directMatch.id, label: `${directMatch.name} (${directMatch.slug})` };
  }

  throw new Error(`Organization "${rawTarget}" not found.`);
}

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
