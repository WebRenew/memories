export type MemoryType = "rule" | "decision" | "fact" | "note" | "skill"

export type MemoryScope = "global" | "project" | "unknown"

export interface MemoryRecord {
  id: string | null
  content: string
  type: MemoryType
  scope: MemoryScope
  projectId: string | null
  tags: string[]
  raw?: string
}

export interface ContextResult {
  rules: MemoryRecord[]
  memories: MemoryRecord[]
  raw: string
}

export interface ContextGetOptions {
  limit?: number
  includeRules?: boolean
  projectId?: string
}

export interface MemoryAddInput {
  content: string
  type?: MemoryType
  tags?: string[]
  paths?: string[]
  category?: string
  metadata?: Record<string, unknown>
  projectId?: string
}

export interface MemoryEditInput {
  content?: string
  type?: MemoryType
  tags?: string[]
  paths?: string[]
  category?: string
  metadata?: Record<string, unknown> | null
}

export interface MemorySearchOptions {
  type?: MemoryType
  limit?: number
  projectId?: string
}

export interface MemoryListOptions {
  type?: MemoryType
  tags?: string
  limit?: number
  projectId?: string
}

export interface MutationResult {
  ok: true
  message: string
  raw: string
}

export interface BuildSystemPromptInput {
  rules?: MemoryRecord[]
  memories?: MemoryRecord[]
}
