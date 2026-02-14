import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-export-test-"));

import { addMemory, listMemories } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

describe("export", () => {
  beforeAll(async () => {
    await getDb();
    await addMemory("Export rule 1", { type: "rule", global: true, tags: ["test"] });
    await addMemory("Export fact 1", { type: "fact", global: true });
    await addMemory("Export note 1", { type: "note", global: true });
  });

  it("should export memories as JSON structure", async () => {
    const memories = await listMemories({ limit: 10000 });

    const exportData = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      project_id: null,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        tags: m.tags ? m.tags.split(",") : [],
        scope: m.scope,
        created_at: m.created_at,
      })),
    };

    expect(exportData.version).toBe("1.0");
    expect(exportData.memories.length).toBe(3);

    const rule = exportData.memories.find(m => m.type === "rule");
    expect(rule).toBeDefined();
    expect(rule!.tags).toContain("test");
  });

  it("should filter export by type", async () => {
    const facts = await listMemories({ limit: 10000, types: ["fact"] });
    expect(facts.length).toBe(1);
    expect(facts[0].type).toBe("fact");
  });

  it("should filter export by global-only", async () => {
    const global = await listMemories({ limit: 10000, globalOnly: true });
    expect(global.length).toBe(3);
    for (const m of global) {
      expect(m.scope).toBe("global");
    }
  });

  it("should serialize export data as valid JSON", async () => {
    const memories = await listMemories({ limit: 10 });
    const exportData = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      project_id: null,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        tags: m.tags ? m.tags.split(",") : [],
        scope: m.scope,
        created_at: m.created_at,
      })),
    };
    const json = JSON.stringify(exportData, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("1.0");
    expect(parsed.memories).toHaveLength(memories.length);
  });
});
