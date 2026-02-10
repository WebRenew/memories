import { resolveClient } from "./client"
import type { MemoriesBaseOptions } from "./types"
import type { ContextGetOptions, ContextResult } from "@memories.sh/core"

export interface PreloadContextOptions extends MemoriesBaseOptions, ContextGetOptions {
  query?: string
}

export async function preloadContext(options: PreloadContextOptions = {}): Promise<ContextResult> {
  const client = resolveClient(options)
  return client.context.get(options.query, {
    limit: options.limit,
    includeRules: options.includeRules,
    projectId: options.projectId,
  })
}
