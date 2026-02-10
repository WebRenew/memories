import { describe, expect, it, vi } from "vitest"
import { memoriesTools } from "../tools"

function createMockClient() {
  return {
    context: {
      get: vi.fn().mockResolvedValue({ rules: [], memories: [], raw: "" }),
    },
    memories: {
      add: vi.fn().mockResolvedValue({ ok: true, message: "stored", raw: "stored" }),
      search: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
      forget: vi.fn().mockResolvedValue({ ok: true, message: "forgot", raw: "forgot" }),
      edit: vi.fn().mockResolvedValue({ ok: true, message: "edited", raw: "edited" }),
    },
  }
}

describe("memoriesTools", () => {
  it("routes tool calls through the core client", async () => {
    const client = createMockClient()
    const tools = memoriesTools({ client: client as unknown as any, projectId: "github.com/acme/repo" })

    await tools.getContext({ query: "auth" })
    await tools.storeMemory({ content: "Use zod" })
    await tools.searchMemories({ query: "zod" })
    await tools.listMemories()
    await tools.forgetMemory({ id: "abc123" })
    await tools.editMemory({ id: "abc123", updates: { content: "Updated" } })

    expect(client.context.get).toHaveBeenCalled()
    expect(client.memories.add).toHaveBeenCalled()
    expect(client.memories.search).toHaveBeenCalled()
    expect(client.memories.list).toHaveBeenCalled()
    expect(client.memories.forget).toHaveBeenCalledWith("abc123")
    expect(client.memories.edit).toHaveBeenCalledWith("abc123", { content: "Updated" })
  })
})
