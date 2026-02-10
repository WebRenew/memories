import { MemoriesClient } from "@memories.sh/core"
import type { MemoriesBaseOptions } from "./types"

export function resolveClient(options: MemoriesBaseOptions = {}): MemoriesClient {
  if (options.client) {
    return options.client
  }

  return new MemoriesClient({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    userId: options.userId,
    fetch: options.fetch,
    headers: options.headers,
  })
}
