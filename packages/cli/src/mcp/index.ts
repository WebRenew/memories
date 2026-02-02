import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  addMemory,
  searchMemories,
  listMemories,
  forgetMemory,
  getContext,
  getRules,
  type Memory,
  type MemoryType,
} from "../lib/memory.js";
import { getProjectId } from "../lib/git.js";

const TYPE_LABELS: Record<MemoryType, string> = {
  rule: "📌 RULE",
  decision: "💡 DECISION",
  fact: "📋 FACT",
  note: "📝 NOTE",
};

function formatMemory(m: Memory): string {
  const tags = m.tags ? ` [${m.tags}]` : "";
  const scope = m.scope === "global" ? "G" : "P";
  const typeLabel = TYPE_LABELS[m.type] || "📝 NOTE";
  return `${typeLabel} (${scope}) ${m.id}: ${m.content}${tags}`;
}

function formatRulesSection(rules: Memory[]): string {
  if (rules.length === 0) return "";
  return `## Active Rules\n${rules.map(r => `- ${r.content}`).join("\n")}`;
}

function formatMemoriesSection(memories: Memory[], title: string): string {
  if (memories.length === 0) return "";
  return `## ${title}\n${memories.map(formatMemory).join("\n")}`;
}

export async function startMcpServer(): Promise<void> {
  const projectId = getProjectId();

  const server = new McpServer({
    name: "memories",
    version: "0.1.0",
  });

  // Tool: get_context (PRIMARY - use this for AI agent context)
  server.tool(
    "get_context",
    `Get relevant context for the current task. This is the PRIMARY tool for AI agents.
Returns:
1. All active RULES (coding standards, preferences) - always included
2. Relevant memories matching your query (decisions, facts, notes)

Use this at the start of tasks to understand project conventions and recall past decisions.`,
    {
      query: z.string().optional().describe("What you're working on - used to find relevant memories. Leave empty to get just rules."),
      limit: z.number().optional().describe("Max memories to return (default: 10, rules always included)"),
    },
    async ({ query, limit }) => {
      try {
        const { rules, memories } = await getContext(query, {
          projectId: projectId ?? undefined,
          limit,
        });

        const parts: string[] = [];
        
        if (rules.length > 0) {
          parts.push(formatRulesSection(rules));
        }
        
        if (memories.length > 0) {
          parts.push(formatMemoriesSection(memories, query ? `Relevant to: "${query}"` : "Recent Memories"));
        }

        if (parts.length === 0) {
          return {
            content: [{ type: "text", text: "No context found. Use add_memory to store rules and knowledge." }],
          };
        }

        return {
          content: [{ type: "text", text: parts.join("\n\n") }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to get context: ${error instanceof Error ? error.message : "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: add_memory
  server.tool(
    "add_memory",
    `Store a new memory. Choose the appropriate type:
- rule: Coding standards, preferences, constraints (e.g., "Always use TypeScript strict mode")
- decision: Why we chose something (e.g., "Chose PostgreSQL for JSONB support")
- fact: Project-specific knowledge (e.g., "API rate limit is 100 req/min")
- note: General notes (default)

By default, memories are project-scoped when in a git repo. Use global: true for user-wide preferences.`,
    {
      content: z.string().describe("The memory content to store"),
      type: z.enum(["rule", "decision", "fact", "note"]).optional().describe("Memory type (default: note)"),
      tags: z.array(z.string()).optional().describe("Tags to categorize the memory"),
      global: z.boolean().optional().describe("Store as global memory instead of project-scoped"),
    },
    async ({ content, type, tags, global: isGlobal }) => {
      try {
        const memory = await addMemory(content, { 
          tags, 
          global: isGlobal,
          type: type as MemoryType | undefined,
        });
        const typeLabel = TYPE_LABELS[memory.type];
        return {
          content: [
            {
              type: "text",
              text: `Stored ${typeLabel} ${memory.id} (${memory.scope}${memory.project_id ? `: ${memory.project_id}` : ""})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to add memory: ${error instanceof Error ? error.message : "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: search_memories
  server.tool(
    "search_memories",
    "Search memories by content using full-text search. Returns both global and project-scoped memories ranked by relevance.",
    {
      query: z.string().describe("Search query - words are matched with prefix matching"),
      limit: z.number().optional().describe("Maximum number of results (default: 20)"),
      types: z.array(z.enum(["rule", "decision", "fact", "note"])).optional().describe("Filter by memory types"),
    },
    async ({ query, limit, types }) => {
      try {
        const memories = await searchMemories(query, { 
          limit, 
          projectId: projectId ?? undefined,
          types: types as MemoryType[] | undefined,
        });

        if (memories.length === 0) {
          return {
            content: [{ type: "text", text: "No memories found matching your query." }],
          };
        }

        const formatted = memories.map(formatMemory).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `Found ${memories.length} memories:\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to search memories: ${error instanceof Error ? error.message : "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: get_rules
  server.tool(
    "get_rules",
    "Get all active rules for the current project. Rules are coding standards, preferences, and constraints that should always be followed.",
    {},
    async () => {
      try {
        const rules = await getRules({ projectId: projectId ?? undefined });

        if (rules.length === 0) {
          return {
            content: [{ type: "text", text: "No rules defined. Add rules with: add_memory with type='rule'" }],
          };
        }

        const globalRules = rules.filter(r => r.scope === "global");
        const projectRules = rules.filter(r => r.scope === "project");

        const parts: string[] = [];
        if (globalRules.length > 0) {
          parts.push(`## Global Rules\n${globalRules.map(r => `- ${r.content}`).join("\n")}`);
        }
        if (projectRules.length > 0) {
          parts.push(`## Project Rules\n${projectRules.map(r => `- ${r.content}`).join("\n")}`);
        }

        return {
          content: [{ type: "text", text: parts.join("\n\n") }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to get rules: ${error instanceof Error ? error.message : "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: list_memories
  server.tool(
    "list_memories",
    "List recent memories. Returns both global and project-scoped memories.",
    {
      limit: z.number().optional().describe("Maximum number of results (default: 50)"),
      tags: z.array(z.string()).optional().describe("Filter by tags"),
      types: z.array(z.enum(["rule", "decision", "fact", "note"])).optional().describe("Filter by memory types"),
    },
    async ({ limit, tags, types }) => {
      try {
        const memories = await listMemories({ 
          limit, 
          tags, 
          projectId: projectId ?? undefined,
          types: types as MemoryType[] | undefined,
        });

        if (memories.length === 0) {
          return {
            content: [{ type: "text", text: "No memories found." }],
          };
        }

        const formatted = memories.map(formatMemory).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `${memories.length} memories:\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to list memories: ${error instanceof Error ? error.message : "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: forget_memory
  server.tool(
    "forget_memory",
    "Soft-delete a memory by ID. The memory can be recovered if needed.",
    {
      id: z.string().describe("The memory ID to forget"),
    },
    async ({ id }) => {
      try {
        const deleted = await forgetMemory(id);
        if (deleted) {
          return {
            content: [{ type: "text", text: `Forgot memory ${id}` }],
          };
        }
        return {
          content: [{ type: "text", text: `Memory ${id} not found or already forgotten.` }],
          isError: true,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to forget memory: ${error instanceof Error ? error.message : "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
