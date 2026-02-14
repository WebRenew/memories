import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-files-test-"));

import { getDb } from "../lib/db.js";
import { nanoid } from "nanoid";

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

describe("files", () => {
  beforeAll(async () => {
    const db = await getDb();
    // Ensure files table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        content TEXT NOT NULL,
        hash TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'global',
        source TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);
  });

  it("should hash content consistently", () => {
    const content = "test file content";
    const hash1 = hashContent(content);
    const hash2 = hashContent(content);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16);
  });

  it("should produce different hashes for different content", () => {
    const hash1 = hashContent("content A");
    const hash2 = hashContent("content B");
    expect(hash1).not.toBe(hash2);
  });

  it("should insert a file record", async () => {
    const db = await getDb();
    const id = nanoid(12);
    const content = "# Test File\nSome config content";
    const hash = hashContent(content);

    await db.execute({
      sql: "INSERT INTO files (id, path, content, hash, scope, source) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, ".claude/CLAUDE.md", content, hash, "global", "Claude"],
    });

    const result = await db.execute({
      sql: "SELECT * FROM files WHERE id = ?",
      args: [id],
    });
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].path).toBe(".claude/CLAUDE.md");
    expect(result.rows[0].source).toBe("Claude");
  });

  it("should skip unchanged files on re-ingest", async () => {
    const db = await getDb();
    const content = "unchanged content";
    const hash = hashContent(content);

    const id = nanoid(12);
    await db.execute({
      sql: "INSERT INTO files (id, path, content, hash, scope) VALUES (?, ?, ?, ?, ?)",
      args: [id, ".cursor/rules.md", content, hash, "global"],
    });

    // Check if existing hash matches
    const existing = await db.execute({
      sql: "SELECT id, hash FROM files WHERE path = ? AND scope = ? AND deleted_at IS NULL",
      args: [".cursor/rules.md", "global"],
    });
    expect(existing.rows.length).toBe(1);
    expect(existing.rows[0].hash).toBe(hash);
  });

  it("should soft-delete a file", async () => {
    const db = await getDb();
    const id = nanoid(12);
    await db.execute({
      sql: "INSERT INTO files (id, path, content, hash, scope) VALUES (?, ?, ?, ?, ?)",
      args: [id, ".windsurf/rules.md", "windsurf content", hashContent("windsurf content"), "global"],
    });

    await db.execute({
      sql: "UPDATE files SET deleted_at = datetime('now') WHERE path = ? AND deleted_at IS NULL",
      args: [".windsurf/rules.md"],
    });

    const result = await db.execute({
      sql: "SELECT * FROM files WHERE path = ? AND deleted_at IS NULL",
      args: [".windsurf/rules.md"],
    });
    expect(result.rows.length).toBe(0);
  });
});
