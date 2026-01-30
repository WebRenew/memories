import { Command } from "commander";
import { initConfig, readConfig } from "../lib/config.js";

export const configCommand = new Command("config")
  .description("Manage agent configuration");

configCommand
  .command("init")
  .description("Initialize .agents/config.yaml in current directory")
  .action(async () => {
    const path = await initConfig(process.cwd());
    console.log(`Created config at ${path}`);
  });

configCommand
  .command("show")
  .description("Show current agent configuration")
  .action(async () => {
    const config = await readConfig(process.cwd());
    if (!config) {
      console.log("No .agents/config.yaml found. Run `memories config init` first.");
      return;
    }
    console.log(JSON.stringify(config, null, 2));
  });
