import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Must be set before any db import
process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-stats-test-"));

import { addMemory, forgetMemory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

describe("stats queries", () => {
  beforeAll(async () => {
    await getDb();
  });

  it("should count memories by type and scope", async () => {
    await addMemory("rule 1", { global: true, type: "rule" });
    await addMemory("rule 2", { global: true, type: "rule" });
    await addMemory("decision 1", { global: true, type: "decision" });
    await addMemory("fact 1", { projectId: "github.com/test/stats", type: "fact" });

    const db = await getDb();
    const result = await db.execute({
      sql: "SELECT type, scope, COUNT(*) as count FROM memories WHERE deleted_at IS NULL GROUP BY type, scope ORDER BY type, scope",
      args: [],
    });

    const rows = result.rows as unknown as { type: string; scope: string; count: number }[];
    expect(rows.length).toBeGreaterThan(0);

    const ruleGlobal = rows.find((r) => r.type === "rule" && r.scope === "global");
    expect(Number(ruleGlobal?.count)).toBeGreaterThanOrEqual(2);
  });

  it("should count total active memories", async () => {
    const db = await getDb();
    const result = await db.execute({
      sql: "SELECT COUNT(*) as total FROM memories WHERE deleted_at IS NULL",
      args: [],
    });
    expect(Number(result.rows[0]?.total)).toBeGreaterThan(0);
  });

  it("should count soft-deleted separately", async () => {
    const memory = await addMemory("to delete for stats", { global: true });
    await forgetMemory(memory.id);

    const db = await getDb();
    const result = await db.execute({
      sql: "SELECT COUNT(*) as deleted FROM memories WHERE deleted_at IS NOT NULL",
      args: [],
    });
    expect(Number(result.rows[0]?.deleted)).toBeGreaterThan(0);
  });
});
