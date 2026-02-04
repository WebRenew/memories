"use client"

import { useState } from "react"
import { 
  CreditCard, 
  Zap, 
  Database, 
  FileText, 
  Lightbulb, 
  FolderOpen,
  Clock,
  ExternalLink,
  Check
} from "lucide-react"

interface UsageStats {
  totalMemories: number
  totalRules: number
  totalDecisions: number
  totalFacts: number
  projectCount: number
  lastSync: string | null
}

interface BillingContentProps {
  plan: string
  hasStripeCustomer: boolean
  usage: UsageStats
  memberSince: string | null
}

const FREE_LIMITS = {
  memories: "Unlimited",
  projects: "Unlimited",
  sync: "Cloud sync",
  search: "Local semantic search",
}

const PRO_FEATURES = [
  "Cloud sync across all devices",
  "Web dashboard access",
  "MCP API access for v0 & web tools",
  "Server-side semantic search",
  "Priority support",
]

export function BillingContent({ plan, hasStripeCustomer, usage, memberSince }: BillingContentProps) {
  const [loading, setLoading] = useState(false)
  const isPro = plan === "pro"

  async function handleManageBilling() {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing: "monthly" }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Current Plan */}
      <div className="border border-border bg-card/20">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Current Plan</h2>
          </div>
          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            isPro 
              ? "bg-primary/10 text-primary border border-primary/20" 
              : "bg-muted/50 text-muted-foreground border border-border"
          }`}>
            {isPro ? "Pro" : "Free"}
          </span>
        </div>

        <div className="p-4 space-y-4">
          {isPro ? (
            <>
              <p className="text-sm text-muted-foreground">
                You have access to all Pro features including cloud sync, web dashboard, and MCP API.
              </p>
              <div className="flex flex-wrap gap-2">
                {PRO_FEATURES.map((feature) => (
                  <span key={feature} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-green-400" />
                    {feature}
                  </span>
                ))}
              </div>
              {hasStripeCustomer && (
                <button
                  onClick={handleManageBilling}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  {loading ? "Loading..." : "Manage Subscription"}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;re on the Free plan. Upgrade to Pro for cloud sync, web dashboard access, and MCP API.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" />
                  {loading ? "Loading..." : "Upgrade to Pro — $10/mo"}
                </button>
                <a 
                  href="/pricing" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View pricing details
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="border border-border bg-card/20">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Usage</h2>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <UsageStat
              icon={<Database className="h-4 w-4" />}
              label="Total Memories"
              value={usage.totalMemories}
            />
            <UsageStat
              icon={<FileText className="h-4 w-4" />}
              label="Rules"
              value={usage.totalRules}
            />
            <UsageStat
              icon={<Lightbulb className="h-4 w-4" />}
              label="Decisions"
              value={usage.totalDecisions}
            />
            <UsageStat
              icon={<FolderOpen className="h-4 w-4" />}
              label="Projects"
              value={usage.projectCount}
            />
          </div>

          {usage.lastSync && (
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last activity: {new Date(usage.lastSync).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="border border-border bg-card/20">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Account</h2>
        </div>

        <div className="p-4 space-y-2 text-sm">
          {memberSince && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{new Date(memberSince).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Database</span>
            <span className="text-green-400">Connected</span>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      {!isPro && (
        <div className="border border-border bg-card/20">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Free vs Pro</h2>
          </div>

          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium">Feature</th>
                  <th className="text-center py-2 font-medium">Free</th>
                  <th className="text-center py-2 font-medium text-primary">Pro</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border">
                  <td className="py-2">Local CLI & MCP</td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2">Unlimited memories</td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2">Local semantic search</td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2">Cloud sync</td>
                  <td className="text-center py-2">—</td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2">Web dashboard</td>
                  <td className="text-center py-2">—</td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2">MCP API (v0, web tools)</td>
                  <td className="text-center py-2">—</td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                </tr>
                <tr>
                  <td className="py-2">Priority support</td>
                  <td className="text-center py-2">—</td>
                  <td className="text-center py-2"><Check className="h-4 w-4 text-green-400 inline" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function UsageStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-3 bg-muted/20 border border-border">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  )
}
