"use client"

import { useState, useEffect } from "react"
import { Copy, RefreshCw, Trash2, Key, Eye, EyeOff } from "lucide-react"

export function ApiKeySection() {
  const [hasKey, setHasKey] = useState(false)
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showKey, setShowKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState(false)

  useEffect(() => {
    fetchKeyStatus()
  }, [])

  async function fetchKeyStatus() {
    try {
      const res = await fetch("/api/mcp/key")
      const data = await res.json()
      setHasKey(data.hasKey)
      setMaskedKey(data.maskedKey || null)
    } catch (err) {
      console.error("Failed to fetch API key status:", err)
    } finally {
      setLoading(false)
    }
  }

  async function generateKey() {
    setLoading(true)
    try {
      const res = await fetch("/api/mcp/key", { method: "POST" })
      const data = await res.json()
      if (data.apiKey) {
        setNewKey(data.apiKey)
        setHasKey(true)
        setShowKey(true)
      }
    } catch (err) {
      console.error("Failed to generate API key:", err)
    } finally {
      setLoading(false)
    }
  }

  async function revokeKey() {
    if (!confirm("Are you sure? Any tools using this key will stop working.")) {
      return
    }
    setLoading(true)
    try {
      await fetch("/api/mcp/key", { method: "DELETE" })
      setHasKey(false)
      setMaskedKey(null)
      setNewKey(null)
    } catch (err) {
      console.error("Failed to revoke API key:", err)
    } finally {
      setLoading(false)
    }
  }

  async function copyKey() {
    if (!newKey) return
    try {
      await navigator.clipboard.writeText(newKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  async function copyConfig() {
    const config = JSON.stringify({
      mcpServers: {
        memories: {
          url: "https://memories.sh/api/mcp",
          headers: {
            Authorization: `Bearer ${newKey || "YOUR_API_KEY"}`
          }
        }
      }
    }, null, 2)
    try {
      await navigator.clipboard.writeText(config)
      setCopiedConfig(true)
      setTimeout(() => setCopiedConfig(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  if (loading && !hasKey && !newKey) {
    return (
      <div className="border border-border bg-card/20 p-6">
        <div className="animate-pulse h-20 bg-muted/20 rounded" />
      </div>
    )
  }

  return (
    <div className="border border-border bg-card/20">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">MCP API Key</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Connect v0 and other web-based AI tools to your memories
        </p>
      </div>

      <div className="p-4 space-y-4">
        {newKey ? (
          // Just generated a new key - show it once
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded text-sm">
              <p className="text-green-400 font-medium mb-2">API Key Generated</p>
              <p className="text-muted-foreground text-xs">
                Save this key now - you won&apos;t be able to see it again.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted/30 px-3 py-2 rounded text-xs font-mono break-all">
                {showKey ? newKey : newKey.replace(/./g, "•")}
              </code>
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-2 hover:bg-muted/30 rounded transition-colors"
                title={showKey ? "Hide" : "Show"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={copyKey}
                className="p-2 hover:bg-muted/30 rounded transition-colors"
                title={copiedKey ? "Copied!" : "Copy"}
              >
                <Copy className={`h-4 w-4 ${copiedKey ? "text-green-400" : ""}`} />
              </button>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">v0 / MCP Config:</p>
              <button
                onClick={copyConfig}
                className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors ${
                  copiedConfig 
                    ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                    : "bg-muted/20 hover:bg-muted/30"
                }`}
              >
                {copiedConfig ? "Copied to clipboard!" : "Click to copy MCP config"}
              </button>
            </div>

            <button
              onClick={() => setNewKey(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Done - I&apos;ve saved my key
            </button>
          </div>
        ) : hasKey ? (
          // Has existing key
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Current key:</span>
              <code className="bg-muted/30 px-2 py-1 rounded text-xs font-mono">
                {maskedKey}
              </code>
            </div>

            <div className="flex gap-2">
              <button
                onClick={generateKey}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted/30 hover:bg-muted/50 rounded transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Regenerate
              </button>
              <button
                onClick={revokeKey}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Revoke
              </button>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Endpoint: <code className="bg-muted/30 px-1.5 py-0.5 rounded">https://memories.sh/api/mcp</code>
              </p>
            </div>
          </div>
        ) : (
          // No key yet
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate an API key to connect web-based AI tools like v0 to your memories.
            </p>
            <button
              onClick={generateKey}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Key className="h-4 w-4" />
              Generate API Key
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
