import { GRAPH_RETRIEVAL_ENABLED } from "../types"

// Type aliases
export type GraphRolloutMode = "off" | "shadow" | "canary"

// Interfaces
export interface GraphRolloutConfig {
  mode: GraphRolloutMode
  updatedAt: string
  updatedBy: string | null
}

export interface GraphRolloutMetricInput {
  nowIso: string
  mode: GraphRolloutMode
  requestedStrategy: "baseline" | "hybrid_graph"
  appliedStrategy: "baseline" | "hybrid_graph"
  shadowExecuted: boolean
  baselineCandidates: number
  graphCandidates: number
  graphExpandedCount: number
  totalCandidates: number
  fallbackTriggered: boolean
  fallbackReason: string | null
}

export interface GraphRolloutMetricsSummary {
  windowHours: number
  totalRequests: number
  hybridRequested: number
  canaryApplied: number
  shadowExecutions: number
  fallbackCount: number
  fallbackRate: number
  graphErrorFallbacks: number
  avgGraphCandidates: number
  avgGraphExpandedCount: number
  lastFallbackAt: string | null
  lastFallbackReason: string | null
}

export type GraphRolloutQualityStatus = "pass" | "warn" | "fail" | "insufficient_data"

export interface GraphRolloutEvalWindow {
  startAt: string
  endAt: string
  totalRequests: number
  hybridRequested: number
  canaryApplied: number
  hybridFallbacks: number
  graphErrorFallbacks: number
  fallbackRate: number
  graphErrorFallbackRate: number
  canaryWithExpansion: number
  expansionCoverageRate: number
  avgExpandedCount: number
  avgCandidateLift: number
}

export interface GraphRolloutQualityReason {
  code:
    | "FALLBACK_RATE_ABOVE_LIMIT"
    | "GRAPH_ERROR_RATE_ABOVE_LIMIT"
    | "FALLBACK_RATE_REGRESSION"
    | "GRAPH_ERROR_RATE_REGRESSION"
    | "EXPANSION_COVERAGE_TOO_LOW"
    | "EXPANSION_COVERAGE_REGRESSION"
    | "CANDIDATE_LIFT_REGRESSION"
  severity: "warning" | "critical"
  blocking: boolean
  metric: "fallback_rate" | "graph_error_rate" | "expansion_coverage" | "candidate_lift"
  currentValue: number
  previousValue: number | null
  threshold: number | null
  message: string
}

export interface GraphRolloutQualitySummary {
  evaluatedAt: string
  windowHours: number
  minHybridSamples: number
  minCanarySamplesForRelevance: number
  status: GraphRolloutQualityStatus
  canaryBlocked: boolean
  reasons: GraphRolloutQualityReason[]
  current: GraphRolloutEvalWindow
  previous: GraphRolloutEvalWindow
}

// Constants
export const GRAPH_ROLLOUT_QUALITY_THRESHOLDS = {
  windowHours: 24,
  minHybridSamples: 20,
  minCanarySamplesForRelevance: 12,
  maxFallbackRate: 0.15,
  maxGraphErrorFallbackRate: 0.05,
  maxFallbackRateIncrease: 0.07,
  maxGraphErrorRateIncrease: 0.03,
  minExpansionCoverageRate: 0.1,
  maxExpansionCoverageDrop: 0.25,
  maxCandidateLiftDropRatio: 0.35,
} as const

// Pure helper functions
export function normalizeRolloutMode(mode: string | null | undefined): GraphRolloutMode {
  if (mode === "off" || mode === "shadow" || mode === "canary") {
    return mode
  }
  return GRAPH_RETRIEVAL_ENABLED ? "canary" : "off"
}

export function normalizeWindowHours(hours: number): number {
  if (!Number.isFinite(hours)) return 24
  return Math.max(1, Math.min(Math.floor(hours), 24 * 30))
}

export function toCount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toMetric(value: unknown, decimals = 4): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Number(parsed.toFixed(decimals))
}

export function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return toMetric(numerator / denominator)
}

export function emptyEvalWindow(startAt: string, endAt: string): GraphRolloutEvalWindow {
  return {
    startAt,
    endAt,
    totalRequests: 0,
    hybridRequested: 0,
    canaryApplied: 0,
    hybridFallbacks: 0,
    graphErrorFallbacks: 0,
    fallbackRate: 0,
    graphErrorFallbackRate: 0,
    canaryWithExpansion: 0,
    expansionCoverageRate: 0,
    avgExpandedCount: 0,
    avgCandidateLift: 0,
  }
}

export function normalizeQualityWindowHours(hours: number | undefined): number {
  if (!Number.isFinite(hours)) return GRAPH_ROLLOUT_QUALITY_THRESHOLDS.windowHours
  return Math.max(1, Math.min(Math.floor(hours ?? GRAPH_ROLLOUT_QUALITY_THRESHOLDS.windowHours), 24 * 7))
}

export function emptyGraphRolloutQualitySummary(params: {
  nowIso: string
  windowHours?: number
}): GraphRolloutQualitySummary {
  const windowHours = normalizeQualityWindowHours(params.windowHours)
  const endAt = params.nowIso
  const startAt = new Date(Date.parse(endAt) - windowHours * 60 * 60 * 1000).toISOString()
  const previousEndAt = startAt
  const previousStartAt = new Date(Date.parse(previousEndAt) - windowHours * 60 * 60 * 1000).toISOString()
  return {
    evaluatedAt: params.nowIso,
    windowHours,
    minHybridSamples: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minHybridSamples,
    minCanarySamplesForRelevance: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minCanarySamplesForRelevance,
    status: "insufficient_data",
    canaryBlocked: false,
    reasons: [],
    current: emptyEvalWindow(startAt, endAt),
    previous: emptyEvalWindow(previousStartAt, previousEndAt),
  }
}

// Pure quality gate evaluation function
export function evaluateQualityGate(params: {
  evaluatedAt: string
  windowHours: number
  current: GraphRolloutEvalWindow
  previous: GraphRolloutEvalWindow
}): GraphRolloutQualitySummary {
  const reasons: GraphRolloutQualityReason[] = []
  const { current, previous } = params

  const addReason = (reason: GraphRolloutQualityReason): void => {
    reasons.push(reason)
  }

  if (current.hybridRequested >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minHybridSamples) {
    if (current.fallbackRate >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxFallbackRate) {
      addReason({
        code: "FALLBACK_RATE_ABOVE_LIMIT",
        severity: "critical",
        blocking: true,
        metric: "fallback_rate",
        currentValue: current.fallbackRate,
        previousValue: previous.fallbackRate,
        threshold: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxFallbackRate,
        message: `Fallback rate ${(current.fallbackRate * 100).toFixed(1)}% is above ${(
          GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxFallbackRate * 100
        ).toFixed(1)}% threshold.`,
      })
    }

    if (current.graphErrorFallbackRate >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxGraphErrorFallbackRate) {
      addReason({
        code: "GRAPH_ERROR_RATE_ABOVE_LIMIT",
        severity: "critical",
        blocking: true,
        metric: "graph_error_rate",
        currentValue: current.graphErrorFallbackRate,
        previousValue: previous.graphErrorFallbackRate,
        threshold: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxGraphErrorFallbackRate,
        message: `Graph error fallback rate ${(current.graphErrorFallbackRate * 100).toFixed(1)}% is above ${(
          GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxGraphErrorFallbackRate * 100
        ).toFixed(1)}% threshold.`,
      })
    }
  }

  if (
    current.hybridRequested >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minHybridSamples &&
    previous.hybridRequested >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minHybridSamples
  ) {
    const fallbackRateDelta = current.fallbackRate - previous.fallbackRate
    if (fallbackRateDelta >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxFallbackRateIncrease) {
      addReason({
        code: "FALLBACK_RATE_REGRESSION",
        severity: "critical",
        blocking: true,
        metric: "fallback_rate",
        currentValue: current.fallbackRate,
        previousValue: previous.fallbackRate,
        threshold: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxFallbackRateIncrease,
        message: `Fallback rate regressed by ${(fallbackRateDelta * 100).toFixed(1)} points window-over-window.`,
      })
    }

    const graphErrorRateDelta = current.graphErrorFallbackRate - previous.graphErrorFallbackRate
    if (graphErrorRateDelta >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxGraphErrorRateIncrease) {
      addReason({
        code: "GRAPH_ERROR_RATE_REGRESSION",
        severity: "critical",
        blocking: true,
        metric: "graph_error_rate",
        currentValue: current.graphErrorFallbackRate,
        previousValue: previous.graphErrorFallbackRate,
        threshold: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxGraphErrorRateIncrease,
        message: `Graph error fallback rate regressed by ${(graphErrorRateDelta * 100).toFixed(1)} points window-over-window.`,
      })
    }
  }

  if (current.canaryApplied >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minCanarySamplesForRelevance) {
    if (current.expansionCoverageRate < GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minExpansionCoverageRate) {
      addReason({
        code: "EXPANSION_COVERAGE_TOO_LOW",
        severity: "warning",
        blocking: true,
        metric: "expansion_coverage",
        currentValue: current.expansionCoverageRate,
        previousValue: previous.expansionCoverageRate,
        threshold: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minExpansionCoverageRate,
        message: `Graph expansion coverage ${(current.expansionCoverageRate * 100).toFixed(1)}% is below ${(
          GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minExpansionCoverageRate * 100
        ).toFixed(1)}% minimum.`,
      })
    }

    if (previous.canaryApplied >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minCanarySamplesForRelevance) {
      const coverageDrop = previous.expansionCoverageRate - current.expansionCoverageRate
      if (coverageDrop >= GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxExpansionCoverageDrop) {
        addReason({
          code: "EXPANSION_COVERAGE_REGRESSION",
          severity: "warning",
          blocking: true,
          metric: "expansion_coverage",
          currentValue: current.expansionCoverageRate,
          previousValue: previous.expansionCoverageRate,
          threshold: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxExpansionCoverageDrop,
          message: `Graph expansion coverage dropped ${(coverageDrop * 100).toFixed(1)} points window-over-window.`,
        })
      }

      if (previous.avgCandidateLift > 0) {
        const liftFloor =
          previous.avgCandidateLift * (1 - GRAPH_ROLLOUT_QUALITY_THRESHOLDS.maxCandidateLiftDropRatio)
        if (current.avgCandidateLift < liftFloor) {
          addReason({
            code: "CANDIDATE_LIFT_REGRESSION",
            severity: "warning",
            blocking: true,
            metric: "candidate_lift",
            currentValue: current.avgCandidateLift,
            previousValue: previous.avgCandidateLift,
            threshold: liftFloor,
            message: `Average candidate lift dropped from ${previous.avgCandidateLift.toFixed(
              2
            )} to ${current.avgCandidateLift.toFixed(2)}.`,
          })
        }
      }
    }
  }

  let status: GraphRolloutQualityStatus = "pass"
  if (current.hybridRequested < GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minHybridSamples) {
    status = "insufficient_data"
  } else if (reasons.some((reason) => reason.blocking)) {
    status = "fail"
  } else if (reasons.length > 0) {
    status = "warn"
  }

  return {
    evaluatedAt: params.evaluatedAt,
    windowHours: params.windowHours,
    minHybridSamples: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minHybridSamples,
    minCanarySamplesForRelevance: GRAPH_ROLLOUT_QUALITY_THRESHOLDS.minCanarySamplesForRelevance,
    status,
    canaryBlocked: reasons.some((reason) => reason.blocking),
    reasons,
    current,
    previous,
  }
}
