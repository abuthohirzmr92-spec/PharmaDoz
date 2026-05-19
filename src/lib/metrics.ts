"use client";

import type { MetricName, MetricPoint, HealthSnapshot } from "@/types";

export function createMetricPoint(
  name: MetricName,
  value: number,
  unit?: string,
  tags?: Record<string, string>,
): MetricPoint {
  return {
    name,
    value,
    unit: unit ?? undefined,
    tags: tags ?? undefined,
    timestamp: new Date().toISOString(),
  };
}

// Convenience collectors for each metric category
export function recordTransactionLatency(latencyMs: number, pharmacyId?: string) {
  return createMetricPoint("transaction.latency_ms", latencyMs, "ms", pharmacyId ? { pharmacyId } : undefined);
}

export function recordTransactionVolume(count: number, pharmacyId?: string) {
  return createMetricPoint("transaction.volume", count, "count", pharmacyId ? { pharmacyId } : undefined);
}

export function recordAuthSuccessRate(rate: number) {
  return createMetricPoint("auth.success_rate", rate, "percent");
}

export function recordAuthFailureRate(rate: number) {
  return createMetricPoint("auth.failure_rate", rate, "percent");
}

export function recordSyncPendingCount(count: number) {
  return createMetricPoint("sync.pending_count", count, "count");
}

export function recordSyncFailureRate(rate: number) {
  return createMetricPoint("sync.failure_rate", rate, "percent");
}

export function recordOfflineDuration(durationS: number) {
  return createMetricPoint("network.offline_duration_s", durationS, "s");
}

export function recordNetworkDegraded(count: number) {
  return createMetricPoint("network.degraded_count", count, "count");
}

export function recordMaintenanceActive(count: number) {
  return createMetricPoint("maintenance.active", count, "count");
}

export function recordTenantActiveCount(count: number) {
  return createMetricPoint("tenant.active_count", count, "count");
}

export function recordRecoveryAttempts(count: number) {
  return createMetricPoint("recovery.attempts", count, "count");
}

export function recordQueueBacklogDepth(depth: number) {
  return createMetricPoint("queue.backlog_depth", depth, "count");
}

// Health snapshot builder
export interface ComponentHealth {
  status: "healthy" | "degraded" | "down";
  details?: string;
}

export function createHealthSnapshot(components: Record<string, ComponentHealth>): HealthSnapshot {
  const statuses = Object.values(components).map((c) => c.status);
  const hasDown = statuses.includes("down");
  const hasDegraded = statuses.includes("degraded");

  return {
    overall: hasDown ? "down" : hasDegraded ? "degraded" : "healthy",
    components: Object.fromEntries(
      Object.entries(components).map(([k, v]) => [k, v.status]),
    ),
    updatedAt: new Date().toISOString(),
  };
}

// In-memory metrics buffer
let metricsBuffer: MetricPoint[] = [];

export function collectMetric(metric: MetricPoint) {
  metricsBuffer.push(metric);
}

export function getMetricsBuffer(): MetricPoint[] {
  return [...metricsBuffer];
}

export function flushMetrics(): MetricPoint[] {
  const flushed = [...metricsBuffer];
  metricsBuffer = [];
  return flushed;
}

export function getMetricsSince(since: Date): MetricPoint[] {
  return metricsBuffer.filter((m) => new Date(m.timestamp) >= since);
}

export function getMetricAverage(name: MetricName): number | null {
  const relevant = metricsBuffer.filter((m) => m.name === name);
  if (relevant.length === 0) return null;
  return relevant.reduce((sum, m) => sum + m.value, 0) / relevant.length;
}

// Demo metrics generator
export function generateDemoMetrics(): MetricPoint[] {
  const now = Date.now();
  const metrics: MetricPoint[] = [];
  for (let i = 0; i < 40; i++) {
    const names: MetricName[] = [
      "transaction.latency_ms",
      "transaction.volume",
      "auth.success_rate",
      "sync.pending_count",
      "network.offline_duration_s",
      "queue.backlog_depth",
    ];
    const name = names[i % names.length]!;
    metrics.push({
      name,
      value:
        name === "transaction.latency_ms"
          ? Math.round(50 + Math.random() * 200)
          : name === "auth.success_rate"
            ? Math.round(85 + Math.random() * 15)
            : Math.round(Math.random() * 100),
      unit: name.includes("rate")
        ? "percent"
        : name.includes("latency")
          ? "ms"
          : "count",
      timestamp: new Date(now - i * 60000).toISOString(),
    });
  }
  return metrics;
}
