import { Command } from "commander";

export const serveCommand = new Command("serve")
  .description("Start the MCP server (coming soon)")
  .action(() => {
    console.log("MCP server is not yet implemented. Coming in Phase 2.");
  });
