import { Command } from "commander";
import chalk from "chalk";
import { getDb, repairFtsSchema } from "../lib/db.js";
import * as ui from "../lib/ui.js";
import {
  buildChecks,
  buildNextSteps,
  normalizeRemediation,
  statusIcon,
  type DoctorCheckResult,
  type DoctorReport,
  type RunDoctorChecksOptions,
} from "./doctor-helpers.js";

// Re-export for backward compatibility (used by doctor.test.ts)
export { checkWritePath } from "./doctor-helpers.js";

export async function runDoctorChecks(options: RunDoctorChecksOptions = {}): Promise<DoctorReport> {
  const checks = buildChecks();
  const results: DoctorCheckResult[] = [];
  const fixes: DoctorReport["fixes"] = {
    applied: false,
    actions: [],
    errors: [],
  };

  for (const check of checks) {
    const outcome = await check.run();
    results.push({
      id: check.id,
      code: check.code,
      category: check.category,
      name: check.name,
      status: outcome.status,
      message: outcome.message,
      remediation: normalizeRemediation(outcome.remediation),
      details: outcome.details,
    });
  }

  if (options.fix) {
    fixes.applied = true;
    const db = await getDb();
    try {
      const purged = await db.execute("DELETE FROM memories WHERE deleted_at IS NOT NULL");
      fixes.actions.push(`Purged ${purged.rowsAffected} soft-deleted records`);
    } catch (error) {
      fixes.errors.push(`Failed to purge soft-deleted records: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    try {
      await repairFtsSchema(db);
      fixes.actions.push("Repaired FTS schema and rebuilt index");
    } catch (error) {
      fixes.errors.push(`Failed to repair FTS schema: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  const passed = results.filter((result) => result.status === "pass").length;
  const warned = results.filter((result) => result.status === "warn").length;
  const failed = results.filter((result) => result.status === "fail").length;
  const ok = failed === 0;
  const nextSteps = buildNextSteps(results);

  return {
    schemaVersion: "1.1",
    generatedAt: new Date().toISOString(),
    ok,
    summary: {
      passed,
      warned,
      failed,
    },
    checks: results,
    nextSteps,
    fixes,
  };
}

function printDoctorReport(report: DoctorReport, fixRequested: boolean): void {
  for (const check of report.checks) {
    const icon = statusIcon(check.status);
    const code = chalk.dim(`[${check.code}]`);
    console.log(`  ${icon} ${chalk.bold(check.name)} ${code}: ${check.message}`);
    if ((check.status === "warn" || check.status === "fail") && check.remediation && check.remediation.length > 0) {
      for (const step of check.remediation) {
        console.log(chalk.dim(`     ↳ ${step}`));
      }
    }
  }

  if (report.fixes.applied) {
    console.log(chalk.bold("\nFix actions:\n"));
    for (const action of report.fixes.actions) {
      console.log(`  ${chalk.green("✓")} ${action}`);
    }
    for (const error of report.fixes.errors) {
      console.log(`  ${chalk.yellow("⚠")} ${error}`);
    }
  }

  if (report.nextSteps.length > 0) {
    console.log(chalk.bold("\nNext steps:\n"));
    for (const step of report.nextSteps) {
      console.log(chalk.dim(`  • ${step}`));
    }
  }

  console.log();
  if (report.summary.failed > 0) {
    console.log(chalk.red("Critical issues detected.") + (fixRequested ? "" : " Run with --fix to attempt repairs."));
    return;
  }

  if (report.summary.warned > 0) {
    console.log(chalk.yellow("Checks passed with warnings.") + (fixRequested ? "" : " Review remediation steps above."));
    return;
  }

  console.log(chalk.green("All checks passed."));
}

export const doctorCommand = new Command("doctor")
  .description("Check memories health and diagnose issues")
  .option("--fix", "Attempt to fix issues found")
  .option("--json", "Output machine-readable JSON report")
  .option("--strict", "Exit with code 1 when warnings or failures are present")
  .action(async (opts: { fix?: boolean; json?: boolean; strict?: boolean }) => {
    try {
      if (!opts.json) {
        console.log(chalk.bold("memories doctor\n"));
      }

      const report = await runDoctorChecks({ fix: opts.fix });

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printDoctorReport(report, Boolean(opts.fix));
      }

      if (opts.strict && (report.summary.failed > 0 || report.summary.warned > 0)) {
        process.exitCode = 1;
      }
    } catch (error) {
      if (opts.json) {
        console.log(
          JSON.stringify(
            {
              schemaVersion: "1.1",
              ok: false,
              summary: {
                passed: 0,
                warned: 0,
                failed: 1,
              },
              checks: [],
              nextSteps: ["Run: memories setup", "Retry: memories doctor --json"],
              fixes: {
                applied: Boolean(opts.fix),
                actions: [],
                errors: [],
              },
              error: {
                code: "DOCTOR_EXECUTION_FAILED",
                message: error instanceof Error ? error.message : "Unknown error",
              },
            },
            null,
            2,
          ),
        );
      } else {
        ui.error("Doctor failed: " + (error instanceof Error ? error.message : "Unknown error"));
      }
      process.exit(1);
    }
  });
