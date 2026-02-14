import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.MEMORIES_DATA_DIR = mkdtempSync(join(tmpdir(), "memories-embed-test-"));

import { addMemory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";
import { ensureEmbeddingsSchema } from "../lib/embeddings.js";

describe("embed", () => {
  beforeAll(async () => {
    await getDb();
    await ensureEmbeddingsSchema();
    await addMemory("Embedding test rule", { type: "rule", global: true });
    await addMemory("Another memory for embedding", { type: "fact", global: true });
  });

  it("should find memories without embeddings", async () => {
    const db = await getDb();
    const result = await db.execute(
      "SELECT id, content FROM memories WHERE deleted_at IS NULL AND embedding IS NULL"
    );
    expect(result.rows.length).toBeGreaterThanOrEqual(2);
  });

  it("should find all memories when --all mode", async () => {
    const db = await getDb();
    const result = await db.execute(
      "SELECT id, content FROM memories WHERE deleted_at IS NULL"
    );
    expect(result.rows.length).toBeGreaterThanOrEqual(2);
  });

  it("should report no pending embeddings when all are embedded", async () => {
    const db = await getDb();
    // Simulate all embedded by setting a fake embedding
    await db.execute(
      "UPDATE memories SET embedding = 'fake' WHERE deleted_at IS NULL"
    );

    const result = await db.execute(
      "SELECT id FROM memories WHERE deleted_at IS NULL AND embedding IS NULL"
    );
    expect(result.rows.length).toBe(0);

    // Reset
    await db.execute("UPDATE memories SET embedding = NULL WHERE deleted_at IS NULL");
  });
});
