import { Command } from "commander";
import chalk from "chalk";
import { getDb } from "../lib/db.js";
import * as ui from "../lib/ui.js";
import { getProjectId } from "../lib/git.js";
import { computeStorageMetrics, evaluateStorageWarnings } from "../lib/storage-health.js";

export const statsCommand = new Command("stats")
  .description("Show memory statistics")
  .option("--json", "Output as JSON")
  .action(async (opts: { json?: boolean }) => {
    try {
      const db = await getDb();
      const projectId = getProjectId();

      // Count by type and scope
      const result = await db.execute({
        sql: `SELECT type, scope, COUNT(*) as count FROM memories WHERE deleted_at IS NULL GROUP BY type, scope ORDER BY type, scope`,
        args: [],
      });

      // Total count
      const totalResult = await db.execute({
        sql: `SELECT COUNT(*) as total FROM memories WHERE deleted_at IS NULL`,
        args: [],
      });
      const total = Number(totalResult.rows[0]?.total ?? 0);

      // Deleted count
      const deletedResult = await db.execute({
        sql: `SELECT COUNT(*) as deleted FROM memories WHERE deleted_at IS NOT NULL`,
        args: [],
      });
      const deleted = Number(deletedResult.rows[0]?.deleted ?? 0);
      const storageMetrics = computeStorageMetrics(total, deleted);
      const warnings = evaluateStorageWarnings(storageMetrics);

      // Project count
      const projectCount = projectId
        ? Number(
            (await db.execute({
              sql: `SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL AND scope = 'project' AND project_id = ?`,
              args: [projectId],
            })).rows[0]?.count ?? 0,
          )
        : null;

      const rows = result.rows as unknown as { type: string; scope: string; count: number }[];

      if (opts.json) {
        const data = {
          total,
          deleted,
          project_id: projectId,
          project_count: projectCount,
          warnings,
          breakdown: rows.map((r) => ({ type: r.type, scope: r.scope, count: Number(r.count) })),
        };
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      // Table output
      console.log(chalk.bold("Memory Statistics\n"));

      if (projectId) {
        console.log(`  Project: ${chalk.dim(projectId)}`);
      }
      console.log(`  Total:   ${chalk.bold(String(total))} active, ${chalk.dim(String(deleted))} deleted\n`);

      if (rows.length === 0) {
        console.log(chalk.dim("  No memories yet. Add one with: memories add \"Your memory\""));
        return;
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow("  Storage Warnings:"));
        for (const warning of warnings) {
          console.log(chalk.yellow(`  WARN ${warning.message}`));
        }
        console.log("");
      }

      // Build table
      const typeWidths = { rule: 8, decision: 8, fact: 8, note: 8 };
      console.log(
        `  ${chalk.dim("Type".padEnd(12))}${chalk.dim("Scope".padEnd(10))}${chalk.dim("Count")}`,
      );
      console.log(chalk.dim("  " + "─".repeat(30)));

      for (const row of rows) {
        const type = row.type.padEnd(12);
        const scope = row.scope.padEnd(10);
        console.log(`  ${type}${scope}${Number(row.count)}`);
      }
    } catch (error) {
      ui.error("Failed to get stats: " + (error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });
