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

  it("parses context into structured arrays", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          result: {
            content: [
              {
                type: "text",
                text: "## Global Rules\n- Keep it simple\n\n## Relevant Memories\n- [fact] API rate limit is 100/min (global)",
              },
            ],
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
  })
})
