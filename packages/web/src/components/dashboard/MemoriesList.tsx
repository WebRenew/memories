"use client"

import { useState } from "react"
import { MemoryCard } from "./MemoryCard"

interface Memory {
  id: string
  content: string
  tags: string | null
  type: string | null
  scope: string | null
  created_at: string
}

export function MemoriesList({ initialMemories }: { initialMemories: Memory[] }) {
  const [memories, setMemories] = useState(initialMemories)

  const handleDelete = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id))
  }

  if (memories.length === 0) {
    return (
      <div className="border border-border bg-card/20 p-8 text-center">
        <p className="text-muted-foreground text-sm">
          No memories found. Start using the CLI to create memories.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {memories.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} onDelete={handleDelete} />
      ))}
    </div>
  )
}
