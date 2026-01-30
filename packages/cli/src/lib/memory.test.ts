import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Use a temp directory so tests never hit sync
process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-test-"));

import { addMemory, searchMemories, listMemories, forgetMemory } from "./memory.js";

describe("memory", () => {
  it("should add a memory", async () => {
    const memory = await addMemory("test memory content", {
      tags: ["test", "smoke"],
    });
    expect(memory.id).toBeDefined();
    expect(memory.content).toBe("test memory content");
    expect(memory.tags).toBe("test,smoke");
  });

  it("should search memories by content", async () => {
    await addMemory("searchable unique phrase");
    const results = await searchMemories("searchable unique");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain("searchable unique");
  });

  it("should list memories", async () => {
    const results = await listMemories();
    expect(results.length).toBeGreaterThan(0);
  });

  it("should list memories filtered by tags", async () => {
    await addMemory("tagged item", { tags: ["filtertest"] });
    const results = await listMemories({ tags: ["filtertest"] });
    expect(results.length).toBeGreaterThan(0);
  });

  it("should soft-delete a memory", async () => {
    const memory = await addMemory("to be forgotten");
    const deleted = await forgetMemory(memory.id);
    expect(deleted).toBe(true);

    const results = await searchMemories("to be forgotten");
    expect(results.length).toBe(0);
  });

  it("should return false when forgetting non-existent id", async () => {
    const deleted = await forgetMemory("nonexistent");
    expect(deleted).toBe(false);
  });
});
