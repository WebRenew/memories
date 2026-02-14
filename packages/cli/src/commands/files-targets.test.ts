import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  SYNC_TARGETS,
  OPTIONAL_CONFIG_TARGETS,
  getSyncTargets,
  listOptionalConfigPaths,
  OPTIONAL_CONFIG_PATHS,
  OPTIONAL_CONFIG_INTEGRATIONS,
} from "./files-targets.js";

describe("files-targets", () => {
  it("should include expected tool directories", () => {
    const dirs = SYNC_TARGETS.map((t) => t.dir);
    expect(dirs).toContain(".claude");
    expect(dirs).toContain(".cursor");
    expect(dirs).toContain(".agents");
  });

  it("should have files or pattern defined for each target", () => {
    for (const target of SYNC_TARGETS) {
      const hasFiles = Array.isArray(target.files) && target.files.length > 0;
      const hasPattern = target.pattern instanceof RegExp;
      expect(hasFiles || hasPattern).toBe(true);
    }
  });

  it("should exclude optional config targets when includeConfig is false", () => {
    const targets = getSyncTargets(false);
    const dirs = targets.map((t) => t.dir);
    for (const optional of OPTIONAL_CONFIG_TARGETS) {
      expect(dirs).not.toContain(optional.dir);
    }
  });

  it("should include optional config targets when includeConfig is true", () => {
    const targets = getSyncTargets(true);
    const dirs = targets.map((t) => t.dir);
    for (const optional of OPTIONAL_CONFIG_TARGETS) {
      expect(dirs).toContain(optional.dir);
    }
  });

  it("should list optional config paths matching OPTIONAL_CONFIG_PATHS", () => {
    const paths = listOptionalConfigPaths();
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(OPTIONAL_CONFIG_PATHS.has(p)).toBe(true);
    }
    expect(paths.length).toBe(OPTIONAL_CONFIG_PATHS.size);
  });

  it("should map known optional config paths to integration names", () => {
    expect(OPTIONAL_CONFIG_INTEGRATIONS.get(join(".config/opencode", "opencode.json"))).toBe("opencode");
    expect(OPTIONAL_CONFIG_INTEGRATIONS.get(join(".openclaw", "openclaw.json"))).toBe("openclaw");
  });
});
