import type { MemoryEditInput } from "@memories.sh/core"
import { resolveClient } from "./client"
import type { MemoriesBaseOptions, MemoriesTools } from "./types"

export function getContext(options: MemoriesBaseOptions = {}) {
  const client = resolveClient(options)
  return async (input: { query?: string; limit?: number; includeRules?: boolean; projectId?: string } = {}) =>
    client.context.get(input.query, {
      limit: input.limit,
      includeRules: input.includeRules,
      projectId: input.projectId ?? options.projectId,
    })
}

export function storeMemory(options: MemoriesBaseOptions = {}) {
  const client = resolveClient(options)
  return async (input: {
    content: string
    type?: "rule" | "decision" | "fact" | "note" | "skill"
    tags?: string[]
    paths?: string[]
    category?: string
    metadata?: Record<string, unknown>
    projectId?: string
  }) =>
    client.memories.add({
      ...input,
      projectId: input.projectId ?? options.projectId,
    })
}

export function searchMemories(options: MemoriesBaseOptions = {}) {
  const client = resolveClient(options)
  return async (input: {
    query: string
    type?: "rule" | "decision" | "fact" | "note" | "skill"
    limit?: number
    projectId?: string
  }) =>
    client.memories.search(input.query, {
      type: input.type,
      limit: input.limit,
      projectId: input.projectId ?? options.projectId,
    })
}

export function listMemories(options: MemoriesBaseOptions = {}) {
  const client = resolveClient(options)
  return async (input: {
    type?: "rule" | "decision" | "fact" | "note" | "skill"
    tags?: string
    limit?: number
    projectId?: string
  } = {}) =>
    client.memories.list({
      type: input.type,
      tags: input.tags,
      limit: input.limit,
      projectId: input.projectId ?? options.projectId,
    })
}

export function forgetMemory(options: MemoriesBaseOptions = {}) {
  const client = resolveClient(options)
  return async (input: { id: string }) => client.memories.forget(input.id)
}

export function editMemory(options: MemoriesBaseOptions = {}) {
  const client = resolveClient(options)
  return async (input: { id: string; updates: MemoryEditInput }) =>
    client.memories.edit(input.id, input.updates)
}

export function memoriesTools(options: MemoriesBaseOptions = {}): MemoriesTools {
  return {
    getContext: getContext(options),
    storeMemory: storeMemory(options),
    searchMemories: searchMemories(options),
    listMemories: listMemories(options),
    forgetMemory: forgetMemory(options),
    editMemory: editMemory(options),
  }
}
