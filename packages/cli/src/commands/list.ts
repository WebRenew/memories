import { Command } from "commander";
import { listMemories } from "../lib/memory.js";

export const listCommand = new Command("list")
  .description("List memories")
  .option("-l, --limit <n>", "Max results", "50")
  .option("-t, --tags <tags>", "Filter by comma-separated tags")
  .action(async (opts: { limit: string; tags?: string }) => {
    const tags = opts.tags?.split(",").map((t) => t.trim());
    const memories = await listMemories({
      limit: parseInt(opts.limit, 10),
      tags,
    });

    if (memories.length === 0) {
      console.log("No memories found.");
      return;
    }

    for (const m of memories) {
      const tags = m.tags ? ` [${m.tags}]` : "";
      console.log(`${m.id}  ${m.content}${tags}  (${m.created_at})`);
    }
  });
