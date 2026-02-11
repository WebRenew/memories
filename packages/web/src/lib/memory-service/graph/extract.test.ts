import { describe, expect, it } from "vitest"
import { extractDeterministicGraph } from "./extract"

describe("extractDeterministicGraph", () => {
  it("extracts deterministic nodes, links, and edges", () => {
    const graph = extractDeterministicGraph({
      id: "mem-1",
      type: "decision",
      layer: "long_term",
      expiresAt: null,
      projectId: "github.com/webrenew/memories",
      userId: "user-123",
      tags: ["Auth", "auth", "MCP"],
      category: "Architecture",
    })

    const nodeKeys = graph.nodes.map((node) => `${node.nodeType}:${node.nodeKey}`).sort()
    expect(nodeKeys).toEqual(
      [
        "category:architecture",
        "memory_type:decision",
        "repo:github.com/webrenew/memories",
        "topic:auth",
        "topic:mcp",
        "user:user-123",
      ].sort()
    )

    const roles = graph.links.map((link) => link.role)
    expect(roles).toContain("scope")
    expect(roles).toContain("subject")
    expect(roles).toContain("type")
    expect(roles).toContain("category")
    expect(roles.filter((role) => role === "tag").length).toBe(2)

    const edgeTypes = graph.edges.map((edge) => edge.edgeType)
    expect(edgeTypes).toContain("authored_by")
    expect(edgeTypes).toContain("about")
    expect(edgeTypes).toContain("mentions")
  })

  it("propagates working-memory expiry to extracted edges", () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString()
    const graph = extractDeterministicGraph({
      id: "mem-working",
      type: "note",
      layer: "working",
      expiresAt,
      projectId: null,
      userId: "user-123",
      tags: ["incident"],
      category: null,
    })

    expect(graph.edges.length).toBeGreaterThan(0)
    for (const edge of graph.edges) {
      expect(edge.expiresAt).toBe(expiresAt)
    }
  })
})
