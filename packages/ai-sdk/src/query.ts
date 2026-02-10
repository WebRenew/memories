function textFromMessageContent(content: unknown): string | undefined {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return undefined

  const textParts = content
    .map((part) => {
      if (typeof part === "string") return part
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        (part as { type?: unknown }).type === "text" &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text
      }
      return ""
    })
    .filter(Boolean)

  if (textParts.length === 0) return undefined
  return textParts.join("\n").trim()
}

export function defaultExtractQuery(params: unknown): string | undefined {
  if (!params || typeof params !== "object") return undefined

  const candidate = params as {
    prompt?: unknown
    messages?: Array<{ role?: unknown; content?: unknown }>
  }

  if (typeof candidate.prompt === "string" && candidate.prompt.trim()) {
    return candidate.prompt.trim()
  }

  const messages = candidate.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return undefined
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (!message || message.role !== "user") continue

    const messageText = textFromMessageContent(message.content)
    if (messageText && messageText.trim()) {
      return messageText.trim()
    }
  }

  return undefined
}
