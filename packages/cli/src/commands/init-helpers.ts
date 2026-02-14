import chalk from "chalk";
import { getApiClient } from "../lib/auth.js";
import type { DetectedTool, Tool } from "../lib/setup.js";

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_API_URL = "https://memories.sh";
export const PERSONAL_WORKSPACE_VALUE = "__personal_workspace__";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SetupMode = "auto" | "local" | "cloud";
export type SetupScope = "auto" | "project" | "global";

export interface SetupOrganization {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
}

export interface SetupUserProfile {
  id: string;
  email: string;
  current_org_id: string | null;
}

export interface SetupOrganizationsResponse {
  organizations: SetupOrganization[];
}

export interface SetupUserResponse {
  user: SetupUserProfile;
}

export interface ResolvedWorkspaceTarget {
  orgId: string | null;
  label: string;
}

export interface IntegrationHealthResponse {
  health?: {
    workspace?: {
      label?: string;
      hasDatabase?: boolean;
      canProvision?: boolean;
      ownerType?: "user" | "organization" | null;
    };
  };
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

export function parseSetupMode(rawMode: string | undefined): SetupMode {
  if (!rawMode) return "auto";
  const normalized = rawMode.trim().toLowerCase();
  if (normalized === "auto" || normalized === "local" || normalized === "cloud") {
    return normalized;
  }
  throw new Error(`Invalid setup mode "${rawMode}". Use one of: auto, local, cloud.`);
}

export function parseSetupScope(rawScope: string | undefined): SetupScope {
  if (!rawScope) return "auto";
  const normalized = rawScope.trim().toLowerCase();
  if (normalized === "auto" || normalized === "project" || normalized === "global") {
    return normalized;
  }
  throw new Error(`Invalid scope "${rawScope}". Use one of: auto, project, global.`);
}

// ─── Workspace Resolution ────────────────────────────────────────────────────

export function normalizeWorkspaceTarget(target: string): string {
  return target.trim().toLowerCase();
}

export function isPersonalWorkspaceTarget(target: string): boolean {
  const normalized = normalizeWorkspaceTarget(target);
  return normalized === "personal" || normalized === "none";
}

export function resolveWorkspaceTarget(
  organizations: SetupOrganization[],
  rawTarget: string,
): ResolvedWorkspaceTarget {
  if (isPersonalWorkspaceTarget(rawTarget)) {
    return {
      orgId: null,
      label: "Personal workspace",
    };
  }

  const target = normalizeWorkspaceTarget(rawTarget);
  const directMatch = organizations.find(
    (org) => org.id === rawTarget || normalizeWorkspaceTarget(org.slug) === target,
  );
  if (directMatch) {
    return {
      orgId: directMatch.id,
      label: `${directMatch.name} (${directMatch.slug})`,
    };
  }

  const exactNameMatches = organizations.filter(
    (org) => normalizeWorkspaceTarget(org.name) === target,
  );
  if (exactNameMatches.length === 1) {
    const org = exactNameMatches[0];
    return {
      orgId: org.id,
      label: `${org.name} (${org.slug})`,
    };
  }

  if (exactNameMatches.length > 1) {
    throw new Error(
      `Multiple organizations match "${rawTarget}". Use the organization slug or ID.`,
    );
  }

  const prefixSlugMatches = organizations.filter((org) =>
    normalizeWorkspaceTarget(org.slug).startsWith(target),
  );
  if (prefixSlugMatches.length === 1) {
    const org = prefixSlugMatches[0];
    return {
      orgId: org.id,
      label: `${org.name} (${org.slug})`,
    };
  }

  if (prefixSlugMatches.length > 1) {
    throw new Error(`Multiple organizations match "${rawTarget}". Be more specific.`);
  }

  throw new Error(
    `Organization "${rawTarget}" not found. Run ${chalk.cyan("memories org list")} for available targets.`,
  );
}

export function workspaceLabel(organizations: SetupOrganization[], orgId: string | null): string {
  if (!orgId) return "Personal workspace";
  const org = organizations.find((item) => item.id === orgId);
  if (!org) return `Organization (${orgId})`;
  return `${org.name} (${org.slug})`;
}

// ─── Tool Helpers ────────────────────────────────────────────────────────────

export function selectedTool(tool: Tool): DetectedTool {
  return {
    tool,
    hasConfig: false,
    hasMcp: false,
    hasInstructions: false,
    globalConfig: false,
  };
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

export async function fetchOrganizationsAndProfile(apiFetch: ReturnType<typeof getApiClient>): Promise<{
  organizations: SetupOrganization[];
  user: SetupUserProfile;
}> {
  const [orgsRes, userRes] = await Promise.all([
    apiFetch("/api/orgs"),
    apiFetch("/api/user"),
  ]);

  if (!orgsRes.ok) {
    const text = await orgsRes.text();
    throw new Error(`Failed to fetch organizations: ${text || orgsRes.statusText}`);
  }

  if (!userRes.ok) {
    const text = await userRes.text();
    throw new Error(`Failed to fetch user profile: ${text || userRes.statusText}`);
  }

  const orgsBody = (await orgsRes.json()) as SetupOrganizationsResponse;
  const userBody = (await userRes.json()) as SetupUserResponse;

  return {
    organizations: orgsBody.organizations ?? [],
    user: userBody.user,
  };
}

export async function switchWorkspace(
  apiFetch: ReturnType<typeof getApiClient>,
  orgId: string | null,
): Promise<void> {
  const response = await apiFetch("/api/user", {
    method: "PATCH",
    body: JSON.stringify({ current_org_id: orgId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to switch workspace: ${text || response.statusText}`);
  }
}

export async function fetchIntegrationHealth(
  apiFetch: ReturnType<typeof getApiClient>,
): Promise<IntegrationHealthResponse | null> {
  const response = await apiFetch("/api/integration/health", { method: "GET" });
  if (!response.ok) return null;
  return (await response.json()) as IntegrationHealthResponse;
}

export async function provisionWorkspaceDatabase(
  apiFetch: ReturnType<typeof getApiClient>,
): Promise<boolean> {
  const response = await apiFetch("/api/db/provision", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return response.ok;
}
