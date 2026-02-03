import { Command } from "commander";
import chalk from "chalk";
import { readAuth, saveAuth, clearAuth } from "../lib/auth.js";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";

const DEFAULT_API_URL = "https://memories.sh";

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "start"
        : "xdg-open";
  execFile(cmd, [url], () => {
    // Best-effort, ignore errors
  });
}

export const loginCommand = new Command("login")
  .description("Log in to memories.sh to enable cloud sync")
  .option("--api-url <url>", "API base URL", DEFAULT_API_URL)
  .action(async (opts: { apiUrl: string }) => {
    const existing = await readAuth();
    if (existing) {
      console.log(
        chalk.yellow("!") +
          ` Already logged in as ${chalk.bold(existing.email)}`
      );
      console.log(`  Run ${chalk.dim("memories logout")} to sign out first.`);
      return;
    }

    const code = randomBytes(16).toString("hex");
    const authUrl = `${opts.apiUrl}/app/auth/cli?code=${code}`;

    console.log(
      chalk.bold("\nOpen this URL in your browser to log in:\n")
    );
    console.log(`  ${chalk.cyan(authUrl)}\n`);

    // Try to open browser automatically
    try {
      openBrowser(authUrl);
    } catch {
      // Browser open is best-effort
    }

    console.log(chalk.dim("Waiting for authorization..."));

    // Poll for the token
    const maxAttempts = 60; // 5 minutes at 5s intervals
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      try {
        const res = await fetch(`${opts.apiUrl}/api/auth/cli`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", code }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            token: string;
            email: string;
          };
          await saveAuth({
            token: data.token,
            email: data.email,
            apiUrl: opts.apiUrl,
          });
          console.log(
            chalk.green("\n✓") +
              ` Logged in as ${chalk.bold(data.email)}`
          );
          console.log(
            chalk.dim(
              "  Your cloud database has been provisioned automatically."
            )
          );
          return;
        }

        if (res.status !== 202) {
          // 202 = still waiting, anything else is an error
          const text = await res.text();
          console.error(chalk.red("✗") + ` Authorization failed: ${text}`);
          return;
        }
      } catch {
        // Network error, keep polling
      }
    }

    console.error(
      chalk.red("✗") + " Authorization timed out. Please try again."
    );
  });

export const logoutCommand = new Command("logout")
  .description("Log out of memories.sh")
  .action(async () => {
    const existing = await readAuth();
    if (!existing) {
      console.log("Not logged in.");
      return;
    }

    await clearAuth();
    console.log(chalk.green("✓") + " Logged out successfully.");
  });
