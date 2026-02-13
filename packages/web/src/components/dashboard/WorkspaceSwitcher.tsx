"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Check, Crown, Shield, User, Loader2 } from "lucide-react"

export interface OrgMembership {
  role: "owner" | "admin" | "member"
  organization: {
    id: string
    name: string
    slug: string
  }
}

interface WorkspaceSwitcherProps {
  currentOrgId: string | null
  memberships: OrgMembership[]
}

interface WorkspaceSummary {
  ownerType: "user" | "organization"
  orgId: string | null
  orgRole: "owner" | "admin" | "member" | null
  plan: "free" | "pro" | "past_due"
  hasDatabase: boolean
  canProvision: boolean
  canManageBilling: boolean
}

interface WorkspaceSummariesResponse {
  summaries?: {
    currentOrgId: string | null
    personal: WorkspaceSummary
    organizations: Array<{
      id: string
      name: string
      slug: string
      role: "owner" | "admin" | "member"
      workspace: WorkspaceSummary
    }>
  }
}

const PERSONAL_KEY = "__personal_workspace__"

function workspaceSummaryKey(orgId: string | null): string {
  return orgId ?? PERSONAL_KEY
}

const roleIcon = (role: string) => {
  switch (role) {
    case "owner":
      return <Crown className="h-3 w-3 text-amber-400" />
    case "admin":
      return <Shield className="h-3 w-3 text-blue-400" />
    default:
      return <User className="h-3 w-3 text-muted-foreground" />
  }
}

export function WorkspaceSwitcher({ currentOrgId, memberships }: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaceSummaryById, setWorkspaceSummaryById] = useState<
    Record<string, WorkspaceSummary>
  >({})
  const [isPrefetching, setIsPrefetching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeOrg = currentOrgId
    ? memberships.find((m) => m.organization.id === currentOrgId)
    : null

  const displayName = activeOrg ? activeOrg.organization.name : "Personal"

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  async function prefetchWorkspaceSummaries(options?: { force?: boolean }) {
    setIsPrefetching(true)
    try {
      const response = await fetch("/api/workspace?includeSummaries=1", {
        method: "GET",
        cache: options?.force ? "no-store" : "force-cache",
      })
      if (!response.ok) return

      const payload = (await response.json().catch(() => ({}))) as WorkspaceSummariesResponse
      const summaries = payload.summaries
      if (!summaries) return

      const nextMap: Record<string, WorkspaceSummary> = {
        [PERSONAL_KEY]: summaries.personal,
      }
      for (const item of summaries.organizations) {
        nextMap[item.id] = item.workspace
      }
      setWorkspaceSummaryById(nextMap)
    } catch {
      // Best-effort prefetch only.
    } finally {
      setIsPrefetching(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    void prefetchWorkspaceSummaries()
  }, [isOpen])

  async function switchWorkspace(nextOrgId: string | null) {
    if (nextOrgId === currentOrgId) {
      setIsOpen(false)
      return
    }

    setIsSwitching(true)
    setError(null)

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_org_id: nextOrgId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to switch workspace")
      }

      // Warm short-lived workspace summaries + health payload for the next render.
      await Promise.all([
        prefetchWorkspaceSummaries({ force: true }),
        fetch("/api/integration/health", { method: "GET", cache: "force-cache" }).catch(
          () => undefined,
        ),
      ])

      setIsOpen(false)
      router.refresh()
    } catch (err) {
      console.error("Workspace switch failed:", err)
      setError(err instanceof Error ? err.message : "Failed to switch workspace")
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="flex items-center gap-2 px-3 py-1.5 border border-border bg-muted/30 hover:bg-muted/50 transition-colors disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isSwitching ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : activeOrg ? (
          roleIcon(activeOrg.role)
        ) : (
          <User className="h-3 w-3 text-primary" />
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-bold max-w-[140px] truncate">
          {displayName}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[220px] bg-background border border-border shadow-lg">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground flex items-center gap-2">
                Workspace
                {(isSwitching || isPrefetching) && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </span>
            </div>

            {/* Personal workspace */}
            <button
              onClick={() => switchWorkspace(null)}
              disabled={isSwitching}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
            >
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">Personal</p>
                <p className="text-[10px] text-muted-foreground">Your private workspace</p>
              </div>
              {workspaceSummaryById[PERSONAL_KEY] && (
                <span
                  className={`text-[9px] uppercase tracking-[0.14em] ${
                    workspaceSummaryById[PERSONAL_KEY].hasDatabase
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {workspaceSummaryById[PERSONAL_KEY].hasDatabase ? "DB ready" : "No DB"}
                </span>
              )}
              {currentOrgId === null && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>

            {memberships.length > 0 && (
              <div className="border-t border-border">
                <div className="px-3 py-1.5">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                    Organizations
                  </span>
                </div>
                {memberships.map((m) => (
                  <button
                    key={m.organization.id}
                    onClick={() => switchWorkspace(m.organization.id)}
                    disabled={isSwitching}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
                  >
                    <div className="w-5 h-5 bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                      {m.organization.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{m.organization.name}</p>
                      <div className="flex items-center gap-1.5">
                        {roleIcon(m.role)}
                        <span className="text-[10px] text-muted-foreground capitalize">{m.role}</span>
                      </div>
                    </div>
                    {workspaceSummaryById[workspaceSummaryKey(m.organization.id)] && (
                      <span
                        className={`text-[9px] uppercase tracking-[0.14em] ${
                          workspaceSummaryById[workspaceSummaryKey(m.organization.id)].hasDatabase
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {workspaceSummaryById[workspaceSummaryKey(m.organization.id)].hasDatabase
                          ? "DB ready"
                          : "No DB"}
                      </span>
                    )}
                    {currentOrgId === m.organization.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="px-3 py-2 border-t border-border">
                <p className="text-[10px] text-red-400">{error}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
