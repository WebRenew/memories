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
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
                Workspace
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
