import type { TelemetryEvent } from "./types";

type TelemetryListener = (event: TelemetryEvent) => void;

class TelemetryBus {
  private listeners: Set<TelemetryListener> = new Set();
  private events: TelemetryEvent[] = [];
  private maxEvents = 500;

  emit(event: Omit<TelemetryEvent, "id" | "timestamp">): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
    };
    this.events.push(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    this.listeners.forEach((fn) => {
      try {
        fn(fullEvent);
      } catch {
        /* prevent listener errors from breaking bus */
      }
    });
  }

  on(fn: TelemetryListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  getRecent(limit = 50): TelemetryEvent[] {
    return this.events.slice(-limit).reverse();
  }

  getByLevel(level: string, limit = 50): TelemetryEvent[] {
    return this.events
      .filter((e) => e.level === level)
      .slice(-limit)
      .reverse();
  }

  getBySource(source: string, limit = 50): TelemetryEvent[] {
    return this.events
      .filter((e) => e.source === source)
      .slice(-limit)
      .reverse();
  }

  clear(): void {
    this.events = [];
  }
}

export const telemetryBus = new TelemetryBus();
export { TelemetryBus };
