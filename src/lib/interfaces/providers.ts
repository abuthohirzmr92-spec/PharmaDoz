// =================================================================
// Infrastructure Provider Interfaces — EEOS V5 Compliance
// Constitution Article 5: Reusable First
// Constitution Article 6: Extension Point Required
// =================================================================

import type { CorrectionDomainEvent } from "../correction/correction-types";

// ─── Event Bus Provider ───

export interface IEventBus {
  publish(event: CorrectionDomainEvent): void;
  subscribe(eventType: string, handler: (event: CorrectionDomainEvent) => void): () => void;
  subscribeAll(handlers: Record<string, (event: CorrectionDomainEvent) => void>): () => void;
  clear(): void;
}

// ─── Notification Provider ───

export interface NotificationPayload {
  correlationId: string;
  tenantId: string;
  eventType: string;
  channel: "email" | "in_app";
  recipientUserId?: string;
  recipientEmail?: string;
  recipientRole?: string;
  subject?: string;
  body?: string;
}

export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<{ success: boolean; error?: string }>;
  sendBatch(payloads: NotificationPayload[]): Promise<{ success: boolean; errors?: string[] }>;
}

// ─── OTP Provider ───

export interface OtpRequestPayload {
  module: string;
  resourceType: string;
  resourceId: string;
  correlationId: string;
  tenantId: string;
  destination: string;
  deliveryChannel?: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export interface OtpVerifyPayload {
  sessionId: string;
  code: string;
}

export interface IOtpProvider {
  requestOtp(payload: OtpRequestPayload): Promise<{ sessionId: string; expiresAt: string }>;
  verifyOtp(payload: OtpVerifyPayload): Promise<{ valid: boolean; reason?: string }>;
  isVerified(sessionId: string): boolean;
  revokeSession(sessionId: string): void;
}

// ─── Timeline Provider ───

export interface TimelineEventData {
  correlationId: string;
  source: string;
  eventType: string;
  createdAt: string;
  status?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface ITimelineProvider {
  appendEvent(event: TimelineEventData): void;
  getTimeline(correlationId: string): Promise<TimelineEventData[]>;
  getResourceTimeline(resourceType: string, resourceId: string): Promise<TimelineEventData[]>;
}

// ─── Audit Provider ───

export interface AuditEntryPayload {
  correlationId: string;
  action: string;
  actorId: string;
  actorName: string;
  resourceType: string;
  resourceId: string;
  tenantId: string;
  branchId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface IAuditProvider {
  writeAudit(entry: AuditEntryPayload): Promise<void>;
  getAuditTrail(params: { resourceType: string; resourceId: string }): Promise<AuditEntryPayload[]>;
  getAuditByCorrelation(correlationId: string): Promise<AuditEntryPayload[]>;
}

// ─── Provider Registry (Dependency Injection) ───

export interface ProviderRegistry {
  eventBus: IEventBus;
  notification: INotificationProvider;
  otp: IOtpProvider;
  timeline: ITimelineProvider;
  audit: IAuditProvider;
}

let _registry: ProviderRegistry | null = null;

export function setProviderRegistry(registry: ProviderRegistry): void {
  _registry = registry;
}

export function getProviderRegistry(): ProviderRegistry {
  if (!_registry) {
    throw new Error("Provider registry not initialized. Call setProviderRegistry() first.");
  }
  return _registry;
}
