import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const AUTH_DIR = join(homedir(), ".config", "memories");
const AUTH_FILE = join(AUTH_DIR, "auth.json");

export interface AuthConfig {
  token: string;
  email: string;
  apiUrl: string;
}

export async function readAuth(): Promise<AuthConfig | null> {
  if (!existsSync(AUTH_FILE)) return null;
  try {
    const raw = await readFile(AUTH_FILE, "utf-8");
    return JSON.parse(raw) as AuthConfig;
  } catch {
    return null;
  }
}

export async function saveAuth(data: AuthConfig): Promise<void> {
  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(AUTH_FILE, JSON.stringify(data, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export async function clearAuth(): Promise<void> {
  if (existsSync(AUTH_FILE)) {
    await unlink(AUTH_FILE);
  }
}

/**
 * Creates a fetch wrapper that includes CLI auth headers.
 */
export function getApiClient(auth: AuthConfig) {
  return async function apiFetch(
    path: string,
    opts?: RequestInit
  ): Promise<Response> {
    const url = `${auth.apiUrl}${path}`;
    return fetch(url, {
      ...opts,
      headers: {
        ...opts?.headers,
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
    });
  };
}
