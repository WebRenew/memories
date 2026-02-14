import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-add-test-"));

import { addMemory, getMemoryById, isMemoryType, MEMORY_TYPES } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

describe("add", () => {
  beforeAll(async () => {
    await getDb();
  });

  it("should add a memory with default type", async () => {
    const memory = await addMemory("Test note content", { global: true });
    expect(memory).toBeDefined();
    expect(memory.content).toBe("Test note content");
    expect(memory.type).toBe("note");
    expect(memory.scope).toBe("global");
  });

  it("should add a rule memory", async () => {
    const memory = await addMemory("Always use semicolons", { type: "rule", global: true });
    expect(memory.type).toBe("rule");
  });

  it("should add a memory with tags", async () => {
    const memory = await addMemory("Tagged memory", {
      type: "fact",
      global: true,
      tags: ["important", "api"]
    });
    expect(memory.tags).toContain("important");
    expect(memory.tags).toContain("api");
  });

  it("should add a memory with path scoping", async () => {
    const memory = await addMemory("Only for API files", {
      type: "rule",
      global: true,
      paths: ["src/api/**"]
    });
    expect(memory.paths).toContain("src/api/**");
  });

  it("should add a memory with category", async () => {
    const memory = await addMemory("Categorized memory", {
      type: "note",
      global: true,
      category: "testing"
    });
    expect(memory.category).toBe("testing");
  });

  it("should validate memory types correctly", () => {
    expect(isMemoryType("rule")).toBe(true);
    expect(isMemoryType("decision")).toBe(true);
    expect(isMemoryType("fact")).toBe(true);
    expect(isMemoryType("note")).toBe(true);
    expect(isMemoryType("skill")).toBe(true);
    expect(isMemoryType("invalid")).toBe(false);
    expect(isMemoryType("")).toBe(false);
  });

  it("should persist the memory to the database", async () => {
    const memory = await addMemory("Persisted memory check", { type: "fact", global: true });
    const fetched = await getMemoryById(memory.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.content).toBe("Persisted memory check");
  });
});
