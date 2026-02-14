import { readAuth, getApiClient } from "../lib/auth.js";
import { getProjectId } from "../lib/git.js";
import { OPTIONAL_CONFIG_PATHS } from "./files-targets.js";

// ─── Constants ───────────────────────────────────────────────────────────────

export const REDACTED_PLACEHOLDER = "[REDACTED]";
export const CLOUD_AUTH_REQUIRED_MESSAGE =
  "Cloud config secret sync requires login. Run memories login, or use local-only mode (omit --include-config).";

const SENSITIVE_CONFIG_KEY_PATTERN = [
  "token",
  "secret",
  "password",
  "passphrase",
  "api[_-]?key",
  "private[_-]?key",
  "client[_-]?secret",
  "access[_-]?token",
  "refresh[_-]?token",
  "authorization",
  "cookie",
].join("|");

export const SENSITIVE_DOUBLE_QUOTED_VALUE_RE = new RegExp(
  `("([^"\\\\]*(?:${SENSITIVE_CONFIG_KEY_PATTERN})[^"\\\\]*)"\\s*:\\s*)"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`,
  "gi",
);
export const SENSITIVE_SINGLE_QUOTED_VALUE_RE = new RegExp(
  `('([^'\\\\]*(?:${SENSITIVE_CONFIG_KEY_PATTERN})[^'\\\\]*)'\\s*:\\s*)'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'`,
  "gi",
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OptionalConfigSanitization {
  content: string;
  redactions: number;
  secrets: Record<string, string>;
}

export interface ConfigVaultEntry {
  scope: "global" | "project";
  project_id?: string;
  integration: string;
  config_path: string;
  secrets: Record<string, string>;
}

export interface VaultOperationResult {
  error?: string;
  proRequired?: boolean;
  unauthenticated?: boolean;
}

// ─── Sanitization ────────────────────────────────────────────────────────────

export function sanitizeOptionalConfig(path: string, content: string): OptionalConfigSanitization {
  if (!OPTIONAL_CONFIG_PATHS.has(path)) {
    return { content, redactions: 0, secrets: {} };
  }

  const secrets: Record<string, string> = {};
  let redactions = 0;
  let sanitized = content.replace(SENSITIVE_DOUBLE_QUOTED_VALUE_RE, (_match, prefix, key, value) => {
    if (typeof key === "string" && typeof value === "string") {
      secrets[key] = value;
    }
    redactions += 1;
    return `${prefix}"${REDACTED_PLACEHOLDER}"`;
  });

  sanitized = sanitized.replace(SENSITIVE_SINGLE_QUOTED_VALUE_RE, (_match, prefix, key, value) => {
    if (typeof key === "string" && typeof value === "string") {
      secrets[key] = value;
    }
    redactions += 1;
    return `${prefix}'${REDACTED_PLACEHOLDER}'`;
  });

  return { content: sanitized, redactions, secrets };
}

export function hydrateOptionalConfig(path: string, content: string, secrets: Record<string, string>): { content: string; hydrated: number } {
  if (!OPTIONAL_CONFIG_PATHS.has(path)) {
    return { content, hydrated: 0 };
  }

  let hydrated = 0;
  let out = content.replace(SENSITIVE_DOUBLE_QUOTED_VALUE_RE, (match, prefix, key, value) => {
    if (value !== REDACTED_PLACEHOLDER) return match;
    const secret = secrets[key];
    if (typeof secret !== "string" || secret.length === 0) return match;
    hydrated += 1;
    return `${prefix}"${secret}"`;
  });

  out = out.replace(SENSITIVE_SINGLE_QUOTED_VALUE_RE, (match, prefix, key, value) => {
    if (value !== REDACTED_PLACEHOLDER) return match;
    const secret = secrets[key];
    if (typeof secret !== "string" || secret.length === 0) return match;
    hydrated += 1;
    return `${prefix}'${secret}'`;
  });

  return { content: out, hydrated };
}

// ─── Vault API ───────────────────────────────────────────────────────────────

export function configProjectId(scope: string, cwd: string): string | null {
  if (scope === "global") return null;
  return getProjectId(cwd);
}

export async function pushConfigSecretsToVault(entries: ConfigVaultEntry[]): Promise<{ synced: number } & VaultOperationResult> {
  if (entries.length === 0) return { synced: 0 };

  const auth = await readAuth();
  if (!auth) {
    return { synced: 0, unauthenticated: true, error: CLOUD_AUTH_REQUIRED_MESSAGE };
  }

  const apiFetch = getApiClient(auth);
  const response = await apiFetch("/api/files/config-secrets", {
    method: "POST",
    body: JSON.stringify({ entries }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    if (response.status === 403) {
      return {
        synced: 0,
        proRequired: true,
        error: bodyText || "Vault-backed config secret sync is a Pro feature.",
      };
    }
    return {
      synced: 0,
      error: bodyText || `Failed to sync config secrets (${response.status})`,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as { synced?: number };
  return { synced: payload.synced ?? 0 };
}

export async function fetchConfigSecretsFromVault(params: {
  scope: "global" | "project";
  projectId?: string | null;
  integration: string;
  configPath: string;
}): Promise<{ secrets: Record<string, string> } & VaultOperationResult> {
  const auth = await readAuth();
  if (!auth) {
    return { secrets: {}, unauthenticated: true, error: CLOUD_AUTH_REQUIRED_MESSAGE };
  }

  const apiFetch = getApiClient(auth);
  const query = new URLSearchParams({
    scope: params.scope,
    integration: params.integration,
    config_path: params.configPath,
  });
  if (params.scope === "project" && params.projectId) {
    query.set("project_id", params.projectId);
  }

  const response = await apiFetch(`/api/files/config-secrets?${query.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const bodyText = await response.text();
    if (response.status === 403) {
      return {
        secrets: {},
        proRequired: true,
        error: bodyText || "Vault-backed config secret hydration is a Pro feature.",
      };
    }
    if (response.status === 404) {
      return { secrets: {} };
    }
    return {
      secrets: {},
      error: bodyText || `Failed to fetch config secrets (${response.status})`,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as { secrets?: Record<string, string> };
  return { secrets: payload.secrets ?? {} };
}
