"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

interface Memory {
  id: string
  content: string
  tags: string | null
  type: string | null
  scope: string | null
  created_at: string
}

export function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: (id: string) => void }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch("/api/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memory.id }),
      })
      if (res.ok) {
        onDelete(memory.id)
      }
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="group border border-border bg-card/20 p-5 hover:border-primary/30 transition-all duration-300">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          {memory.type ? (
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[10px] uppercase tracking-wider font-bold text-primary">
              {memory.type}
            </span>
          ) : null}
          {memory.scope ? (
            <span className="px-2 py-0.5 bg-muted/50 border border-border text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              {memory.scope}
            </span>
          ) : null}
          {memory.tags
            ? memory.tags.split(",").map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-muted/50 border border-border text-[10px] uppercase tracking-wider font-bold text-muted-foreground"
                >
                  {tag.trim()}
                </span>
              ))
            : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground/60 shrink-0">
            {new Date(memory.created_at).toLocaleDateString()}
          </span>
          {showConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "..." : "Delete"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-muted/50 text-muted-foreground border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
        {memory.content}
      </p>
    </div>
  )
}
