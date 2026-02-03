import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UpgradeCard } from "./upgrade-card"

export const metadata = {
  title: "Upgrade to Pro",
}

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single()

  if (profile?.plan === "pro") {
    redirect("/app")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Upgrade to Pro
        </h1>
        <p className="text-muted-foreground max-w-md leading-relaxed">
          Add cloud sync, a web dashboard, and cross-device access to your memory workflow.
        </p>
      </div>

      <UpgradeCard />
    </div>
  )
}
