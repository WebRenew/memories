import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { parse, stringify } from "yaml";

const AGENTS_DIR = ".agents";
const CONFIG_FILE = "config.yaml";

interface AgentConfig {
  name?: string;
  description?: string;
  version?: string;
  memory?: {
    provider?: string;
    store?: string;
  };
}

export async function initConfig(dir: string): Promise<string> {
  const agentsDir = join(dir, AGENTS_DIR);
  await mkdir(agentsDir, { recursive: true });

  const configPath = join(agentsDir, CONFIG_FILE);
  if (!existsSync(configPath)) {
    const defaultConfig: AgentConfig = {
      name: "my-project",
      description: "Agent memory configuration",
      version: "0.1.0",
      memory: {
        provider: "local",
        store: "~/.config/memories/local.db",
      },
    };
    await writeFile(configPath, stringify(defaultConfig), "utf-8");
  }

  return configPath;
}

export async function readConfig(dir: string): Promise<AgentConfig | null> {
  const configPath = join(dir, AGENTS_DIR, CONFIG_FILE);
  if (!existsSync(configPath)) return null;

  const raw = await readFile(configPath, "utf-8");
  return parse(raw) as AgentConfig;
}
