import { Command } from "commander";
import { searchMemories } from "../lib/memory.js";

export const searchCommand = new Command("search")
  .description("Search memories")
  .argument("<query>", "Search query")
  .option("-l, --limit <n>", "Max results", "20")
  .action(async (query: string, opts: { limit: string }) => {
    const memories = await searchMemories(query, {
      limit: parseInt(opts.limit, 10),
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
