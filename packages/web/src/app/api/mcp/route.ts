import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createTurso } from "@libsql/client"
import { NextRequest, NextResponse } from "next/server"

// Store active SSE connections
const connections = new Map<string, {
  controller: ReadableStreamDefaultController<Uint8Array>
  turso: ReturnType<typeof createTurso>
  userId: string
}>()

// Authenticate via API key and return user's Turso client
async function authenticateAndGetTurso(apiKey: string) {
  if (!apiKey.startsWith("mcp_")) {
    return { error: "Invalid API key format", status: 401 }
  }

  const admin = createAdminClient()
  const { data: user } = await admin
    .from("users")
    .select("id, email, turso_db_url, turso_db_token")
    .eq("mcp_api_key", apiKey)
    .single()

  if (!user) {
    return { error: "Invalid API key", status: 401 }
  }

  if (!user.turso_db_url || !user.turso_db_token) {
    return { error: "Database not configured. Visit memories.sh/app to set up.", status: 400 }
  }

  const turso = createTurso({
    url: user.turso_db_url,
    authToken: user.turso_db_token,
  })

  return { turso, user }
}

// Extract API key from request
function getApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }
  const url = new URL(request.url)
  return url.searchParams.get("api_key")
}

// Format SSE message
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// Truncate content for display
function truncate(str: string, len = 80): string {
  if (str.length <= len) return str
  return str.slice(0, len).trim() + "..."
}

// Memory row type
interface MemoryRow {
  id: string
  content: string
  type: string
  scope: string
  project_id?: string | null
}

// Format memory for display
function formatMemory(m: MemoryRow): string {
  const scope = m.scope === "project" && m.project_id ? `@${m.project_id.split("/").pop()}` : "global"
  return `[${m.type}] ${truncate(m.content)} (${scope})`
}

// Handle tool execution
async function executeTool(
  toolName: string, 
  args: Record<string, unknown>, 
  turso: ReturnType<typeof createTurso>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const projectId = args.project_id as string | undefined

  switch (toolName) {
    case "get_context": {
      // Get rules: global + project-specific only
      let rulesSql = `SELECT id, content, type, scope, project_id FROM memories 
                      WHERE type = 'rule' AND deleted_at IS NULL 
                      AND (scope = 'global'`
      const rulesArgs: (string | number)[] = []
      
      if (projectId) {
        rulesSql += ` OR (scope = 'project' AND project_id = ?)`
        rulesArgs.push(projectId)
      }
      rulesSql += `) ORDER BY scope DESC, created_at DESC`

      const rulesResult = await turso.execute({ sql: rulesSql, args: rulesArgs })
      
      const globalRules = rulesResult.rows.filter(r => r.scope === "global")
      const projectRules = rulesResult.rows.filter(r => r.scope === "project")

      let output = ""
      
      if (projectRules.length > 0) {
        output += `## Project Rules\n${projectRules.map(r => `- ${r.content}`).join("\n")}\n\n`
      }
      
      if (globalRules.length > 0) {
        output += `## Global Rules\n${globalRules.map(r => `- ${r.content}`).join("\n")}`
      }

      // Get relevant memories if query provided
      if (args.query) {
        const limit = (args.limit as number) || 5
        let searchSql = `SELECT id, content, type, scope, project_id FROM memories 
                         WHERE deleted_at IS NULL AND type != 'rule' AND content LIKE ?
                         AND (scope = 'global'`
        const searchArgs: (string | number)[] = [`%${args.query}%`]
        
        if (projectId) {
          searchSql += ` OR (scope = 'project' AND project_id = ?)`
          searchArgs.push(projectId)
        }
        searchSql += `) ORDER BY created_at DESC LIMIT ?`
        searchArgs.push(limit)

        const searchResult = await turso.execute({ sql: searchSql, args: searchArgs })
        if (searchResult.rows.length > 0) {
          output += `\n\n## Relevant Memories\n${searchResult.rows.map(m => `- ${formatMemory(m as unknown as MemoryRow)}`).join("\n")}`
        }
      }

      return {
        content: [{ type: "text", text: output || "No rules or memories found." }],
      }
    }

    case "add_memory": {
      const memoryId = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      const now = new Date().toISOString()
      const type = (args.type as string) || "note"
      const tags = Array.isArray(args.tags) ? args.tags.join(",") : null
      const scope = projectId ? "project" : "global"

      await turso.execute({
        sql: `INSERT INTO memories (id, content, type, scope, project_id, tags, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [memoryId, args.content as string, type, scope, projectId || null, tags, now, now],
      })

      const scopeLabel = projectId ? `project:${projectId.split("/").pop()}` : "global"
      return {
        content: [{ type: "text", text: `Stored ${type} (${scopeLabel}): ${truncate(args.content as string)}` }],
      }
    }

    case "edit_memory": {
      const id = args.id as string
      if (!id) throw new Error("Memory id is required")

      const now = new Date().toISOString()
      const updates: string[] = ["updated_at = ?"]
      const updateArgs: (string | null)[] = [now]

      if (args.content !== undefined) {
        updates.push("content = ?")
        updateArgs.push(args.content as string)
      }
      if (args.type !== undefined) {
        updates.push("type = ?")
        updateArgs.push(args.type as string)
      }
      if (args.tags !== undefined) {
        updates.push("tags = ?")
        updateArgs.push(Array.isArray(args.tags) ? args.tags.join(",") : null)
      }

      updateArgs.push(id)
      await turso.execute({
        sql: `UPDATE memories SET ${updates.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
        args: updateArgs,
      })

      return {
        content: [{ type: "text", text: `Updated memory ${id}` }],
      }
    }

    case "forget_memory": {
      const id = args.id as string
      if (!id) throw new Error("Memory id is required")

      const now = new Date().toISOString()
      await turso.execute({
        sql: `UPDATE memories SET deleted_at = ? WHERE id = ?`,
        args: [now, id],
      })

      return {
        content: [{ type: "text", text: `Deleted memory ${id}` }],
      }
    }

    case "search_memories": {
      const limit = (args.limit as number) || 10
      let sql = `SELECT id, content, type, scope, project_id FROM memories 
                 WHERE deleted_at IS NULL AND content LIKE ?
                 AND (scope = 'global'`
      const sqlArgs: (string | number)[] = [`%${args.query}%`]
      
      if (projectId) {
        sql += ` OR (scope = 'project' AND project_id = ?)`
        sqlArgs.push(projectId)
      }
      sql += `) ORDER BY created_at DESC LIMIT ?`
      sqlArgs.push(limit)

      const result = await turso.execute({ sql, args: sqlArgs })

      if (result.rows.length === 0) {
        return { content: [{ type: "text", text: "No memories found." }] }
      }
      
      const formatted = result.rows
        .map(m => formatMemory(m as unknown as MemoryRow))
        .join("\n")
      return {
        content: [{ type: "text", text: `Found ${result.rows.length} memories:\n\n${formatted}` }],
      }
    }

    case "list_memories": {
      const limit = (args.limit as number) || 20
      let sql = `SELECT id, content, type, scope, project_id FROM memories WHERE deleted_at IS NULL`
      const sqlArgs: (string | number)[] = []

      // Scope filter: global + project
      sql += ` AND (scope = 'global'`
      if (projectId) {
        sql += ` OR (scope = 'project' AND project_id = ?)`
        sqlArgs.push(projectId)
      }
      sql += `)`

      if (args.type) {
        sql += " AND type = ?"
        sqlArgs.push(args.type as string)
      }

      sql += " ORDER BY created_at DESC LIMIT ?"
      sqlArgs.push(limit)

      const result = await turso.execute({ sql, args: sqlArgs })

      if (result.rows.length === 0) {
        return { content: [{ type: "text", text: "No memories found." }] }
      }
      
      const formatted = result.rows
        .map(m => formatMemory(m as unknown as MemoryRow))
        .join("\n")
      return {
        content: [{ type: "text", text: `${result.rows.length} memories:\n\n${formatted}` }],
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// Tool definitions
const TOOLS = [
  {
    name: "get_context",
    description: "Get rules and relevant memories for the current task. Returns global rules plus project-specific rules if project_id is provided.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What you're working on (for finding relevant memories)" },
        project_id: { type: "string", description: "Project identifier (e.g., github.com/user/repo) to include project-specific rules" },
        limit: { type: "number", description: "Max memories to return (default: 5)" },
      },
    },
  },
  {
    name: "add_memory",
    description: "Store a new memory. Use type='rule' for always-active guidelines, 'decision' for architectural choices, 'fact' for knowledge, 'note' for general info.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The memory content" },
        type: { type: "string", enum: ["rule", "decision", "fact", "note"], description: "Memory type (default: note)" },
        project_id: { type: "string", description: "Project identifier to scope this memory to a specific project" },
        tags: { type: "array", items: { type: "string" }, description: "Optional tags for organization" },
      },
      required: ["content"],
    },
  },
  {
    name: "edit_memory",
    description: "Update an existing memory's content, type, or tags.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Memory ID to edit" },
        content: { type: "string", description: "New content (optional)" },
        type: { type: "string", enum: ["rule", "decision", "fact", "note"], description: "New type (optional)" },
        tags: { type: "array", items: { type: "string" }, description: "New tags (optional)" },
      },
      required: ["id"],
    },
  },
  {
    name: "forget_memory",
    description: "Delete a memory by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Memory ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "search_memories",
    description: "Search memories by content. Returns global + project-specific memories.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        project_id: { type: "string", description: "Project identifier to include project-specific memories" },
        limit: { type: "number", description: "Max results (default: 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_memories",
    description: "List recent memories. Returns global + project-specific memories.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["rule", "decision", "fact", "note"], description: "Filter by type" },
        project_id: { type: "string", description: "Project identifier to include project-specific memories" },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
    },
  },
]

// SSE endpoint - GET opens the event stream
export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request)
  
  if (!apiKey) {
    return NextResponse.json({ 
      status: "ok",
      name: "memories.sh MCP Server",
      version: "0.6.0",
      transport: "sse",
    })
  }

  const auth = await authenticateAndGetTurso(apiKey)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { turso, user } = auth
  const sessionId = crypto.randomUUID()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      connections.set(sessionId, { controller, turso, userId: user.id })
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(formatSSE("endpoint", `/api/mcp?session=${sessionId}`)))
    },
    cancel() {
      connections.delete(sessionId)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

// Handle MCP JSON-RPC messages via POST
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get("session")
  
  let turso: ReturnType<typeof createTurso>
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  if (sessionId && connections.has(sessionId)) {
    const conn = connections.get(sessionId)!
    turso = conn.turso
    controller = conn.controller
  } else {
    const apiKey = getApiKey(request)
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 })
    }

    const auth = await authenticateAndGetTurso(apiKey)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    turso = auth.turso
  }

  try {
    const body = await request.json()
    const { method, params, id } = body

    let result: unknown

    switch (method) {
      case "initialize": {
        result = {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "memories.sh", version: "0.6.0" },
          capabilities: { tools: {} },
        }
        break
      }

      case "notifications/initialized": {
        return new Response(null, { status: 204 })
      }

      case "tools/list": {
        result = { tools: TOOLS }
        break
      }

      case "tools/call": {
        const toolName = params?.name
        const args = params?.arguments || {}

        try {
          result = await executeTool(toolName, args, turso)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Tool execution failed"
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: errorMessage },
          })
        }
        break
      }

      case "ping": {
        result = {}
        break
      }

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        })
    }

    const response = { jsonrpc: "2.0", id, result }

    if (controller) {
      try {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(formatSSE("message", response)))
      } catch {
        // Connection closed
      }
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("MCP error:", err)
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: "Internal error" },
    }, { status: 500 })
  }
}

// CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
