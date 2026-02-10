import { z } from "zod"
import { parseContextResponse, parseMemoryListResponse } from "./parsers"
import { buildSystemPrompt } from "./system-prompt"
import type {
  BuildSystemPromptInput,
  ContextGetOptions,
  ContextResult,
  MemoryAddInput,
  MemoryEditInput,
  MemoryListOptions,
  MemoryRecord,
  MemorySearchOptions,
  MutationResult,
} from "./types"

export interface MemoriesClientOptions {
  apiKey?: string
  baseUrl?: string
  userId?: string
  fetch?: typeof fetch
  headers?: Record<string, string>
}

interface RpcErrorPayload {
  code: number
  message: string
  data?: unknown
}

interface RpcResponsePayload {
  result?: unknown
  error?: RpcErrorPayload
}

const baseUrlSchema = z.string().url()

export class MemoriesClientError extends Error {
  readonly status?: number
  readonly code?: number
  readonly data?: unknown

  constructor(message: string, options?: { status?: number; code?: number; data?: unknown }) {
    super(message)
    this.name = "MemoriesClientError"
    this.status = options?.status
    this.code = options?.code
    this.data = options?.data
  }
}

function readDefaultApiKey(): string | undefined {
  if (typeof process === "undefined") return undefined
  return process.env.MEMORIES_API_KEY
}

function extractTextFromToolResult(result: unknown): string {
  const parsed = z
    .object({
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    })
    .passthrough()
    .safeParse(result)

  if (!parsed.success) {
    return ""
  }

  const textChunk = parsed.data.content?.find((entry) => entry.type === "text" && entry.text)
  return textChunk?.text ?? ""
}

export class MemoriesClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly userId: string | undefined
  private readonly fetcher: typeof fetch
  private readonly defaultHeaders: Record<string, string>

  constructor(options: MemoriesClientOptions = {}) {
    const apiKey = options.apiKey ?? readDefaultApiKey()
    if (!apiKey) {
      throw new MemoriesClientError("Missing API key. Pass apiKey or set MEMORIES_API_KEY.")
    }

    const baseUrl = options.baseUrl ?? "https://memories.sh/api/mcp"
    const parsedBaseUrl = baseUrlSchema.safeParse(baseUrl)
    if (!parsedBaseUrl.success) {
      throw new MemoriesClientError("Invalid baseUrl. Expected a valid URL.")
    }

    if (typeof fetch !== "function" && !options.fetch) {
      throw new MemoriesClientError("No fetch implementation available.")
    }

    this.apiKey = apiKey
    this.baseUrl = parsedBaseUrl.data
    this.userId = options.userId
    this.fetcher = options.fetch ?? fetch
    this.defaultHeaders = options.headers ?? {}
  }

  readonly context = {
    get: async (query?: string, options: ContextGetOptions = {}): Promise<ContextResult> => {
      const raw = await this.callTool("get_context", {
        query,
        limit: options.limit,
        project_id: options.projectId,
      })

      const parsed = parseContextResponse(raw)
      if (options.includeRules === false) {
        return { ...parsed, rules: [] }
      }
      return parsed
    },
  }

  readonly memories = {
    add: async (input: MemoryAddInput): Promise<MutationResult> => {
      const raw = await this.callTool("add_memory", {
        content: input.content,
        type: input.type,
        tags: input.tags,
        paths: input.paths,
        category: input.category,
        metadata: input.metadata,
        project_id: input.projectId,
      })

      return { ok: true, message: raw || "Memory stored", raw }
    },

    search: async (query: string, options: MemorySearchOptions = {}): Promise<MemoryRecord[]> => {
      const raw = await this.callTool("search_memories", {
        query,
        type: options.type,
        limit: options.limit,
        project_id: options.projectId,
      })
      return parseMemoryListResponse(raw)
    },

    list: async (options: MemoryListOptions = {}): Promise<MemoryRecord[]> => {
      const raw = await this.callTool("list_memories", {
        type: options.type,
        tags: options.tags,
        limit: options.limit,
        project_id: options.projectId,
      })
      return parseMemoryListResponse(raw)
    },

    edit: async (id: string, updates: MemoryEditInput): Promise<MutationResult> => {
      const raw = await this.callTool("edit_memory", {
        id,
        content: updates.content,
        type: updates.type,
        tags: updates.tags,
        paths: updates.paths,
        category: updates.category,
        metadata: updates.metadata,
      })
      return { ok: true, message: raw || `Updated memory ${id}`, raw }
    },

    forget: async (id: string): Promise<MutationResult> => {
      const raw = await this.callTool("forget_memory", { id })
      return { ok: true, message: raw || `Deleted memory ${id}`, raw }
    },
  }

  buildSystemPrompt(input: BuildSystemPromptInput): string {
    return buildSystemPrompt(input)
  }

  private async rpc(method: string, params: Record<string, unknown>): Promise<unknown> {
    const payload = {
      jsonrpc: "2.0",
      method,
      id: crypto.randomUUID(),
      params,
    }

    const response = await this.fetcher(this.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
        ...this.defaultHeaders,
      },
      body: JSON.stringify(payload),
    })

    const json = (await response.json()) as RpcResponsePayload

    if (!response.ok) {
      const fallbackMessage =
        typeof (json as { error?: { message?: unknown } })?.error?.message === "string"
          ? ((json as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`)
          : `HTTP ${response.status}`
      throw new MemoriesClientError(fallbackMessage, { status: response.status })
    }

    if (json.error) {
      throw new MemoriesClientError(json.error.message, {
        status: response.status,
        code: json.error.code,
        data: json.error.data,
      })
    }

    return json.result
  }

  private withUserScope(args: Record<string, unknown>): Record<string, unknown> {
    if (!this.userId) return args
    return { ...args, user_id: this.userId }
  }

  private async callTool(toolName: string, args: Record<string, unknown>): Promise<string> {
    const result = await this.rpc("tools/call", {
      name: toolName,
      arguments: this.withUserScope(args),
    })
    return extractTextFromToolResult(result)
  }
}
