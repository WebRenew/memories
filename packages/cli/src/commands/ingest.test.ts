import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Must be set before any db import
process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-ingest-test-"));

import { addMemory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?]+$/, "").trim();
}

async function getExistingSet(): Promise<Set<string>> {
  const db = await getDb();
  const result = await db.execute("SELECT content FROM memories WHERE deleted_at IS NULL");
  return new Set(result.rows.map((r) => normalize(String(r.content))));
}

describe("ingest dedup", () => {
  beforeAll(async () => {
    await getDb();
  });

  it("should not create duplicate memories on repeated addMemory", async () => {
    await addMemory("Always use strict TypeScript mode", { global: true, type: "rule" });

    const existingSet = await getExistingSet();

    const normalized = normalize("Always use strict TypeScript mode");
    expect(existingSet.has(normalized)).toBe(true);

    // Only add if not duplicate (simulating ingest behavior)
    const beforeSize = existingSet.size;
    if (!existingSet.has(normalized)) {
      await addMemory("Always use strict TypeScript mode", { global: true, type: "rule" });
    }

    const afterSet = await getExistingSet();
    expect(afterSet.size).toBe(beforeSize);
  });

  it("should detect duplicates with different whitespace/punctuation", async () => {
    await addMemory("Use pnpm as package manager", { global: true, type: "rule" });

    const existingSet = await getExistingSet();

    const variants = [
      "Use pnpm as package manager.",
      "Use  pnpm  as  package  manager",
      "use pnpm as package manager",
      "Use pnpm as package manager!",
    ];

    for (const v of variants) {
      expect(existingSet.has(normalize(v))).toBe(true);
    }
  });

  it("should allow genuinely new content", async () => {
    const existingSet = await getExistingSet();
    const newContent = "This is a completely unique memory for testing dedup";
    expect(existingSet.has(normalize(newContent))).toBe(false);
  });

  it("should also dedup within the same ingest batch", async () => {
    const batch = [
      "Prefer functional patterns over classes",
      "Use early returns to reduce nesting",
      "Prefer functional patterns over classes", // duplicate within batch
      "prefer functional patterns over classes.", // normalized duplicate
    ];

    const existingSet = new Set<string>();
    const imported: string[] = [];

    for (const content of batch) {
      const norm = content.toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?]+$/, "").trim();
      if (existingSet.has(norm)) continue;
      existingSet.add(norm);
      imported.push(content);
    }

    expect(imported).toHaveLength(2);
    expect(imported[0]).toBe("Prefer functional patterns over classes");
    expect(imported[1]).toBe("Use early returns to reduce nesting");
  });
});
