import { createClient } from "@libsql/client"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { removeMemoryGraphMapping, syncMemoryGraphMapping } from "./upsert"

type DbClient = ReturnType<typeof createClient>

let db: DbClient

async function scalarCount(turso: DbClient, sql: string, args: (string | number | null)[] = []): Promise<number> {
  const result = await turso.execute({ sql, args })
  return Number(result.rows[0]?.count ?? 0)
}

describe("syncMemoryGraphMapping", () => {
  beforeAll(() => {
    const dbDir = mkdtempSync(join(tmpdir(), "memories-graph-upsert-test-"))
    db = createClient({ url: `file:${join(dbDir, "graph.db")}` })
  })

  afterAll(() => {
    db.close()
  })

  it("is idempotent for repeated sync of the same memory", async () => {
    const input = {
      id: "mem-graph-1",
      type: "decision",
      layer: "long_term" as const,
      expiresAt: null,
      projectId: "github.com/webrenew/memories",
      userId: "user-a",
      tags: ["auth", "mcp"],
      category: "architecture",
    }

    await syncMemoryGraphMapping(db, input)

    const first = {
      nodes: await scalarCount(db, "SELECT COUNT(*) as count FROM graph_nodes"),
      edges: await scalarCount(db, "SELECT COUNT(*) as count FROM graph_edges"),
      links: await scalarCount(db, "SELECT COUNT(*) as count FROM memory_node_links"),
    }

    await syncMemoryGraphMapping(db, input)

    const second = {
      nodes: await scalarCount(db, "SELECT COUNT(*) as count FROM graph_nodes"),
      edges: await scalarCount(db, "SELECT COUNT(*) as count FROM graph_edges"),
      links: await scalarCount(db, "SELECT COUNT(*) as count FROM memory_node_links"),
    }

    expect(second).toEqual(first)
    expect(first.nodes).toBeGreaterThan(0)
    expect(first.edges).toBeGreaterThan(0)
    expect(first.links).toBeGreaterThan(0)
  })

  it("replaces stale edges/links on edit and removes mappings on forget", async () => {
    await syncMemoryGraphMapping(db, {
      id: "mem-graph-2",
      type: "fact",
      layer: "working",
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      projectId: "github.com/webrenew/memories",
      userId: "user-b",
      tags: ["billing", "limits"],
      category: "ops",
    })

    const billingLinkCount = await scalarCount(
      db,
      `SELECT COUNT(*) as count
       FROM memory_node_links l
       JOIN graph_nodes n ON n.id = l.node_id
       WHERE l.memory_id = ? AND n.node_type = 'topic' AND n.node_key = 'billing'`,
      ["mem-graph-2"]
    )
    expect(billingLinkCount).toBe(1)

    await syncMemoryGraphMapping(db, {
      id: "mem-graph-2",
      type: "fact",
      layer: "long_term",
      expiresAt: null,
      projectId: "github.com/webrenew/memories",
      userId: "user-b",
      tags: ["migrations"],
      category: "ops",
    })

    const staleBillingLinkCount = await scalarCount(
      db,
      `SELECT COUNT(*) as count
       FROM memory_node_links l
       JOIN graph_nodes n ON n.id = l.node_id
       WHERE l.memory_id = ? AND n.node_type = 'topic' AND n.node_key = 'billing'`,
      ["mem-graph-2"]
    )
    const migrationsLinkCount = await scalarCount(
      db,
      `SELECT COUNT(*) as count
       FROM memory_node_links l
       JOIN graph_nodes n ON n.id = l.node_id
       WHERE l.memory_id = ? AND n.node_type = 'topic' AND n.node_key = 'migrations'`,
      ["mem-graph-2"]
    )
    expect(staleBillingLinkCount).toBe(0)
    expect(migrationsLinkCount).toBe(1)

    await removeMemoryGraphMapping(db, "mem-graph-2")

    const remainingLinks = await scalarCount(
      db,
      "SELECT COUNT(*) as count FROM memory_node_links WHERE memory_id = ?",
      ["mem-graph-2"]
    )
    const remainingEdges = await scalarCount(
      db,
      "SELECT COUNT(*) as count FROM graph_edges WHERE evidence_memory_id = ?",
      ["mem-graph-2"]
    )

    expect(remainingLinks).toBe(0)
    expect(remainingEdges).toBe(0)
  })
})
