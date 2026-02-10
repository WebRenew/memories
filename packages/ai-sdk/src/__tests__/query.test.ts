import { describe, expect, it } from "vitest"
import { defaultExtractQuery } from "../query"

describe("defaultExtractQuery", () => {
  it("uses prompt when provided", () => {
    expect(defaultExtractQuery({ prompt: "How should I handle auth?" })).toBe(
      "How should I handle auth?"
    )
  })

  it("falls back to last user message", () => {
    const query = defaultExtractQuery({
      messages: [
        { role: "system", content: "System" },
        { role: "user", content: "First question" },
        { role: "assistant", content: "Answer" },
        { role: "user", content: [{ type: "text", text: "Final user prompt" }] },
      ],
    })

    expect(query).toBe("Final user prompt")
  })
})
