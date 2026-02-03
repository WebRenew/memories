import { Command } from "commander";
import chalk from "chalk";
import { addMemory, type MemoryType } from "../lib/memory.js";
import { readAuth, getApiClient } from "../lib/auth.js";

const VALID_TYPES: MemoryType[] = ["rule", "decision", "fact", "note"];

export const addCommand = new Command("add")
  .description("Add a new memory")
  .argument("<content>", "Memory content")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .option("-g, --global", "Store as global memory (default: project-scoped if in git repo)")
  .option("--type <type>", "Memory type: rule, decision, fact, note (default: note)")
  .option("-r, --rule", "Shorthand for --type rule")
  .option("-d, --decision", "Shorthand for --type decision")
  .option("-f, --fact", "Shorthand for --type fact")
  .action(async (content: string, opts: { 
    tags?: string; 
    global?: boolean;
    type?: string;
    rule?: boolean;
    decision?: boolean;
    fact?: boolean;
  }) => {
    try {
      // Check rate limits if logged in
      const auth = await readAuth();
      if (auth) {
        try {
          const apiFetch = getApiClient(auth);
          const res = await apiFetch("/api/db/limits");
          if (res.ok) {
            const limits = (await res.json()) as {
              plan: string;
              memoryLimit: number | null;
              memoryCount: number;
            };
            if (limits.memoryLimit !== null && limits.memoryCount >= limits.memoryLimit) {
              console.error(
                chalk.yellow("!") +
                  ` You've reached the free plan limit of ${limits.memoryLimit.toLocaleString()} memories.`
              );
              console.error(
                `  Upgrade at ${chalk.cyan("https://memories.sh/app/upgrade")}`
              );
              process.exit(1);
            }
          }
        } catch {
          // If limit check fails, allow the add to proceed
        }
      }

      const tags = opts.tags?.split(",").map((t) => t.trim());
      
      // Determine type from flags
      let type: MemoryType = "note";
      if (opts.rule) type = "rule";
      else if (opts.decision) type = "decision";
      else if (opts.fact) type = "fact";
      else if (opts.type) {
        if (!VALID_TYPES.includes(opts.type as MemoryType)) {
          console.error(chalk.red("✗") + ` Invalid type "${opts.type}". Valid types: ${VALID_TYPES.join(", ")}`);
          process.exit(1);
        }
        type = opts.type as MemoryType;
      }

      const memory = await addMemory(content, { tags, global: opts.global, type });
      
      const typeIcon = type === "rule" ? "📌" : type === "decision" ? "💡" : type === "fact" ? "📋" : "📝";
      const scopeInfo = memory.scope === "global" 
        ? chalk.dim("(global)") 
        : chalk.dim(`(project)`);
      
      console.log(chalk.green("✓") + ` ${typeIcon} Stored ${type} ${chalk.dim(memory.id)} ${scopeInfo}`);
    } catch (error) {
      console.error(chalk.red("✗") + " Failed to add memory:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
