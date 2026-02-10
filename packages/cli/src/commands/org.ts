import { Command } from "commander";
import chalk from "chalk";
import { getApiClient, readAuth } from "../lib/auth.js";
import * as ui from "../lib/ui.js";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
}

interface UserProfile {
  id: string;
  email: string;
  current_org_id: string | null;
}

interface OrganizationsResponse {
  organizations: Organization[];
}

interface UserResponse {
  user: UserProfile;
}

interface ResolvedWorkspace {
  orgId: string | null;
  label: string;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function isPersonalTarget(target: string): boolean {
  const value = normalize(target);
  return value === "personal" || value === "none";
}

export function resolveOrganizationTarget(
  organizations: Organization[],
  rawTarget: string
): ResolvedWorkspace {
  if (isPersonalTarget(rawTarget)) {
    return {
      orgId: null,
      label: "Personal workspace",
    };
  }

  const target = normalize(rawTarget);

  // 1) Exact id/slug match.
  const directMatch = organizations.find(
    (org) => org.id === rawTarget || normalize(org.slug) === target
  );
  if (directMatch) {
    return {
      orgId: directMatch.id,
      label: `${directMatch.name} (${directMatch.slug})`,
    };
  }

  // 2) Exact name match.
  const exactNameMatches = organizations.filter(
    (org) => normalize(org.name) === target
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
      `Multiple organizations match \"${rawTarget}\". Use org slug or id instead.`
    );
  }

  // 3) Prefix slug match.
  const slugPrefixMatches = organizations.filter((org) =>
    normalize(org.slug).startsWith(target)
  );

  if (slugPrefixMatches.length === 1) {
    const org = slugPrefixMatches[0];
    return {
      orgId: org.id,
      label: `${org.name} (${org.slug})`,
    };
  }

  if (slugPrefixMatches.length > 1) {
    throw new Error(
      `Multiple organizations match \"${rawTarget}\". Be more specific.`
    );
  }

  throw new Error(
    `Organization \"${rawTarget}\" not found. Run ${chalk.cyan("memories org list")}.`
  );
}

async function requireApiClient() {
  const auth = await readAuth();
  if (!auth) {
    ui.warn("Not logged in");
    ui.dim(`Run ${chalk.cyan("memories login")} to enable organization commands.`);
    return null;
  }

  return {
    apiFetch: getApiClient(auth),
  };
}

async function fetchOrganizationsAndUser(apiFetch: ReturnType<typeof getApiClient>) {
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

  const orgsBody = (await orgsRes.json()) as OrganizationsResponse;
  const userBody = (await userRes.json()) as UserResponse;

  return {
    organizations: orgsBody.organizations,
    user: userBody.user,
  };
}

export const orgCommand = new Command("org").description(
  "Manage active organization workspace"
);

orgCommand
  .command("list")
  .description("List your organizations and current active workspace")
  .action(async () => {
    try {
      const ctx = await requireApiClient();
      if (!ctx) return;

      const { organizations, user } = await fetchOrganizationsAndUser(ctx.apiFetch);

      const personalCurrent = user.current_org_id === null;
      const marker = personalCurrent ? chalk.green("●") : chalk.dim("○");
      console.log(`${marker} Personal workspace`);

      if (organizations.length === 0) {
        ui.dim("No organizations yet.");
        return;
      }

      for (const org of organizations) {
        const isCurrent = user.current_org_id === org.id;
        const icon = isCurrent ? chalk.green("●") : chalk.dim("○");
        const role = chalk.dim(org.role);
        console.log(`${icon} ${org.name} ${chalk.dim(`(${org.slug})`)} ${role}`);
      }
    } catch (error) {
      ui.error(error instanceof Error ? error.message : "Failed to list organizations");
      process.exitCode = 1;
    }
  });

orgCommand
  .command("current")
  .description("Show the active workspace")
  .action(async () => {
    try {
      const ctx = await requireApiClient();
      if (!ctx) return;

      const { organizations, user } = await fetchOrganizationsAndUser(ctx.apiFetch);

      if (!user.current_org_id) {
        ui.success("Active workspace: personal");
        return;
      }

      const org = organizations.find((item) => item.id === user.current_org_id);
      if (!org) {
        ui.warn("Current organization is no longer accessible");
        ui.dim(`ID: ${user.current_org_id}`);
        return;
      }

      ui.success(`Active workspace: ${org.name}`);
      ui.dim(`Slug: ${org.slug}`);
      ui.dim(`Role: ${org.role}`);
    } catch (error) {
      ui.error(error instanceof Error ? error.message : "Failed to read active workspace");
      process.exitCode = 1;
    }
  });

orgCommand
  .command("use")
  .description("Switch active workspace to an organization or personal")
  .argument("<target>", "Organization id/slug/name, or 'personal'")
  .action(async (target: string) => {
    try {
      const ctx = await requireApiClient();
      if (!ctx) return;

      const { organizations } = await fetchOrganizationsAndUser(ctx.apiFetch);
      const resolved = resolveOrganizationTarget(organizations, target);

      const updateRes = await ctx.apiFetch("/api/user", {
        method: "PATCH",
        body: JSON.stringify({ current_org_id: resolved.orgId }),
      });

      if (!updateRes.ok) {
        const text = await updateRes.text();
        throw new Error(`Failed to switch workspace: ${text || updateRes.statusText}`);
      }

      ui.success(`Switched active workspace to ${resolved.label}`);
      ui.dim(`Run ${chalk.cyan("memories org current")} to verify.`);
    } catch (error) {
      ui.error(error instanceof Error ? error.message : "Failed to switch workspace");
      process.exitCode = 1;
    }
  });
