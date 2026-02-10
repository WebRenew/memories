import type { MemoriesSystemPromptOptions } from "./types"

export function memoriesSystemPrompt(options: MemoriesSystemPromptOptions = {}): string {
  const persona = options.persona?.trim()
  const includeInstructions = options.includeInstructions ?? true
  const rules = options.rules ?? []

  const lines: string[] = []

  if (persona) {
    lines.push(`You are a ${persona} with access to persistent memory.`)
  } else {
    lines.push("You have access to persistent memory.")
  }

  if (includeInstructions) {
    lines.push("Use memory to stay consistent with prior decisions and rules.")
    lines.push("Store new durable facts/decisions when they are likely to matter later.")
  }

  if (rules.length > 0) {
    lines.push("")
    lines.push("## Memory Usage Rules")
    for (const rule of rules) {
      const content = typeof rule === "string" ? rule : rule.content
      lines.push(`- ${content}`)
    }
  }

  return lines.join("\n")
}
