import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-link-test-"));

import { addMemory, getMemoryById } from "../lib/memory.js";
import { getDb } from "../lib/db.js";
import { nanoid } from "nanoid";

async function ensureLinksTable(): Promise<void> {
  const db = await getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS memory_links (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      link_type TEXT NOT NULL DEFAULT 'related',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_links_source ON memory_links(source_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_links_target ON memory_links(target_id)`);
}

describe("link", () => {
  let ruleId: string;
  let factId: string;
  let noteId: string;

  beforeAll(async () => {
    await getDb();
    await ensureLinksTable();
    const rule = await addMemory("Use TypeScript strict mode", { type: "rule", global: true });
    ruleId = rule.id;
    const fact = await addMemory("API limit is 100/min", { type: "fact", global: true });
    factId = fact.id;
    const note = await addMemory("Discussed in standup", { type: "note", global: true });
    noteId = note.id;
  });

  it("should create a link between two memories", async () => {
    const db = await getDb();
    const linkId = nanoid(12);
    await db.execute({
      sql: "INSERT INTO memory_links (id, source_id, target_id, link_type) VALUES (?, ?, ?, ?)",
      args: [linkId, ruleId, factId, "related"],
    });

    const result = await db.execute({
      sql: "SELECT * FROM memory_links WHERE source_id = ? AND target_id = ?",
      args: [ruleId, factId],
    });
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].link_type).toBe("related");
  });

  it("should detect existing links", async () => {
    const db = await getDb();
    const existing = await db.execute({
      sql: `SELECT id FROM memory_links WHERE
            (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)`,
      args: [ruleId, factId, factId, ruleId],
    });
    expect(existing.rows.length).toBeGreaterThan(0);
  });

  it("should support different link types", async () => {
    const db = await getDb();
    const linkId = nanoid(12);
    await db.execute({
      sql: "INSERT INTO memory_links (id, source_id, target_id, link_type) VALUES (?, ?, ?, ?)",
      args: [linkId, ruleId, noteId, "supports"],
    });

    const result = await db.execute({
      sql: "SELECT link_type FROM memory_links WHERE source_id = ? AND target_id = ?",
      args: [ruleId, noteId],
    });
    expect(result.rows[0].link_type).toBe("supports");
  });

  it("should delete a link between memories", async () => {
    const db = await getDb();
    const result = await db.execute({
      sql: `DELETE FROM memory_links WHERE
            (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)`,
      args: [ruleId, factId, factId, ruleId],
    });
    expect(result.rowsAffected).toBeGreaterThan(0);
  });
});
