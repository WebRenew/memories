import { Command } from "commander";
import { forgetMemory } from "../lib/memory.js";

export const forgetCommand = new Command("forget")
  .description("Soft-delete a memory by ID")
  .argument("<id>", "Memory ID to forget")
  .action(async (id: string) => {
    const deleted = await forgetMemory(id);
    if (deleted) {
      console.log(`Forgot memory ${id}`);
    } else {
      console.error(`Memory ${id} not found or already forgotten.`);
      process.exitCode = 1;
    }
  });
