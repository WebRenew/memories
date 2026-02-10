import { describe, expect, it, vi } from "vitest"
import { MemoriesClient, MemoriesClientError } from "../client"

describe("MemoriesClient", () => {
  it("throws when api key is missing", () => {
    expect(() => new MemoriesClient({ apiKey: "" })).toThrow(MemoriesClientError)
  })

  it("calls MCP tools through JSON-RPC", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            content: [{ type: "text", text: "Stored note (global): test" }],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const client = new MemoriesClient({
      apiKey: "mcp_test",
      baseUrl: "https://example.com/api/mcp",
      fetch: fetchMock as unknown as typeof fetch,
    })

    const result = await client.memories.add({ content: "test" })
    expect(result.ok).toBe(true)
    expect(result.message).toContain("Stored")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    expect(requestInit).toBeDefined()
    expect(requestInit?.method).toBe("POST")
    expect((requestInit?.headers as Record<string, string>).authorization).toBe("Bearer mcp_test")
  })

  it("parses structuredContent into typed context arrays", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            content: [{ type: "text", text: "" }],
            structuredContent: {
              rules: [
                {
                  id: "rule_1",
                  content: "Keep it simple",
                  type: "rule",
                  scope: "global",
                  projectId: null,
                  tags: [],
                },
              ],
              memories: [
                {
                  id: "mem_1",
                  content: "API rate limit is 100/min",
                  type: "fact",
                  scope: "global",
                  projectId: null,
                  tags: [],
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const client = new MemoriesClient({
      apiKey: "mcp_test",
      baseUrl: "https://example.com/api/mcp",
      fetch: fetchMock as unknown as typeof fetch,
    })

    const context = await client.context.get("auth")
    expect(context.rules).toHaveLength(1)
    expect(context.memories).toHaveLength(1)
    expect(context.memories[0]?.type).toBe("fact")
    expect(context.rules[0]?.content).toBe("Keep it simple")
  })

  it("parses structuredContent for memory list/search", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}") as { params?: { name?: string } }
      const toolName = body.params?.name

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            content: [{ type: "text", text: "" }],
            structuredContent: {
              memories:
                toolName === "search_memories"
                  ? [
                      {
                        id: "m_search",
                        content: "Found memory",
                        type: "fact",
                        scope: "global",
                        projectId: null,
                        tags: [],
                      },
                    ]
                  : [
                      {
                        id: "m_list",
                        content: "Listed memory",
                        type: "note",
                        scope: "global",
                        projectId: null,
                        tags: ["tag1"],
                      },
                    ],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    })

    const client = new MemoriesClient({
      apiKey: "mcp_test",
      baseUrl: "https://example.com/api/mcp",
      fetch: fetchMock as unknown as typeof fetch,
    })

    const searched = await client.memories.search("found")
    const listed = await client.memories.list()

    expect(searched[0]?.id).toBe("m_search")
    expect(listed[0]?.id).toBe("m_list")
    expect(listed[0]?.tags).toEqual(["tag1"])
  })
})
