// =================================================================
// Default Adapters — EEOS V5 Compliance
// Constitution Article 5: Reusable First
//
// V1: In-memory / browser storage adapters
// V2: Production adapters (Supabase, Resend, etc.)
// =================================================================

import type {
  IEventBus,
  INotificationProvider,
  IOtpProvider,
  ITimelineProvider,
  IAuditProvider,
  NotificationPayload,
  OtpRequestPayload,
  OtpVerifyPayload,
  TimelineEventData,
  AuditEntryPayload,
} from "./providers";
import { eventBus as globalEventBus } from "../correction/event-bus";
import { otpService as globalOtpService } from "../otp/otp-service";
import { appendTimelineEvent, buildTimeline } from "../correction/timeline-engine";
import type { CorrectionDomainEvent } from "../correction/correction-types";

// ─── Default EventBus Adapter ───

export class DefaultEventBus implements IEventBus {
  publish(event: CorrectionDomainEvent): void {
    globalEventBus.publish(event);
  }
  subscribe(eventType: string, handler: (event: CorrectionDomainEvent) => void): () => void {
    return globalEventBus.subscribe(eventType, handler);
  }
  subscribeAll(handlers: Record<string, (event: CorrectionDomainEvent) => void>): () => void {
    return globalEventBus.subscribeAll(handlers);
  }
  clear(): void {
    globalEventBus.clear();
  }
}

// ─── Default Notification Adapter (V1: console log) ───

export class DefaultNotificationProvider implements INotificationProvider {
  async send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    // V1: Log to console. V2: Send via Resend email.
    console.log(`[Notification] ${payload.eventType} → ${payload.recipientEmail ?? payload.recipientRole} [${payload.channel}]`);
    return { success: true };
  }

  async sendBatch(payloads: NotificationPayload[]): Promise<{ success: boolean; errors?: string[] }> {
    for (const p of payloads) {
      await this.send(p);
    }
    return { success: true };
  }
}

// ─── Default OTP Adapter (V1: sessionStorage) ───

export class DefaultOtpProvider implements IOtpProvider {
  async requestOtp(payload: OtpRequestPayload): Promise<{ sessionId: string; expiresAt: string }> {
    return globalOtpService.requestOtp({
      module: payload.module as any,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      correlationId: payload.correlationId,
      tenantId: payload.tenantId,
      destination: payload.destination,
      createdBy: payload.createdBy,
    });
  }

  async verifyOtp(payload: OtpVerifyPayload): Promise<{ valid: boolean; reason?: string }> {
    return globalOtpService.verifyOtp({
      sessionId: payload.sessionId,
      code: payload.code,
    });
  }

  isVerified(sessionId: string): boolean {
    return globalOtpService.isVerified(sessionId);
  }

  revokeSession(sessionId: string): void {
    globalOtpService.revokeSession(sessionId);
  }
}

// ─── Default Timeline Adapter (V1: localStorage) ───

export class DefaultTimelineProvider implements ITimelineProvider {
  appendEvent(event: TimelineEventData): void {
    appendTimelineEvent(event.correlationId, {
      source: event.source,
      eventType: event.eventType,
      createdAt: event.createdAt,
      status: event.status,
      summary: event.summary,
      metadata: event.metadata,
    });
  }

  async getTimeline(correlationId: string): Promise<TimelineEventData[]> {
    return buildTimeline({ correlationId });
  }

  async getResourceTimeline(_resourceType: string, _resourceId: string): Promise<TimelineEventData[]> {
    // V1: Scan localStorage. V2: Query DB by resource_type + resource_id.
    return [];
  }
}

// ─── Default Audit Adapter (V1: console log) ───

export class DefaultAuditProvider implements IAuditProvider {
  async writeAudit(entry: AuditEntryPayload): Promise<void> {
    // V1: Log to console. V2: Write to activity_logs + audit_details tables.
    console.log(`[Audit] ${entry.action} | ${entry.resourceType}:${entry.resourceId} | by ${entry.actorName} [${entry.correlationId}]`);
  }

  async getAuditTrail(_params: { resourceType: string; resourceId: string }): Promise<AuditEntryPayload[]> {
    return [];
  }

  async getAuditByCorrelation(_correlationId: string): Promise<AuditEntryPayload[]> {
    return [];
  }
}

// ─── Default Provider Registry (V1: in-memory adapters) ───

import { setProviderRegistry } from "./providers";

export function initializeDefaultProviders(): void {
  setProviderRegistry({
    eventBus: new DefaultEventBus(),
    notification: new DefaultNotificationProvider(),
    otp: new DefaultOtpProvider(),
    timeline: new DefaultTimelineProvider(),
    audit: new DefaultAuditProvider(),
  });
}
