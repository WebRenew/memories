import { Command } from "commander";
import { addMemory } from "../lib/memory.js";

export const addCommand = new Command("add")
  .description("Add a new memory")
  .argument("<content>", "Memory content")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .option("-p, --project <project>", "Project name")
  .action(async (content: string, opts: { tags?: string; project?: string }) => {
    const tags = opts.tags?.split(",").map((t) => t.trim());
    const memory = await addMemory(content, { tags, project: opts.project });
    console.log(`Stored memory ${memory.id}`);
  });
