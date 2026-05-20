"use client";

import { create } from "zustand";
import type { MetricPoint, MetricName, HealthSnapshot } from "@/types";
import {
  createHealthSnapshot,
  generateDemoMetrics,
  getMetricAverage,
  type ComponentHealth,
} from "@/lib/metrics";
import { isDemoMode as checkDemoMode } from "@/config/env";

interface MetricsState {
  metrics: MetricPoint[];
  snapshot: HealthSnapshot | null;
  isLoading: boolean;
  /** Add a metric point */
  record(metric: MetricPoint): void;
  /** Compute current health snapshot */
  computeSnapshot(components: Record<string, ComponentHealth>): void;
  /** Get average for a metric name */
  getAverage(name: MetricName): number | null;
  /** Get metrics by name */
  getByName(name: MetricName): MetricPoint[];
  /** Get recent N metrics */
  getRecent(n: number): MetricPoint[];
  /** Seed demo data */
  seedDemo(): void;
  /** Clear all metrics */
  clear(): void;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  metrics: checkDemoMode() ? generateDemoMetrics() : [],
  snapshot: null,
  isLoading: false,

  record(metric) {
    set((s) => ({ metrics: [...s.metrics, metric] }));
  },

  computeSnapshot(components) {
    const snapshot = createHealthSnapshot(components);
    set({ snapshot });
    return snapshot;
  },

  getAverage(name) {
    return getMetricAverage(name);
  },

  getByName(name) {
    return get().metrics.filter((m) => m.name === name);
  },

  getRecent(n) {
    return get().metrics.slice(-n).reverse();
  },

  seedDemo() {
    set({ metrics: generateDemoMetrics(), isLoading: false, snapshot: null });
  },

  clear() {
    set({ metrics: [], isLoading: false, snapshot: null });
  },
}));
