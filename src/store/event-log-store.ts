"use client";

import { create } from "zustand";
import type { OperationalEvent, EventLevel, EventCategory } from "@/types";
import { generateDemoEvents } from "@/lib/event-logger";
import { EVENT_LOG_MAX_SIZE } from "@/config/constants";
import { isDemoMode as checkDemoMode } from "@/config/env";

interface EventLogState {
  events: OperationalEvent[];
  isLoading: boolean;
  /** Push a new event into the ring buffer */
  logEvent(event: OperationalEvent): void;
  /** Get events filtered by level */
  getByLevel(level: EventLevel): OperationalEvent[];
  /** Get events filtered by category */
  getByCategory(category: EventCategory): OperationalEvent[];
  /** Get errors and critical events */
  getErrors(): OperationalEvent[];
  /** Get recent N events */
  getRecent(n: number): OperationalEvent[];
  /** Get event count */
  getCount(): number;
  /** Get event counts by level for dashboard */
  getLevelCounts(): Record<EventLevel, number>;
  /** Get event counts by category for dashboard */
  getCategoryCounts(): Record<EventCategory, number>;
  /** Seed with demo data */
  seedDemo(): void;
  /** Clear all events */
  clear(): void;
}

export const useEventLogStore = create<EventLogState>((set, get) => ({
  events: checkDemoMode() ? generateDemoEvents() : [],
  isLoading: false,

  logEvent(event) {
    set((s) => {
      const updated = [...s.events, event];
      if (updated.length > EVENT_LOG_MAX_SIZE) {
        return { events: updated.slice(updated.length - EVENT_LOG_MAX_SIZE) };
      }
      return { events: updated };
    });
  },

  getByLevel(level) {
    return get().events.filter((e) => e.level === level);
  },

  getByCategory(category) {
    return get().events.filter((e) => e.category === category);
  },

  getErrors() {
    return get().events.filter(
      (e) => e.level === "error" || e.level === "critical",
    );
  },

  getRecent(n) {
    return get().events.slice(-n).reverse();
  },

  getCount() {
    return get().events.length;
  },

  getLevelCounts() {
    const counts: Record<EventLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    };
    for (const e of get().events) {
      counts[e.level]++;
    }
    return counts;
  },

  getCategoryCounts() {
    const counts: Record<EventCategory, number> = {
      transaction: 0,
      auth: 0,
      sync: 0,
      maintenance: 0,
      network: 0,
      permission: 0,
      recovery: 0,
      backup: 0,
    };
    for (const e of get().events) {
      counts[e.category]++;
    }
    return counts;
  },

  seedDemo() {
    set({ events: generateDemoEvents(), isLoading: false });
  },

  clear() {
    set({ events: [], isLoading: false });
  },
}));
