import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { searchCommand } from "./commands/search.js";
import { listCommand } from "./commands/list.js";
import { forgetCommand } from "./commands/forget.js";
import { configCommand } from "./commands/config.js";
import { serveCommand } from "./commands/serve.js";
import { syncCommand } from "./commands/sync.js";

const program = new Command()
  .name("memories")
  .description("A local-first memory layer for AI agents")
  .version("0.1.0");

program.addCommand(addCommand);
program.addCommand(searchCommand);
program.addCommand(listCommand);
program.addCommand(forgetCommand);
program.addCommand(configCommand);
program.addCommand(serveCommand);
program.addCommand(syncCommand);

program.parse();
