import { Command } from "commander";
import chalk from "chalk";
import { forgetMemory } from "../lib/memory.js";

export const forgetCommand = new Command("forget")
  .description("Soft-delete a memory by ID")
  .argument("<id>", "Memory ID to forget")
  .action(async (id: string) => {
    try {
      const deleted = await forgetMemory(id);
      if (deleted) {
        console.log(chalk.green("✓") + ` Forgot memory ${chalk.dim(id)}`);
      } else {
        console.error(chalk.red("✗") + ` Memory ${id} not found or already forgotten.`);
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("✗") + " Failed to forget memory:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
