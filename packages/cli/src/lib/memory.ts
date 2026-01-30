import { nanoid } from "nanoid";
import { getDb } from "./db.js";

export interface Memory {
  id: string;
  content: string;
  tags: string | null;
  project: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function addMemory(
  content: string,
  opts?: { tags?: string[]; project?: string }
): Promise<Memory> {
  const db = await getDb();
  const id = nanoid(12);
  const tags = opts?.tags?.length ? opts.tags.join(",") : null;
  const project = opts?.project ?? null;

  await db.execute({
    sql: `INSERT INTO memories (id, content, tags, project) VALUES (?, ?, ?, ?)`,
    args: [id, content, tags, project],
  });

  const result = await db.execute({
    sql: `SELECT * FROM memories WHERE id = ?`,
    args: [id],
  });

  return result.rows[0] as unknown as Memory;
}

export async function searchMemories(
  query: string,
  opts?: { limit?: number }
): Promise<Memory[]> {
  const db = await getDb();
  const limit = opts?.limit ?? 20;

  const result = await db.execute({
    sql: `SELECT * FROM memories WHERE deleted_at IS NULL AND content LIKE ? ORDER BY created_at DESC LIMIT ?`,
    args: [`%${query}%`, limit],
  });

  return result.rows as unknown as Memory[];
}

export async function listMemories(
  opts?: { limit?: number; tags?: string[] }
): Promise<Memory[]> {
  const db = await getDb();
  const limit = opts?.limit ?? 50;

  if (opts?.tags?.length) {
    const clauses = opts.tags.map(() => `tags LIKE ?`).join(" OR ");
    const args = [
      ...opts.tags.map((t) => `%${t}%`),
      limit,
    ];
    const result = await db.execute({
      sql: `SELECT * FROM memories WHERE deleted_at IS NULL AND (${clauses}) ORDER BY created_at DESC LIMIT ?`,
      args,
    });
    return result.rows as unknown as Memory[];
  }

  const result = await db.execute({
    sql: `SELECT * FROM memories WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows as unknown as Memory[];
}

export async function forgetMemory(id: string): Promise<boolean> {
  const db = await getDb();

  // Check if memory exists and is not already deleted
  const existing = await db.execute({
    sql: `SELECT id FROM memories WHERE id = ? AND deleted_at IS NULL`,
    args: [id],
  });

  if (existing.rows.length === 0) return false;

  await db.execute({
    sql: `UPDATE memories SET deleted_at = datetime('now') WHERE id = ?`,
    args: [id],
  });

  return true;
}
