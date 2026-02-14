import { describe, it, expect } from "vitest";
import {
  parseSetupMode,
  parseSetupScope,
  normalizeWorkspaceTarget,
  isPersonalWorkspaceTarget,
  resolveWorkspaceTarget,
  workspaceLabel,
  selectedTool,
  type SetupOrganization,
} from "./init-helpers.js";

const ORG_A: SetupOrganization = { id: "org-a", name: "Acme", slug: "acme", role: "owner" };
const ORG_B: SetupOrganization = { id: "org-b", name: "Beta Co", slug: "beta-co", role: "member" };
const ORG_C: SetupOrganization = { id: "org-c", name: "Acme", slug: "acme-two", role: "admin" };

describe("init-helpers", () => {
  describe("parseSetupMode", () => {
    it("should return auto for undefined", () => {
      expect(parseSetupMode(undefined)).toBe("auto");
    });

    it("should accept valid modes", () => {
      expect(parseSetupMode("auto")).toBe("auto");
      expect(parseSetupMode("local")).toBe("local");
      expect(parseSetupMode("cloud")).toBe("cloud");
    });

    it("should be case-insensitive", () => {
      expect(parseSetupMode("  Cloud  ")).toBe("cloud");
      expect(parseSetupMode("LOCAL")).toBe("local");
    });

    it("should throw on invalid mode", () => {
      expect(() => parseSetupMode("invalid")).toThrow("Invalid setup mode");
    });
  });

  describe("parseSetupScope", () => {
    it("should return auto for undefined", () => {
      expect(parseSetupScope(undefined)).toBe("auto");
    });

    it("should accept valid scopes", () => {
      expect(parseSetupScope("auto")).toBe("auto");
      expect(parseSetupScope("project")).toBe("project");
      expect(parseSetupScope("global")).toBe("global");
    });

    it("should throw on invalid scope", () => {
      expect(() => parseSetupScope("bad")).toThrow("Invalid scope");
    });
  });

  describe("normalizeWorkspaceTarget", () => {
    it("should trim and lowercase", () => {
      expect(normalizeWorkspaceTarget("  My-Org  ")).toBe("my-org");
    });
  });

  describe("isPersonalWorkspaceTarget", () => {
    it("should return true for personal/none", () => {
      expect(isPersonalWorkspaceTarget("personal")).toBe(true);
      expect(isPersonalWorkspaceTarget("Personal")).toBe(true);
      expect(isPersonalWorkspaceTarget("none")).toBe(true);
    });

    it("should return false for other values", () => {
      expect(isPersonalWorkspaceTarget("my-org")).toBe(false);
      expect(isPersonalWorkspaceTarget("")).toBe(false);
    });
  });

  describe("resolveWorkspaceTarget", () => {
    it("should resolve by slug", () => {
      const result = resolveWorkspaceTarget([ORG_A, ORG_B], "acme");
      expect(result.orgId).toBe("org-a");
      expect(result.label).toContain("Acme");
    });

    it("should resolve by id", () => {
      const result = resolveWorkspaceTarget([ORG_A], "org-a");
      expect(result.orgId).toBe("org-a");
    });

    it("should resolve by exact name when unique", () => {
      const result = resolveWorkspaceTarget([ORG_B], "Beta Co");
      expect(result.orgId).toBe("org-b");
    });

    it("should resolve by prefix match when unique", () => {
      const result = resolveWorkspaceTarget([ORG_B], "beta");
      expect(result.orgId).toBe("org-b");
    });

    it("should throw for ambiguous name match", () => {
      // Both orgs share name "Acme" but neither slug matches "Acme Corp"
      const ORG_X: SetupOrganization = { id: "org-x", name: "Acme Corp", slug: "acme-alpha", role: "owner" };
      const ORG_Y: SetupOrganization = { id: "org-y", name: "Acme Corp", slug: "acme-beta", role: "member" };
      expect(() => resolveWorkspaceTarget([ORG_X, ORG_Y], "Acme Corp")).toThrow("Multiple organizations");
    });

    it("should throw when not found", () => {
      expect(() => resolveWorkspaceTarget([ORG_A], "nonexistent")).toThrow("not found");
    });

    it("should resolve personal target", () => {
      const result = resolveWorkspaceTarget([], "personal");
      expect(result.orgId).toBeNull();
      expect(result.label).toBe("Personal workspace");
    });
  });

  describe("workspaceLabel", () => {
    it("should return Personal workspace for null orgId", () => {
      expect(workspaceLabel([], null)).toBe("Personal workspace");
    });

    it("should return formatted label for known org", () => {
      const label = workspaceLabel([ORG_A], "org-a");
      expect(label).toBe("Acme (acme)");
    });

    it("should return fallback for unknown org id", () => {
      const label = workspaceLabel([], "org-unknown");
      expect(label).toContain("org-unknown");
    });
  });

  describe("selectedTool", () => {
    it("should return DetectedTool with all false defaults", () => {
      const tool = { name: "test-tool" } as Parameters<typeof selectedTool>[0];
      const result = selectedTool(tool);
      expect(result.tool.name).toBe("test-tool");
      expect(result.hasConfig).toBe(false);
      expect(result.hasMcp).toBe(false);
      expect(result.hasInstructions).toBe(false);
      expect(result.globalConfig).toBe(false);
    });
  });
});
