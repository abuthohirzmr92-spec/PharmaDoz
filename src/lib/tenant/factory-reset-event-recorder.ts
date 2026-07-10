// =================================================================
// MEDISYNC — Factory Reset Event Recorder
// 🔒 Architecture Constitution v1.0
//
// Records domain events during reset. Does NOT publish.
// Publishing is a future extension — this just collects.
// =================================================================

import type { DomainEvent } from "./factory-reset.types";

export class FactoryResetEventRecorder {
  private events: DomainEvent[] = [];
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  record(type: string, payload: Record<string, unknown> = {}): void {
    this.events.push({
      eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventType: type,
      tenantId: this.tenantId,
      occurredAt: new Date().toISOString(),
      payload,
    });
  }

  all(): readonly DomainEvent[] {
    return this.events;
  }

  count(): number {
    return this.events.length;
  }
}
