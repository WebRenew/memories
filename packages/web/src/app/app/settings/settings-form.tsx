"use client"

import { useState } from "react"
import { toast } from "sonner"

interface SettingsFormProps {
  profile: {
    name: string
    email: string
    avatar_url: string
    plan: string
  }
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const [name, setName] = useState(profile.name)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) {
        throw new Error("Failed to save")
      }

      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Profile section */}
      <div className="border border-border bg-card/20 p-6 space-y-6">
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">
          Profile
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border text-sm focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-3 bg-muted/30 border border-border text-sm text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2">
              Plan
            </label>
            <div className="px-4 py-3 bg-muted/30 border border-border text-sm">
              <span className="uppercase tracking-wider font-bold">{profile.plan}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-8 py-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-[0.15em] hover:opacity-90 transition-all duration-300 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* Sign out */}
      <div className="border-t border-border pt-8">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="px-8 py-3 bg-muted/50 text-foreground border border-border text-xs font-bold uppercase tracking-[0.15em] hover:bg-muted transition-all duration-300"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
