import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Must be set before any db import
process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-edit-test-"));

import { addMemory, updateMemory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

describe("edit (updateMemory)", () => {
  beforeAll(async () => {
    await getDb();
  });

  it("should update memory content", async () => {
    const memory = await addMemory("original content", { global: true, type: "note" });
    const updated = await updateMemory(memory.id, { content: "updated content" });

    expect(updated).not.toBeNull();
    expect(updated!.content).toBe("updated content");
  });

  it("should update memory type", async () => {
    const memory = await addMemory("will become a rule", { global: true, type: "note" });
    const updated = await updateMemory(memory.id, { type: "rule" });

    expect(updated).not.toBeNull();
    expect(updated!.type).toBe("rule");
  });

  it("should update memory tags", async () => {
    const memory = await addMemory("tagged memory", { global: true, tags: ["old"] });
    const updated = await updateMemory(memory.id, { tags: ["new", "tags"] });

    expect(updated).not.toBeNull();
    expect(updated!.tags).toBe("new,tags");
  });

  it("should return null for non-existent memory", async () => {
    const updated = await updateMemory("nonexistent", { content: "nope" });
    expect(updated).toBeNull();
  });

  it("should return null for deleted memory", async () => {
    const memory = await addMemory("deleted memory", { global: true });
    const db = await getDb();
    await db.execute({
      sql: "UPDATE memories SET deleted_at = datetime('now') WHERE id = ?",
      args: [memory.id],
    });

    const updated = await updateMemory(memory.id, { content: "nope" });
    expect(updated).toBeNull();
  });

  it("should update multiple fields at once", async () => {
    const memory = await addMemory("multi update", { global: true, type: "note", tags: ["a"] });
    const updated = await updateMemory(memory.id, {
      content: "new content",
      type: "decision",
      tags: ["b", "c"],
    });

    expect(updated).not.toBeNull();
    expect(updated!.content).toBe("new content");
    expect(updated!.type).toBe("decision");
    expect(updated!.tags).toBe("b,c");
  });
});
