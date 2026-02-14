import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-list-test-"));

import { addMemory, listMemories, type MemoryType } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

describe("list", () => {
  beforeAll(async () => {
    await getDb();
    await addMemory("Rule one", { type: "rule", global: true });
    await addMemory("Decision one", { type: "decision", global: true });
    await addMemory("Fact one", { type: "fact", global: true, tags: ["api"] });
    await addMemory("Note one", { type: "note", global: true, tags: ["api", "testing"] });
  });

  it("should list all memories", async () => {
    const memories = await listMemories({ limit: 50 });
    expect(memories.length).toBe(4);
  });

  it("should filter by type", async () => {
    const rules = await listMemories({ limit: 50, types: ["rule"] });
    expect(rules.length).toBe(1);
    expect(rules[0].type).toBe("rule");
  });

  it("should filter by tags", async () => {
    const tagged = await listMemories({ limit: 50, tags: ["api"] });
    expect(tagged.length).toBe(2);
  });

  it("should respect limit", async () => {
    const limited = await listMemories({ limit: 2 });
    expect(limited.length).toBe(2);
  });

  it("should filter global-only memories", async () => {
    const global = await listMemories({ limit: 50, globalOnly: true });
    expect(global.length).toBe(4);
    for (const m of global) {
      expect(m.scope).toBe("global");
    }
  });
});
