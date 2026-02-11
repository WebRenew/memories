"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ToolLogo } from "../ui/tool-logo"
import { GENERATOR_TOOLS, MARQUEE_TOOLS } from "@/lib/tools"

export function ToolsPanel({ ruleCount }: { ruleCount: number }) {
  const generatorSlugs = useMemo(
    () => new Set(GENERATOR_TOOLS.map((t) => t.slug)),
    []
  )
  const otherTools = useMemo(
    () => MARQUEE_TOOLS.filter((t) => !generatorSlugs.has(t.slug)),
    [generatorSlugs]
  )
  const marqueeTools = useMemo(
    () => [...otherTools, ...otherTools, ...otherTools],
    [otherTools]
  )

  return (
    <div className="border border-border bg-card/10 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Generate for Your Tools</h2>
          <p className="text-xs text-muted-foreground mt-1">
            One command syncs your rules to any AI coding tool
          </p>
        </div>
        {ruleCount > 0 && (
          <div className="text-right">
            <code className="text-xs bg-primary/10 text-primary px-3 py-1.5 font-mono border border-primary/20">
              memories generate all
            </code>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {GENERATOR_TOOLS.map((tool) => (
          <Link
            key={tool.cmd}
            href={tool.docsUrl}
            className="group flex flex-col items-center gap-3 p-4 border border-border bg-card/5 hover:bg-card/20 hover:border-primary/30 transition-all"
          >
            <ToolLogo src={tool.logo} alt={tool.name} size="lg" className="opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="text-center">
              <p className="text-xs font-bold">{tool.name}</p>
              <p className="text-[9px] text-muted-foreground font-mono truncate max-w-[100px]">
                {tool.file.split("/").pop()}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Also works with — sliding marquee */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Also works with
          </span>
        </div>
        <div className="relative overflow-hidden">
          <div className="flex overflow-hidden">
            <div
              className="flex w-fit items-center whitespace-nowrap"
              style={{ animation: "marquee 30s linear infinite" }}
            >
              {marqueeTools.map((tool, index) => (
                <Link
                  key={`${tool.slug}-${index}`}
                  href={tool.docsUrl}
                  className="flex shrink-0 items-center gap-2 px-4 opacity-60 hover:opacity-100 transition-opacity duration-300"
                >
                  <ToolLogo src={tool.logo} alt={tool.name} size="sm" />
                  <span className="text-[11px] text-muted-foreground">{tool.name}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card/10 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card/10 to-transparent z-10" />
        </div>
      </div>

      {ruleCount === 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Add rules via CLI, then generate files for your tools
          </p>
        </div>
      )}
    </div>
  )
}
