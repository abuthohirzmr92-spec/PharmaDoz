// =================================================================
// In-Process Event Bus — Domain Events for Correction Framework
// EEOS V5 — Platform Architect Approved
// V1: In-process, V2: Out-of-process (RabbitMQ/Kafka compatible)
// =================================================================

import type { CorrectionDomainEvent } from "./correction-types";

type EventHandler = (event: CorrectionDomainEvent) => void | Promise<void>;

class EventBusImpl {
  private handlers = new Map<string, Set<EventHandler>>();

  publish(event: CorrectionDomainEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(`[EventBus] Handler error for ${event.type}:`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Sync handler error for ${event.type}:`, err);
      }
    }
  }

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  subscribeAll(handlers: Record<string, EventHandler>): () => void {
    const unsubs: Array<() => void> = [];
    for (const [eventType, handler] of Object.entries(handlers)) {
      unsubs.push(this.subscribe(eventType, handler));
    }
    return () => unsubs.forEach((u) => u());
  }

  clear(): void {
    this.handlers.clear();
  }
}

// Singleton
export const eventBus = new EventBusImpl();
