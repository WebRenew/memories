import { describe, expect, it } from "vitest"
import { parseContextResponse, parseMemoryListResponse } from "../parsers"

describe("parseContextResponse", () => {
  it("parses rules and memories from tool output", () => {
    const raw = [
      "## Project Rules",
      "- Use zod for validation",
      "",
      "## Global Rules",
      "- Keep responses concise",
      "",
      "## Relevant Memories",
      "- [decision] Chose Supabase for auth (@repo) [auth,backend]",
      "- [fact] Deploy target is Vercel (global)",
    ].join("\n")

    const parsed = parseContextResponse(raw)

    expect(parsed.rules).toHaveLength(2)
    expect(parsed.rules[0]?.content).toBe("Use zod for validation")
    expect(parsed.memories).toHaveLength(2)
    expect(parsed.memories[0]?.type).toBe("decision")
    expect(parsed.memories[0]?.layer).toBe("long_term")
    expect(parsed.memories[0]?.scope).toBe("project")
    expect(parsed.memories[0]?.tags).toEqual(["auth", "backend"])
  })
})

describe("parseMemoryListResponse", () => {
  it("parses list/search output bullet lines", () => {
    const raw = [
      "Found 2 memories:",
      "",
      "- [rule] Prefer functional components (global)",
      "- [note] Follow team coding style (@repo) [style]",
    ].join("\n")

    const memories = parseMemoryListResponse(raw)
    expect(memories).toHaveLength(2)
    expect(memories[0]?.layer).toBe("rule")
    expect(memories[1]?.scope).toBe("project")
    expect(memories[1]?.tags).toEqual(["style"])
  })
})
