import type { Client } from "@libsql/client";
import { getDb } from "./db.js";

interface StorageMetrics {
  activeCount: number;
  deletedCount: number;
  totalCount: number;
  deletedRatio: number;
}

export interface StorageWarning {
  code: "LARGE_ACTIVE_DATASET" | "SOFT_DELETED_BACKLOG";
  message: string;
  remediation: string[];
}

interface StorageWarningThresholds {
  activeCountWarn: number;
  softDeletedCountWarn: number;
  softDeletedRatioWarn: number;
}

const DEFAULT_ACTIVE_COUNT_WARN = 5000;
const DEFAULT_SOFT_DELETED_COUNT_WARN = 500;
const DEFAULT_SOFT_DELETED_RATIO_WARN = 0.2;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseRatio(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed <= 0 || parsed >= 1) return fallback;
  return parsed;
}

export function resolveStorageWarningThresholds(
  env: NodeJS.ProcessEnv = process.env
): StorageWarningThresholds {
  return {
    activeCountWarn: parsePositiveInt(env.MEMORIES_WARN_ACTIVE_COUNT, DEFAULT_ACTIVE_COUNT_WARN),
    softDeletedCountWarn: parsePositiveInt(
      env.MEMORIES_WARN_SOFT_DELETED_COUNT,
      DEFAULT_SOFT_DELETED_COUNT_WARN
    ),
    softDeletedRatioWarn: parseRatio(
      env.MEMORIES_WARN_SOFT_DELETED_RATIO,
      DEFAULT_SOFT_DELETED_RATIO_WARN
    ),
  };
}

export function computeStorageMetrics(activeCount: number, deletedCount: number): StorageMetrics {
  const safeActive = Math.max(0, Math.floor(activeCount));
  const safeDeleted = Math.max(0, Math.floor(deletedCount));
  const totalCount = safeActive + safeDeleted;
  const deletedRatio = totalCount > 0 ? safeDeleted / totalCount : 0;
  return {
    activeCount: safeActive,
    deletedCount: safeDeleted,
    totalCount,
    deletedRatio,
  };
}

export function evaluateStorageWarnings(
  metrics: StorageMetrics,
  thresholds: StorageWarningThresholds = resolveStorageWarningThresholds()
): StorageWarning[] {
  const warnings: StorageWarning[] = [];

  if (metrics.activeCount >= thresholds.activeCountWarn) {
    warnings.push({
      code: "LARGE_ACTIVE_DATASET",
      message: `You have ${metrics.activeCount.toLocaleString()} active memories. Consider pruning stale entries to keep lookups fast.`,
      remediation: ["Run: memories stats", "Run: memories stale --days 90", "Run: memories review"],
    });
  }

  if (
    metrics.deletedCount >= thresholds.softDeletedCountWarn ||
    metrics.deletedRatio >= thresholds.softDeletedRatioWarn
  ) {
    const ratioPercent = (metrics.deletedRatio * 100).toFixed(0);
    warnings.push({
      code: "SOFT_DELETED_BACKLOG",
      message: `${metrics.deletedCount.toLocaleString()} soft-deleted memories pending vacuum (${ratioPercent}% of total records).`,
      remediation: ["Run: memories doctor --fix", "Or via MCP: vacuum_memories"],
    });
  }

  return warnings;
}

export function formatStorageWarningsForText(warnings: StorageWarning[]): string {
  if (warnings.length === 0) return "";
  const lines: string[] = ["Storage warning:"];
  for (const warning of warnings) {
    lines.push(`- ${warning.message}`);
  }

  const remediation = Array.from(new Set(warnings.flatMap((warning) => warning.remediation)));
  for (const step of remediation) {
    lines.push(`  ↳ ${step}`);
  }

  return lines.join("\n");
}

export async function getStorageMetrics(db?: Client): Promise<StorageMetrics> {
  const client = db ?? (await getDb());
  const [activeResult, deletedResult] = await Promise.all([
    client.execute("SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL"),
    client.execute("SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NOT NULL"),
  ]);

  const activeCount = Number(activeResult.rows[0]?.count ?? 0);
  const deletedCount = Number(deletedResult.rows[0]?.count ?? 0);
  return computeStorageMetrics(activeCount, deletedCount);
}

export async function getStorageWarnings(db?: Client): Promise<{
  metrics: StorageMetrics;
  warnings: StorageWarning[];
}> {
  const metrics = await getStorageMetrics(db);
  return {
    metrics,
    warnings: evaluateStorageWarnings(metrics),
  };
}
