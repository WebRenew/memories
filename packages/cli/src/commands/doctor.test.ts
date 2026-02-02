import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Must be set before any db import
process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-doctor-test-"));

import { addMemory, forgetMemory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

describe("doctor checks", () => {
  beforeAll(async () => {
    await getDb();
  });

  it("should detect database connection", async () => {
    const db = await getDb();
    const result = await db.execute("SELECT 1 as ok");
    expect(Number(result.rows[0]?.ok)).toBe(1);
  });

  it("should pass integrity check on fresh DB", async () => {
    const db = await getDb();
    const result = await db.execute("PRAGMA integrity_check");
    expect(String(result.rows[0]?.integrity_check)).toBe("ok");
  });

  it("should add FTS entries when adding memories", async () => {
    const db = await getDb();
    const before = await db.execute("SELECT COUNT(*) as count FROM memories_fts");
    const beforeCount = Number(before.rows[0]?.count);

    await addMemory("doctor test rule", { global: true, type: "rule" });
    await addMemory("doctor test fact", { global: true, type: "fact" });

    const after = await db.execute("SELECT COUNT(*) as count FROM memories_fts");
    const afterCount = Number(after.rows[0]?.count);

    expect(afterCount).toBe(beforeCount + 2);
  });

  it("should count soft-deleted records", async () => {
    const memory = await addMemory("will be deleted", { global: true });
    await forgetMemory(memory.id);

    const db = await getDb();
    const result = await db.execute(
      "SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NOT NULL",
    );
    expect(Number(result.rows[0]?.count)).toBeGreaterThan(0);
  });
});
