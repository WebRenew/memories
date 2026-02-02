import { Command } from "commander";
import chalk from "chalk";
import { getDb, getConfigDir } from "../lib/db.js";
import { getProjectId, getGitRoot } from "../lib/git.js";
import { addMemory } from "../lib/memory.js";

export const initCommand = new Command("init")
  .description("Initialize memories for the current project or globally")
  .option("-g, --global", "Initialize global memories (user-wide)")
  .option("-r, --rule <rule>", "Add an initial rule", (val, acc: string[]) => [...acc, val], [])
  .action(async (opts: { global?: boolean; rule?: string[] }) => {
    try {
      // Ensure database is initialized
      await getDb();
      const configDir = getConfigDir();

      if (opts.global) {
        console.log(chalk.green("✓") + " Initialized global memories");
        console.log(chalk.dim(`  Database: ${configDir}/local.db`));
      } else {
        const projectId = getProjectId();
        const gitRoot = getGitRoot();

        if (!projectId) {
          console.log(chalk.yellow("⚠") + " Not in a git repository.");
          console.log(chalk.dim("  Run from a git repo for project-scoped memories, or use --global"));
          return;
        }

        console.log(chalk.green("✓") + " Initialized project memories");
        console.log(chalk.dim(`  Project: ${projectId}`));
        console.log(chalk.dim(`  Root: ${gitRoot}`));
        console.log(chalk.dim(`  Database: ${configDir}/local.db`));
      }

      // Add initial rules if provided
      if (opts.rule?.length) {
        console.log("");
        console.log(chalk.blue("Adding rules:"));
        for (const rule of opts.rule) {
          const memory = await addMemory(rule, { 
            type: "rule", 
            global: opts.global 
          });
          console.log(chalk.dim(`  ${memory.id}: ${rule}`));
        }
      }

      console.log("");
      console.log(chalk.dim("Quick start:"));
      console.log(chalk.dim(`  memories add "Your first memory"`));
      console.log(chalk.dim(`  memories add --rule "Always use TypeScript strict mode"`));
      console.log(chalk.dim(`  memories recall "what are my coding preferences"`));
    } catch (error) {
      console.error(chalk.red("✗") + " Failed to initialize:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
