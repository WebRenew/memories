import React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UpgradeCard } from "./upgrade-card"
import { getWorkspacePlanLabel, isPaidWorkspacePlan, resolveWorkspaceContext } from "@/lib/workspace"

export const metadata = {
  title: "Upgrade Plan",
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>
}): Promise<React.JSX.Element | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const workspace = await resolveWorkspaceContext(supabase, user.id)
  const canManageBilling = workspace?.canManageBilling ?? true

  if (workspace?.plan && isPaidWorkspacePlan(workspace.plan)) {
    redirect("/app")
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const requestedPlan = resolvedSearchParams?.plan
  const initialPlan =
    requestedPlan === "individual" || requestedPlan === "team" || requestedPlan === "growth"
      ? requestedPlan
      : undefined

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Upgrade your plan
        </h1>
        <p className="text-muted-foreground max-w-md leading-relaxed">
          Choose the right plan for your workspace: Individual, Team, or Growth metered usage.
        </p>
        {workspace?.plan === "past_due" && (
          <p className="text-xs text-amber-300 mt-2">
            Current workspace status: {getWorkspacePlanLabel(workspace.plan)}. You can start a new checkout or update billing in Stripe.
          </p>
        )}
      </div>

      {!canManageBilling ? (
        <div className="max-w-md border border-amber-500/30 bg-amber-500/5 p-5 text-sm">
          <p className="font-medium text-amber-300">Billing is owner-managed</p>
          <p className="text-amber-200/80 mt-1">
            Only the organization owner can start checkout while an organization workspace is active.
          </p>
        </div>
      ) : (
        <UpgradeCard ownerType={workspace?.ownerType ?? "user"} initialPlan={initialPlan} />
      )}
    </div>
  )
}
