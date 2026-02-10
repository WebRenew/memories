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
              ok: true,
              data: {
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
              error: null,
              meta: {
                version: "2026-02-10",
                tool: "get_context",
              },
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
              ok: true,
              data: {
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
              error: null,
              meta: {
                version: "2026-02-10",
                tool: toolName,
              },
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

  it("maps typed JSON-RPC errors to MemoriesClientError", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          error: {
            code: -32602,
            message: "Memory id is required",
            data: {
              type: "validation_error",
              code: "MEMORY_ID_REQUIRED",
              message: "Memory id is required",
              status: 400,
              retryable: false,
              details: { field: "id" },
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

    await expect(client.memories.forget("")).rejects.toMatchObject({
      name: "MemoriesClientError",
      type: "validation_error",
      errorCode: "MEMORY_ID_REQUIRED",
      code: -32602,
      retryable: false,
    })
  })

  it("maps typed HTTP errors from endpoint envelopes", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          ok: false,
          data: null,
          error: "Missing API key",
          errorDetail: {
            type: "auth_error",
            code: "MISSING_API_KEY",
            message: "Missing API key",
            status: 401,
            retryable: false,
          },
        }),
        { status: 401, headers: { "content-type": "application/json" } }
      )
    )

    const client = new MemoriesClient({
      apiKey: "mcp_test",
      baseUrl: "https://example.com/api/mcp",
      fetch: fetchMock as unknown as typeof fetch,
    })

    await expect(client.context.get("auth")).rejects.toMatchObject({
      name: "MemoriesClientError",
      type: "auth_error",
      errorCode: "MISSING_API_KEY",
      status: 401,
      retryable: false,
    })
  })
})
