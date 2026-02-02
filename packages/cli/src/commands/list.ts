import { Command } from "commander";
import chalk from "chalk";
import { listMemories, type Memory, type MemoryType } from "../lib/memory.js";
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
  const date = chalk.dim(`(${m.created_at.split("T")[0]})`);
  return `${icon} ${scope} ${chalk.dim(m.id)}  ${m.content}${tags}  ${date}`;
}

export const listCommand = new Command("list")
  .description("List memories")
  .option("-l, --limit <n>", "Max results", "50")
  .option("-t, --tags <tags>", "Filter by comma-separated tags")
  .option("--type <type>", "Filter by type: rule, decision, fact, note")
  .option("-g, --global", "Show only global memories")
  .option("--project-only", "Show only project memories (exclude global)")
  .option("--json", "Output as JSON")
  .action(async (opts: { 
    limit: string; 
    tags?: string; 
    type?: string;
    global?: boolean; 
    projectOnly?: boolean;
    json?: boolean;
  }) => {
    try {
      const tags = opts.tags?.split(",").map((t) => t.trim());
      
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
          console.log(chalk.yellow("⚠") + " Not in a git repository. No project memories to show.");
          return;
        }
      }

      const memories = await listMemories({
        limit: parseInt(opts.limit, 10),
        tags,
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
        console.log(chalk.dim("No memories found."));
        return;
      }

      for (const m of memories) {
        console.log(formatMemory(m));
      }
      
      console.log(chalk.dim(`\n${memories.length} memories`));
    } catch (error) {
      console.error(chalk.red("✗") + " Failed to list memories:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
