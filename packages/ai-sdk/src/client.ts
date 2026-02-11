import { MemoriesClient } from "@memories.sh/core"
import type { MemoriesBaseOptions } from "./types"

export function resolveClient(
  options: MemoriesBaseOptions = {},
  settings: { requireTenant?: boolean } = {}
): MemoriesClient {
  if (options.client) {
    return options.client
  }

  const requireTenant = settings.requireTenant ?? true
  const tenantId = typeof options.tenantId === "string" ? options.tenantId.trim() : ""
  if (requireTenant && !tenantId) {
    throw new Error("tenantId is required when no client instance is provided.")
  }

  return new MemoriesClient({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    userId: options.userId,
    tenantId: tenantId || undefined,
    fetch: options.fetch,
    headers: options.headers,
  })
}
