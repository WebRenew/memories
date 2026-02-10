import { MemoriesClient } from "@memories.sh/core"
import type { MemoriesBaseOptions } from "./types"

export function resolveClient(options: MemoriesBaseOptions = {}): MemoriesClient {
  if (options.client) {
    return options.client
  }

  const tenantId = typeof options.tenantId === "string" ? options.tenantId.trim() : ""
  if (!tenantId) {
    throw new Error("tenantId is required when no client instance is provided.")
  }

  return new MemoriesClient({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    userId: options.userId,
    tenantId,
    fetch: options.fetch,
    headers: options.headers,
  })
}
