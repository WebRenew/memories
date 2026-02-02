import { Command } from "commander";
import chalk from "chalk";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const HOOK_MARKER_START = "# >>> memories.sh hook >>>";
const HOOK_MARKER_END = "# <<< memories.sh hook <<<";
const HOOK_SNIPPET = `
${HOOK_MARKER_START}
# Auto-generate IDE rule files from memories
if command -v memories &> /dev/null; then
  memories generate all --force 2>/dev/null || true
  git add -A -- .cursor/rules/memories.mdc CLAUDE.md AGENTS.md .github/copilot-instructions.md .windsurf/rules/memories.md .clinerules/memories.md .roo/rules/memories.md GEMINI.md 2>/dev/null || true
fi
${HOOK_MARKER_END}`;

function getGitDir(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--git-dir"], { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function getHookPath(hookName: string): string | null {
  const gitDir = getGitDir();
  if (!gitDir) return null;
  return join(gitDir, "hooks", hookName);
}

export const hookCommand = new Command("hook")
  .description("Manage git hooks for auto-generating rule files");

hookCommand.addCommand(
  new Command("install")
    .description("Install pre-commit hook to auto-generate rule files")
    .option("--hook <name>", "Hook name (default: pre-commit)", "pre-commit")
    .action(async (opts: { hook: string }) => {
      try {
        const hookPath = getHookPath(opts.hook);
        if (!hookPath) {
          console.error(chalk.red("✗") + " Not in a git repository");
          process.exit(1);
        }

        if (existsSync(hookPath)) {
          const content = await readFile(hookPath, "utf-8");
          if (content.includes(HOOK_MARKER_START)) {
            console.log(chalk.dim("Hook already installed. Use 'memories hook uninstall' first to reinstall."));
            return;
          }
          // Append to existing hook
          await writeFile(hookPath, content.trimEnd() + "\n" + HOOK_SNIPPET + "\n", "utf-8");
        } else {
          // Create new hook file
          await writeFile(hookPath, "#!/bin/sh\n" + HOOK_SNIPPET + "\n", "utf-8");
        }

        await chmod(hookPath, 0o755);
        console.log(chalk.green("✓") + ` Installed memories hook in ${chalk.dim(opts.hook)}`);
        console.log(chalk.dim("  Rule files will auto-generate on each commit."));
      } catch (error) {
        console.error(chalk.red("✗") + " Failed to install hook:", error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    }),
);

hookCommand.addCommand(
  new Command("uninstall")
    .description("Remove the memories pre-commit hook")
    .option("--hook <name>", "Hook name (default: pre-commit)", "pre-commit")
    .action(async (opts: { hook: string }) => {
      try {
        const hookPath = getHookPath(opts.hook);
        if (!hookPath) {
          console.error(chalk.red("✗") + " Not in a git repository");
          process.exit(1);
        }

        if (!existsSync(hookPath)) {
          console.log(chalk.dim("No hook file found."));
          return;
        }

        const content = await readFile(hookPath, "utf-8");
        if (!content.includes(HOOK_MARKER_START)) {
          console.log(chalk.dim("No memories hook found in " + opts.hook));
          return;
        }

        // Remove our section
        const regex = new RegExp(
          `\\n?${escapeRegex(HOOK_MARKER_START)}[\\s\\S]*?${escapeRegex(HOOK_MARKER_END)}\\n?`,
        );
        const cleaned = content.replace(regex, "\n");

        // If only shebang remains, remove the file entirely
        if (cleaned.trim() === "#!/bin/sh" || cleaned.trim() === "") {
          const { unlink } = await import("node:fs/promises");
          await unlink(hookPath);
          console.log(chalk.green("✓") + ` Removed ${chalk.dim(opts.hook)} hook (was memories-only)`);
        } else {
          await writeFile(hookPath, cleaned, "utf-8");
          console.log(chalk.green("✓") + ` Removed memories section from ${chalk.dim(opts.hook)}`);
        }
      } catch (error) {
        console.error(chalk.red("✗") + " Failed to uninstall hook:", error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    }),
);

hookCommand.addCommand(
  new Command("status")
    .description("Check if the memories hook is installed")
    .option("--hook <name>", "Hook name (default: pre-commit)", "pre-commit")
    .action(async (opts: { hook: string }) => {
      try {
        const hookPath = getHookPath(opts.hook);
        if (!hookPath) {
          console.error(chalk.red("✗") + " Not in a git repository");
          process.exit(1);
        }

        if (!existsSync(hookPath)) {
          console.log(chalk.dim("Not installed") + ` — no ${opts.hook} hook found`);
          return;
        }

        const content = await readFile(hookPath, "utf-8");
        if (content.includes(HOOK_MARKER_START)) {
          console.log(chalk.green("✓") + ` Installed in ${chalk.dim(hookPath)}`);
        } else {
          console.log(chalk.dim("Not installed") + ` — ${opts.hook} exists but has no memories section`);
        }
      } catch (error) {
        console.error(chalk.red("✗") + " Failed to check hook:", error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    }),
);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
