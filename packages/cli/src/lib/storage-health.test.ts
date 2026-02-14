import { describe, it, expect, vi } from "vitest";
import type { Client } from "@libsql/client";
import {
  computeStorageMetrics,
  evaluateStorageWarnings,
  formatStorageWarningsForText,
  getStorageMetrics,
  getStorageWarnings,
  resolveStorageWarningThresholds,
} from "./storage-health.js";

describe("storage health", () => {
  it("computes aggregate metrics and deleted ratio", () => {
    const metrics = computeStorageMetrics(80, 20);
    expect(metrics.activeCount).toBe(80);
    expect(metrics.deletedCount).toBe(20);
    expect(metrics.totalCount).toBe(100);
    expect(metrics.deletedRatio).toBe(0.2);
  });

  it("warns when active dataset exceeds threshold", () => {
    const warnings = evaluateStorageWarnings(computeStorageMetrics(6000, 0), {
      activeCountWarn: 5000,
      softDeletedCountWarn: 500,
      softDeletedRatioWarn: 0.2,
    });

    expect(warnings.some((warning) => warning.code === "LARGE_ACTIVE_DATASET")).toBe(true);
  });

  it("warns when soft-deleted backlog exceeds count threshold", () => {
    const warnings = evaluateStorageWarnings(computeStorageMetrics(200, 700), {
      activeCountWarn: 5000,
      softDeletedCountWarn: 500,
      softDeletedRatioWarn: 0.9,
    });

    expect(warnings.some((warning) => warning.code === "SOFT_DELETED_BACKLOG")).toBe(true);
  });

  it("warns when soft-deleted ratio exceeds threshold even with smaller counts", () => {
    const warnings = evaluateStorageWarnings(computeStorageMetrics(40, 20), {
      activeCountWarn: 5000,
      softDeletedCountWarn: 500,
      softDeletedRatioWarn: 0.2,
    });

    expect(warnings.some((warning) => warning.code === "SOFT_DELETED_BACKLOG")).toBe(true);
  });

  it("formats warnings for plain text channels", () => {
    const text = formatStorageWarningsForText([
      {
        code: "SOFT_DELETED_BACKLOG",
        message: "700 soft-deleted memories pending vacuum (78% of total records).",
        remediation: ["Run: memories doctor --fix"],
      },
    ]);

    expect(text).toContain("Storage warning:");
    expect(text).toContain("soft-deleted memories pending vacuum");
    expect(text).toContain("Run: memories doctor --fix");
  });

  it("resolves thresholds from environment", () => {
    const thresholds = resolveStorageWarningThresholds({
      ...process.env,
      MEMORIES_WARN_ACTIVE_COUNT: "8000",
      MEMORIES_WARN_SOFT_DELETED_COUNT: "900",
      MEMORIES_WARN_SOFT_DELETED_RATIO: "0.35",
    });

    expect(thresholds.activeCountWarn).toBe(8000);
    expect(thresholds.softDeletedCountWarn).toBe(900);
    expect(thresholds.softDeletedRatioWarn).toBe(0.35);
  });

  it("queries active and soft-deleted counts from db", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ count: 12 }] })
      .mockResolvedValueOnce({ rows: [{ count: 3 }] });

    const db = { execute } as unknown as Client;
    const metrics = await getStorageMetrics(db);

    expect(metrics.activeCount).toBe(12);
    expect(metrics.deletedCount).toBe(3);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("returns warnings alongside metrics", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ count: 7000 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });
    const db = { execute } as unknown as Client;

    const { metrics, warnings } = await getStorageWarnings(db);

    expect(metrics.activeCount).toBe(7000);
    expect(warnings.some((warning) => warning.code === "LARGE_ACTIVE_DATASET")).toBe(true);
  });
});
