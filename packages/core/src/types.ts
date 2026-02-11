export type MemoryType = "rule" | "decision" | "fact" | "note" | "skill"
export type MemoryLayer = "rule" | "working" | "long_term"

export type MemoryScope = "global" | "project" | "unknown"

export type MemoriesErrorType =
  | "auth_error"
  | "validation_error"
  | "rate_limit_error"
  | "not_found_error"
  | "tool_error"
  | "method_error"
  | "rpc_error"
  | "http_error"
  | "network_error"
  | "internal_error"
  | "unknown_error"

export interface MemoriesErrorData {
  type: MemoriesErrorType | string
  code: string
  message: string
  status?: number
  retryable?: boolean
  details?: unknown
}

export interface MemoriesResponseEnvelope<T> {
  ok: boolean
  data: T | null
  error: MemoriesErrorData | null
  meta?: Record<string, unknown>
}

export interface MemoryRecord {
  id: string | null
  content: string
  type: MemoryType
  layer: MemoryLayer
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
  layer?: MemoryLayer
  tags?: string[]
  paths?: string[]
  category?: string
  metadata?: Record<string, unknown>
  projectId?: string
}

export interface MemoryEditInput {
  content?: string
  type?: MemoryType
  layer?: MemoryLayer
  tags?: string[]
  paths?: string[]
  category?: string
  metadata?: Record<string, unknown> | null
}

export interface MemorySearchOptions {
  type?: MemoryType
  layer?: MemoryLayer
  limit?: number
  projectId?: string
}

export interface MemoryListOptions {
  type?: MemoryType
  layer?: MemoryLayer
  tags?: string
  limit?: number
  projectId?: string
}

export interface MutationResult {
  ok: true
  message: string
  raw: string
  envelope?: MemoriesResponseEnvelope<unknown>
}

export interface BuildSystemPromptInput {
  rules?: MemoryRecord[]
  memories?: MemoryRecord[]
}
