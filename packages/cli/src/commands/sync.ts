import { Command } from "commander";
import { createDatabase, createDatabaseToken } from "../lib/turso.js";
import { saveSyncConfig, readSyncConfig, resetDb, syncDb } from "../lib/db.js";
import { unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const DB_PATH = join(homedir(), ".config", "memories", "local.db");

export const syncCommand = new Command("sync").description(
  "Manage remote sync"
);

syncCommand
  .command("enable")
  .description("Provision a Turso database and enable sync")
  .option("-o, --org <org>", "Turso organization", "webrenew")
  .action(async (opts: { org: string }) => {
    const existing = await readSyncConfig();
    if (existing) {
      console.log(`Sync already enabled: ${existing.syncUrl}`);
      console.log('Run "memories sync push" to sync now.');
      return;
    }

    console.log(`Creating database in ${opts.org}...`);
    const db = await createDatabase(opts.org);
    console.log(`Created database: ${db.name} (${db.hostname})`);

    console.log("Generating auth token...");
    const token = await createDatabaseToken(opts.org, db.name);

    const syncUrl = `libsql://${db.hostname}`;

    // Remove existing local DB so embedded replica creates it fresh with WAL
    if (existsSync(DB_PATH)) {
      resetDb();
      unlinkSync(DB_PATH);
    }

    await saveSyncConfig({
      syncUrl,
      syncToken: token,
      org: opts.org,
      dbName: db.name,
    });

    // Wait for Turso to finish provisioning the DB
    console.log("Waiting for database to be ready...");
    await new Promise((r) => setTimeout(r, 3000));

    // Force re-init with sync enabled
    resetDb();
    await syncDb();

    console.log(`Sync enabled: ${syncUrl}`);
  });

syncCommand
  .command("push")
  .description("Push local changes to remote")
  .action(async () => {
    const config = await readSyncConfig();
    if (!config) {
      console.error('Sync not enabled. Run "memories sync enable" first.');
      process.exitCode = 1;
      return;
    }

    await syncDb();
    console.log("Synced to remote.");
  });

syncCommand
  .command("status")
  .description("Show sync configuration")
  .action(async () => {
    const config = await readSyncConfig();
    if (!config) {
      console.log("Sync not enabled.");
      return;
    }
    console.log(`Remote: ${config.syncUrl}`);
    console.log(`Org: ${config.org}`);
    console.log(`Database: ${config.dbName}`);
  });
