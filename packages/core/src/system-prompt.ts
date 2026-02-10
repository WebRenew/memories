import type { BuildSystemPromptInput, MemoryRecord } from "./types"

function formatRule(rule: MemoryRecord): string {
  return `- ${rule.content}`
}

function formatMemory(memory: MemoryRecord): string {
  const scope = memory.scope === "project" && memory.projectId ? `@${memory.projectId}` : memory.scope
  const tags = memory.tags.length > 0 ? ` [${memory.tags.join(", ")}]` : ""
  return `- [${memory.type}] ${memory.content} (${scope})${tags}`
}

export function buildSystemPrompt(input: BuildSystemPromptInput): string {
  const rules = input.rules ?? []
  const memories = input.memories ?? []

  const parts: string[] = []

  if (rules.length > 0) {
    parts.push("## Rules (always follow)")
    parts.push(...rules.map(formatRule))
  }

  if (memories.length > 0) {
    if (parts.length > 0) {
      parts.push("")
    }
    parts.push("## Relevant Context (from memory)")
    parts.push(...memories.map(formatMemory))
  }

  return parts.join("\n").trim()
}
