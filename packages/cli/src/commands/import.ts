import { Command } from "commander";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import { addMemory, type MemoryType } from "../lib/memory.js";

interface ImportMemory {
  id?: string;
  content: string;
  type?: MemoryType;
  tags?: string[];
  scope?: "global" | "project";
}

interface ImportData {
  version?: string;
  memories: ImportMemory[];
}

export const importCommand = new Command("import")
  .description("Import memories from JSON or YAML file")
  .argument("<file>", "Input file path")
  .option("-f, --format <format>", "Input format: json, yaml (auto-detected from extension)")
  .option("-g, --global", "Import all as global memories (override file scope)")
  .option("--dry-run", "Show what would be imported without actually importing")
  .action(async (file: string, opts: { 
    format?: string;
    global?: boolean;
    dryRun?: boolean;
  }) => {
    try {
      const content = await readFile(file, "utf-8");
      
      // Auto-detect format from extension if not specified
      let format = opts.format;
      if (!format) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          format = "yaml";
        } else {
          format = "json";
        }
      }

      let data: ImportData;
      if (format === "yaml") {
        const yaml = await import("yaml");
        data = yaml.parse(content) as ImportData;
      } else {
        data = JSON.parse(content) as ImportData;
      }

      if (!data.memories || !Array.isArray(data.memories)) {
        console.error(chalk.red("✗") + " Invalid import file: missing 'memories' array");
        process.exit(1);
      }

      if (opts.dryRun) {
        console.log(chalk.blue("Dry run - would import:"));
        for (const m of data.memories) {
          const type = m.type || "note";
          const scope = opts.global ? "global" : (m.scope || "project");
          const tags = m.tags?.length ? ` [${m.tags.join(", ")}]` : "";
          console.log(`  ${type} (${scope}): ${m.content}${tags}`);
        }
        console.log(chalk.dim(`\n${data.memories.length} memories would be imported`));
        return;
      }

      let imported = 0;
      let failed = 0;

      for (const m of data.memories) {
        try {
          await addMemory(m.content, {
            type: m.type || "note",
            tags: m.tags,
            global: opts.global || m.scope === "global",
          });
          imported++;
        } catch (error) {
          console.error(chalk.yellow("⚠") + ` Failed to import: ${m.content.slice(0, 50)}...`);
          failed++;
        }
      }

      console.log(chalk.green("✓") + ` Imported ${imported} memories`);
      if (failed > 0) {
        console.log(chalk.yellow("⚠") + ` ${failed} memories failed to import`);
      }
    } catch (error) {
      console.error(chalk.red("✗") + " Failed to import:", error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
