import type { MemoryInsights, InsightAction } from "@/lib/memory-insights"

interface ActionableIntelligenceSectionProps {
  insights: MemoryInsights | null
}

function trendLabel(trend: MemoryInsights["weekly"]["trend"]): string {
  if (trend === "up") return "Up"
  if (trend === "down") return "Down"
  return "Stable"
}

function actionGroupLabel(kind: InsightAction["kind"]): string {
  if (kind === "archive") return "Archive"
  if (kind === "merge") return "Merge"
  return "Relabel"
}

function projectLabel(project: string): string {
  if (project === "global") return "global"
  return project.replace(/^github\.com\//, "")
}

export function ActionableIntelligenceSection({
  insights,
}: ActionableIntelligenceSectionProps) {
  if (!insights) {
    return (
      <section className="border border-border bg-card/20 p-4 md:p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground/70">
          Actionable Intelligence
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Insight generation is unavailable right now.
        </p>
      </section>
    )
  }

  const actionGroups: Array<{ kind: InsightAction["kind"]; items: InsightAction[] }> = [
    { kind: "archive", items: insights.actions.archive },
    { kind: "merge", items: insights.actions.merge },
    { kind: "relabel", items: insights.actions.relabel },
  ]

  return (
    <section className="border border-border bg-card/20 p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground/70">
            Actionable Intelligence
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Stale rules, conflict candidates, and weekly change movement with concrete cleanup actions.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {insights.actions.total} actions
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="border border-border bg-card/10 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">Stale Rules</p>
          <p className="mt-1 text-sm font-semibold">
            {insights.staleRules.count} over {insights.staleRules.thresholdDays}d
          </p>
          {insights.staleRules.items.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No stale rules detected.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {insights.staleRules.items.slice(0, 3).map((item) => (
                <li key={item.id} className="text-xs border border-border/60 bg-background/40 p-2">
                  <p className="font-mono text-[11px] text-foreground/90">{item.id}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {item.ageDays}d old • {projectLabel(item.project)}
                  </p>
                  <p className="mt-1 text-foreground/85">{item.preview}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-border bg-card/10 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">Conflicts</p>
          <p className="mt-1 text-sm font-semibold">{insights.conflicts.count} candidates</p>
          {insights.conflicts.items.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No conflicting directives detected.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {insights.conflicts.items.slice(0, 3).map((item) => (
                <li key={item.id} className="text-xs border border-border/60 bg-background/40 p-2">
                  <p className="font-mono text-[11px] text-foreground/90">
                    {item.memoryA.id} vs {item.memoryB.id}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    score {item.score} • overlap {(item.similarity * 100).toFixed(0)}%
                  </p>
                  {item.sharedTags.length > 0 ? (
                    <p className="mt-1 text-muted-foreground">tags: {item.sharedTags.join(", ")}</p>
                  ) : null}
                  {item.sharedTopics.length > 0 ? (
                    <p className="text-muted-foreground">topics: {item.sharedTopics.join(", ")}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-border bg-card/10 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">What Changed This Week</p>
          <p className="mt-1 text-sm font-semibold">
            {insights.weekly.changedCount} changed • {trendLabel(insights.weekly.trend)}
            {insights.weekly.deltaPercent !== null ? ` (${insights.weekly.deltaPercent}%)` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            new {insights.weekly.newCount} • updated {insights.weekly.updatedCount}
          </p>
          <div className="mt-2 space-y-1">
            {insights.weekly.byType.slice(0, 4).map((entry) => (
              <p key={entry.type} className="text-xs text-muted-foreground">
                {entry.type}: <span className="text-foreground">{entry.count}</span>
              </p>
            ))}
          </div>
          {insights.weekly.topProjects.length > 0 ? (
            <div className="mt-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">Top Projects</p>
              <p className="text-xs text-muted-foreground mt-1">
                {insights.weekly.topProjects
                  .slice(0, 2)
                  .map((entry) => `${projectLabel(entry.project)} (${entry.count})`)
                  .join(" • ")}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border border-border bg-card/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            Suggested Cleanup Actions
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            Jump to memory cards below via links
          </p>
        </div>

        {insights.actions.total === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No cleanup actions suggested right now.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
            {actionGroups.map((group) => (
              <div key={group.kind} className="border border-border/60 bg-background/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-foreground/80">
                  {actionGroupLabel(group.kind)} ({group.items.length})
                </p>
                {group.items.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">No actions.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {group.items.map((action) => (
                      <li key={action.id} className="text-xs border border-border/50 bg-card/20 p-2">
                        <p className="text-foreground/90">{action.title}</p>
                        <p className="mt-1 text-muted-foreground">{action.reason}</p>
                        <p className="mt-1 text-muted-foreground">
                          {action.memoryIds.map((id, index) => (
                            <span key={id}>
                              {index > 0 ? ", " : ""}
                              <a href={`#memory-${id}`} className="text-primary hover:underline">
                                {id}
                              </a>
                            </span>
                          ))}
                        </p>
                        {action.proposedTags && action.proposedTags.length > 0 ? (
                          <p className="mt-1 text-muted-foreground">
                            suggested tags: {action.proposedTags.join(", ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
