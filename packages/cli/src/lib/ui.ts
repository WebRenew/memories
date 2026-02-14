import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import boxen from "boxen";

const memoriesGradient = gradient(["#a855f7", "#6366f1"]);

export function banner(): void {
  const text = figlet.textSync("memories", {
    font: "Small",
    horizontalLayout: "fitted",
  });
  console.log(memoriesGradient(text));
  console.log(chalk.dim("  One memory, every AI tool\n"));
}

export function success(message: string): void {
  console.log(chalk.green("✓") + " " + message);
}

export function warn(message: string): void {
  console.log(chalk.yellow("⚠") + " " + message);
}

export function error(message: string): void {
  console.error(chalk.red("✗") + " " + message);
}

export function info(message: string): void {
  console.log(chalk.blue("ℹ") + " " + message);
}

export function step(num: number, total: number, message: string): void {
  console.log(chalk.dim(`[${num}/${total}]`) + " " + message);
}

export function dim(message: string): void {
  console.log(chalk.dim("  " + message));
}

export function box(content: string, title?: string): void {
  console.log(
    boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: "round",
      borderColor: "gray",
      title: title,
      titleAlignment: "left",
    })
  );
}

export function nextSteps(steps: string[]): void {
  const content = steps.map((s) => chalk.dim("→ ") + s).join("\n");
  box(content, chalk.bold("Next steps"));
}

export function proFeature(feature: string): void {
  console.log(
    chalk.yellow("⭐") +
      " " +
      chalk.dim(`${feature} requires `) +
      chalk.bold("Pro") +
      chalk.dim(". Run ") +
      chalk.cyan("memories login") +
      chalk.dim(" to upgrade.")
  );
}
