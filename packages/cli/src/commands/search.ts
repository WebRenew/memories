import { Command } from "commander";
import chalk from "chalk";
import { searchMemories, type Memory, type MemoryType } from "../lib/memory.js";
import { getProjectId } from "../lib/git.js";

const TYPE_ICONS: Record<MemoryType, string> = {
  rule: "📌",
  decision: "💡",
  fact: "📋",
  note: "📝",
};

const VALID_TYPES: MemoryType[] = ["rule", "decision", "fact", "note"];

function formatMemory(m: Memory): string {
  const icon = TYPE_ICONS[m.type] || "📝";
  const scope = m.scope === "global" ? chalk.dim("G") : chalk.dim("P");
  const tags = m.tags ? chalk.dim(` [${m.tags}]`) : "";
  return `${icon} ${scope} ${chalk.dim(m.id)}  ${m.content}${tags}`;
}

export const searchCommand = new Command("search")
  .description("Search memories using full-text search")
  .argument("<query>", "Search query")
  .option("-l, --limit <n>", "Max results", "20")
  .option("--type <type>", "Filter by type: rule, decision, fact, note")
  .option("-g, --global", "Search only global memories")
  .option("--project-only", "Search only project memories (exclude global)")
  .option("--json", "Output as JSON")
  .action(async (query: string, opts: { 
    limit: string; 
    type?: string;
    global?: boolean; 
    projectOnly?: boolean;
    json?: boolean;
  }) => {
    try {
      // Type filter
      let types: MemoryType[] | undefined;
      if (opts.type) {
        if (!VALID_TYPES.includes(opts.type as MemoryType)) {
          console.error(chalk.red("✗") + ` Invalid type "${opts.type}". Valid types: ${VALID_TYPES.join(", ")}`);
          process.exit(1);
        }
        types = [opts.type as MemoryType];
      }

      // Determine scope filtering
      let globalOnly = false;
      let includeGlobal = true;
      let projectId: string | undefined;
      
      if (opts.global) {
        globalOnly = true;
      } else if (opts.projectOnly) {
        includeGlobal = false;
        projectId = getProjectId() ?? undefined;
        if (!projectId) {
          console.log(chalk.yellow("⚠") + " Not in a git repository. No project memories to search.");
          return;
        }
      }

      const memories = await searchMemories(query, {
        limit: parseInt(opts.limit, 10),
        types,
        projectId,
        includeGlobal,
        globalOnly,
      });

      if (opts.json) {
        console.log(JSON.stringify(memories, null, 2));
        return;
      }

      if (memories.length === 0) {
        console.log(chalk.dim(`No memories found matching "${query}"`));
        return;
      }

      console.log(chalk.bold(`Results for "${query}":`));
      console.log("");
      for (const m of memories) {
        console.log(formatMemory(m));
      }
      
      console.log(chalk.dim(`\n${memories.length} results`));
    } catch (error) {
      console.error(chalk.red("✗") + " Failed to search:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
