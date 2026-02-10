import { describe, expect, it, vi } from "vitest"
import { memoriesMiddleware } from "../middleware"

function createMockClient() {
  return {
    context: {
      get: vi.fn().mockResolvedValue({
        rules: [{ id: "r1", content: "Use zod", type: "rule", scope: "global", projectId: null, tags: [] }],
        memories: [{ id: "m1", content: "Auth uses Supabase", type: "fact", scope: "global", projectId: null, tags: [] }],
        raw: "",
      }),
    },
    buildSystemPrompt: vi.fn().mockReturnValue("## Rules\n- Use zod"),
  }
}

describe("memoriesMiddleware", () => {
  it("injects memory context into system prompt", async () => {
    const client = createMockClient()
    const middleware = memoriesMiddleware({ client: client as unknown as any })

    const transformed = await middleware.transformParams({
      params: {
        prompt: "How should I handle auth?",
        system: "Be concise",
      },
    })

    expect(client.context.get).toHaveBeenCalledOnce()
    expect(client.buildSystemPrompt).toHaveBeenCalledOnce()
    expect((transformed as { params: { system: string } }).params.system).toContain("## Rules")
    expect((transformed as { params: { system: string } }).params.system).toContain("Be concise")
  })

  it("supports non-envelope params shape", async () => {
    const client = createMockClient()
    const middleware = memoriesMiddleware({ client: client as unknown as any })

    const transformed = await middleware.transformParams({
      prompt: "How should I handle auth?",
    })

    expect((transformed as { system: string }).system).toContain("## Rules")
  })
})
