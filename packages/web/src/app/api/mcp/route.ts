import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createTurso } from "@libsql/client"
import { NextRequest, NextResponse } from "next/server"

// Authenticate via API key and return user's Turso client
async function authenticateAndGetTurso(request: NextRequest) {
  // Get API key from Authorization header
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 }
  }

  const apiKey = authHeader.slice(7) // Remove "Bearer "
  if (!apiKey.startsWith("mcp_")) {
    return { error: "Invalid API key format", status: 401 }
  }

  // Look up user by API key
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
    return { error: "Database not configured. Run 'memories login' first.", status: 400 }
  }

  const turso = createTurso({
    url: user.turso_db_url,
    authToken: user.turso_db_token,
  })

  return { turso, user }
}

// Handle MCP JSON-RPC requests
export async function POST(request: NextRequest) {
  const auth = await authenticateAndGetTurso(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { turso } = auth

  try {
    const body = await request.json()
    
    // Handle JSON-RPC request
    const { method, params, id } = body

    let result: unknown

    switch (method) {
      case "tools/list": {
        result = {
          tools: [
            {
              name: "get_context",
              description: "Get rules and relevant memories for the current task",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string", description: "What you're working on" },
                  limit: { type: "number", description: "Max memories to return" },
                },
              },
            },
            {
              name: "add_memory",
              description: "Store a new memory (rule, decision, fact, or note)",
              inputSchema: {
                type: "object",
                properties: {
                  content: { type: "string", description: "The memory content" },
                  type: { type: "string", enum: ["rule", "decision", "fact", "note"] },
                  tags: { type: "array", items: { type: "string" } },
                },
                required: ["content"],
              },
            },
            {
              name: "search_memories",
              description: "Search memories by content",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string", description: "Search query" },
                  limit: { type: "number", description: "Max results" },
                },
                required: ["query"],
              },
            },
            {
              name: "list_memories",
              description: "List recent memories",
              inputSchema: {
                type: "object",
                properties: {
                  limit: { type: "number", description: "Max results" },
                  type: { type: "string", enum: ["rule", "decision", "fact", "note"] },
                },
              },
            },
          ],
        }
        break
      }

      case "tools/call": {
        const toolName = params?.name
        const args = params?.arguments || {}

        switch (toolName) {
          case "get_context": {
            // Get all rules
            const rulesResult = await turso.execute(
              "SELECT content, scope FROM memories WHERE type = 'rule' AND deleted_at IS NULL ORDER BY created_at DESC"
            )
            const rules = rulesResult.rows.map(r => `- ${r.content}`).join("\n")

            // Get relevant memories if query provided
            let memories = ""
            if (args.query) {
              const limit = args.limit || 10
              const searchResult = await turso.execute({
                sql: `SELECT content, type, scope FROM memories 
                      WHERE deleted_at IS NULL AND content LIKE ? 
                      ORDER BY created_at DESC LIMIT ?`,
                args: [`%${args.query}%`, limit],
              })
              if (searchResult.rows.length > 0) {
                memories = "\n\n## Relevant Memories\n" + 
                  searchResult.rows.map(m => `- [${m.type}] ${m.content}`).join("\n")
              }
            }

            result = {
              content: [{ 
                type: "text", 
                text: rules ? `## Rules\n${rules}${memories}` : "No rules defined." 
              }],
            }
            break
          }

          case "add_memory": {
            const memoryId = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
            const now = new Date().toISOString()
            const type = args.type || "note"
            const tags = args.tags?.join(",") || null

            await turso.execute({
              sql: `INSERT INTO memories (id, content, type, scope, tags, created_at, updated_at) 
                    VALUES (?, ?, ?, 'global', ?, ?, ?)`,
              args: [memoryId, args.content, type, tags, now, now],
            })

            result = {
              content: [{ type: "text", text: `Stored ${type} ${memoryId}: ${args.content}` }],
            }
            break
          }

          case "search_memories": {
            const limit = args.limit || 20
            const searchResult = await turso.execute({
              sql: `SELECT id, content, type, scope FROM memories 
                    WHERE deleted_at IS NULL AND content LIKE ? 
                    ORDER BY created_at DESC LIMIT ?`,
              args: [`%${args.query}%`, limit],
            })

            if (searchResult.rows.length === 0) {
              result = { content: [{ type: "text", text: "No memories found." }] }
            } else {
              const formatted = searchResult.rows
                .map(m => `[${m.type}] ${m.id}: ${m.content}`)
                .join("\n")
              result = {
                content: [{ type: "text", text: `Found ${searchResult.rows.length} memories:\n\n${formatted}` }],
              }
            }
            break
          }

          case "list_memories": {
            const limit = args.limit || 50
            let sql = "SELECT id, content, type, scope FROM memories WHERE deleted_at IS NULL"
            const sqlArgs: (string | number)[] = []

            if (args.type) {
              sql += " AND type = ?"
              sqlArgs.push(args.type)
            }

            sql += " ORDER BY created_at DESC LIMIT ?"
            sqlArgs.push(limit)

            const listResult = await turso.execute({ sql, args: sqlArgs })

            if (listResult.rows.length === 0) {
              result = { content: [{ type: "text", text: "No memories found." }] }
            } else {
              const formatted = listResult.rows
                .map(m => `[${m.type}] ${m.id}: ${m.content}`)
                .join("\n")
              result = {
                content: [{ type: "text", text: `${listResult.rows.length} memories:\n\n${formatted}` }],
              }
            }
            break
          }

          default:
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              error: { code: -32601, message: `Unknown tool: ${toolName}` },
            })
        }
        break
      }

      case "initialize": {
        result = {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "memories.sh",
            version: "0.4.0",
          },
          capabilities: {
            tools: {},
          },
        }
        break
      }

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        })
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result,
    })
  } catch (err) {
    console.error("MCP error:", err)
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: "Internal error" },
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    name: "memories.sh MCP Server",
    version: "0.4.0",
  })
}
