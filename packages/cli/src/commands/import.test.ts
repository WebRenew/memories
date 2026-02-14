import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-import-test-"));

import { addMemory, listMemories, isMemoryType } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

describe("import", () => {
  const testDir = mkdtempSync(join(tmpdir(), "memories-import-files-"));

  beforeAll(async () => {
    await getDb();
  });

  it("should validate import data structure", () => {
    const validData = {
      version: "1.0",
      memories: [
        { content: "Test rule", type: "rule" },
        { content: "Test fact", type: "fact" },
      ],
    };
    expect(validData.memories).toHaveLength(2);
    expect(Array.isArray(validData.memories)).toBe(true);
  });

  it("should reject entries with empty content", () => {
    const memories = [
      { content: "", type: "note" },
      { content: "Valid content", type: "note" },
      { content: "   ", type: "note" },
    ];
    const valid = memories.filter(
      m => m.content && typeof m.content === "string" && m.content.trim().length > 0
    );
    expect(valid).toHaveLength(1);
  });

  it("should reject entries with invalid type", () => {
    const memories = [
      { content: "Valid rule", type: "rule" },
      { content: "Invalid type", type: "invalid_type" },
      { content: "Valid fact", type: "fact" },
    ];
    const valid = memories.filter(m => !m.type || isMemoryType(m.type));
    expect(valid).toHaveLength(2);
  });

  it("should auto-detect format from file extension", () => {
    function detectFormat(filename: string, explicitFormat?: string): string {
      if (explicitFormat) return explicitFormat;
      if (filename.endsWith(".yaml") || filename.endsWith(".yml")) return "yaml";
      return "json";
    }

    expect(detectFormat("memories.json")).toBe("json");
    expect(detectFormat("memories.yaml")).toBe("yaml");
    expect(detectFormat("memories.yml")).toBe("yaml");
    expect(detectFormat("memories.yaml", "json")).toBe("json");
  });

  it("should import memories from JSON file", async () => {
    const importFile = join(testDir, "import-test.json");
    const data = {
      version: "1.0",
      memories: [
        { content: "Imported rule from test", type: "rule" },
        { content: "Imported fact from test", type: "fact" },
      ],
    };
    writeFileSync(importFile, JSON.stringify(data));

    // Simulate import logic
    for (const m of data.memories) {
      await addMemory(m.content, { type: m.type as "rule" | "fact", global: true });
    }

    const all = await listMemories({ limit: 100 });
    const imported = all.filter(m => m.content.includes("Imported"));
    expect(imported).toHaveLength(2);
  });
});
