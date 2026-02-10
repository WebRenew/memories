import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { resolveWorkspaceContext } from "@/lib/workspace"
import type { OrgMembership } from "@/components/dashboard/WorkspaceSwitcher"

export const metadata = {
  title: "Dashboard",
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [workspace, profile, membershipRows] = await Promise.all([
    resolveWorkspaceContext(supabase, user.id),
    supabase
      .from("users")
      .select("id, email, name, avatar_url")
      .eq("id", user.id)
      .single()
      .then((r) => r.data),
    supabase
      .from("org_members")
      .select("role, organizations(id, name, slug)")
      .eq("user_id", user.id)
      .then((r) => r.data),
  ])

  const memberships: OrgMembership[] = (membershipRows ?? [])
    .filter((row): row is typeof row & { organizations: { id: string; name: string; slug: string } } =>
      row.organizations !== null && typeof row.organizations === "object" && !Array.isArray(row.organizations)
    )
    .map((row) => ({
      role: row.role as OrgMembership["role"],
      organization: row.organizations,
    }))

  return (
    <DashboardShell
      user={user}
      profile={profile}
      workspace={{
        ownerType: workspace?.ownerType ?? "user",
        orgRole: workspace?.orgRole ?? null,
        plan: workspace?.plan ?? "free",
      }}
      currentOrgId={workspace?.orgId ?? null}
      memberships={memberships}
    >
      {children}
    </DashboardShell>
  )
}
