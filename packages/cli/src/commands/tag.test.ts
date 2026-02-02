import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-tag-test-"));

import { addMemory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";
import type { Memory } from "../lib/memory.js";

async function getMemory(id: string): Promise<Memory> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM memories WHERE id = ?", args: [id] });
  return result.rows[0] as unknown as Memory;
}

function parseTags(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(",").map((t) => t.trim()).filter(Boolean));
}

describe("tag", () => {
  let ruleId: string;
  let factId: string;

  beforeAll(async () => {
    await getDb();
    const rule = await addMemory("Always use strict mode", { type: "rule", global: true, tags: ["typescript"] });
    ruleId = rule.id;
    const fact = await addMemory("API rate limit is 100/min", { type: "fact", global: true });
    factId = fact.id;
  });

  it("should add a tag to memories", async () => {
    const db = await getDb();
    // Add "important" tag to all memories
    const result = await db.execute("SELECT id, tags FROM memories WHERE deleted_at IS NULL");
    let updated = 0;
    for (const row of result.rows) {
      const existing = parseTags(row.tags as string | null);
      if (existing.has("important")) continue;
      existing.add("important");
      await db.execute({
        sql: "UPDATE memories SET tags = ?, updated_at = datetime('now') WHERE id = ?",
        args: [[...existing].join(","), row.id as string],
      });
      updated++;
    }
    expect(updated).toBe(2);

    const rule = await getMemory(ruleId);
    expect(parseTags(rule.tags).has("important")).toBe(true);
    expect(parseTags(rule.tags).has("typescript")).toBe(true);

    const fact = await getMemory(factId);
    expect(parseTags(fact.tags).has("important")).toBe(true);
  });

  it("should skip memories that already have the tag", async () => {
    const db = await getDb();
    const result = await db.execute("SELECT id, tags FROM memories WHERE deleted_at IS NULL");
    let skipped = 0;
    for (const row of result.rows) {
      const existing = parseTags(row.tags as string | null);
      if (existing.has("important")) {
        skipped++;
        continue;
      }
    }
    expect(skipped).toBe(2); // Both already have "important" from previous test
  });

  it("should remove a tag from memories", async () => {
    const db = await getDb();
    // Remove "important" from all
    const result = await db.execute({
      sql: "SELECT id, tags FROM memories WHERE deleted_at IS NULL AND tags LIKE ?",
      args: ["%important%"],
    });
    let updated = 0;
    for (const row of result.rows) {
      const existing = parseTags(row.tags as string | null);
      if (!existing.has("important")) continue;
      existing.delete("important");
      const newTags = existing.size > 0 ? [...existing].join(",") : null;
      await db.execute({
        sql: "UPDATE memories SET tags = ?, updated_at = datetime('now') WHERE id = ?",
        args: [newTags, row.id as string],
      });
      updated++;
    }
    expect(updated).toBe(2);

    const rule = await getMemory(ruleId);
    expect(parseTags(rule.tags).has("important")).toBe(false);
    expect(parseTags(rule.tags).has("typescript")).toBe(true); // preserved

    const fact = await getMemory(factId);
    expect(fact.tags).toBeNull(); // no tags left
  });

  it("should count tags correctly", async () => {
    const db = await getDb();
    // Add another memory with typescript tag
    await addMemory("Use TypeScript enums sparingly", { type: "rule", global: true, tags: ["typescript"] });

    const result = await db.execute(
      "SELECT tags FROM memories WHERE deleted_at IS NULL AND tags IS NOT NULL AND tags != ''"
    );
    const counts = new Map<string, number>();
    for (const row of result.rows) {
      for (const tag of parseTags(row.tags as string)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    expect(counts.get("typescript")).toBe(2);
  });

  it("should filter by type when adding tags", async () => {
    const db = await getDb();
    // Add "reviewed" only to facts
    const result = await db.execute("SELECT id, tags FROM memories WHERE deleted_at IS NULL AND type = 'fact'");
    let updated = 0;
    for (const row of result.rows) {
      const existing = parseTags(row.tags as string | null);
      existing.add("reviewed");
      await db.execute({
        sql: "UPDATE memories SET tags = ?, updated_at = datetime('now') WHERE id = ?",
        args: [[...existing].join(","), row.id as string],
      });
      updated++;
    }
    expect(updated).toBe(1); // only 1 fact

    const fact = await getMemory(factId);
    expect(parseTags(fact.tags).has("reviewed")).toBe(true);

    // Rules should not have "reviewed"
    const rule = await getMemory(ruleId);
    expect(parseTags(rule.tags).has("reviewed")).toBe(false);
  });
});
