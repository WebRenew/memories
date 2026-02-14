import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-config-test-"));

import { initConfig, readConfig } from "../lib/config.js";
import { getDb } from "../lib/db.js";

describe("config", () => {
  const testDir = mkdtempSync(join(tmpdir(), "memories-config-cwd-"));

  beforeAll(async () => {
    await getDb();
  });

  it("should create config file on init", async () => {
    const path = await initConfig(testDir);
    expect(path).toBeTruthy();
    expect(existsSync(path)).toBe(true);
  });

  it("should read created config", async () => {
    await initConfig(testDir);
    const config = await readConfig(testDir);
    expect(config).toBeDefined();
  });

  it("should return null for missing config", async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "memories-config-empty-"));
    const config = await readConfig(emptyDir);
    expect(config).toBeNull();
  });
});
