// =================================================================
// Event Handlers — Side effects for correction domain events
// EEOS V5 — Platform Architect Approved
// =================================================================

import { eventBus } from "./event-bus";
import { appendTimelineEvent } from "./timeline-engine";
import type { CorrectionDomainEvent } from "./correction-types";

// ─── Audit Handler ───
// In production: writes to activity_logs + revision_audit_details
function auditHandler(event: CorrectionDomainEvent): void {
  appendTimelineEvent(event.correlationId, {
    source: "audit",
    eventType: event.type,
    createdAt: new Date().toISOString(),
    summary: JSON.stringify(event),
  });
}

// ─── Notification Handler ───
// In production: sends email/in-app notifications
function notificationHandler(event: CorrectionDomainEvent): void {
  if (event.type === "correction.apply.completed") {
    appendTimelineEvent(event.correlationId, {
      source: "notification",
      eventType: "sent",
      createdAt: new Date().toISOString(),
      summary: `Notification sent for correction ${event.correctionId}`,
    });
  }
}

// ─── Timeline Handler ───
function timelineHandler(event: CorrectionDomainEvent): void {
  appendTimelineEvent(event.correlationId, {
    source: event.type.split(".")[0] ?? "correction",
    eventType: event.type,
    createdAt: new Date().toISOString(),
    summary: event.type,
  });
}

// ─── Register all handlers ───

const HANDLERS: Record<string, (event: any) => void> = {
  "correction.draft.created": auditHandler,
  "correction.otp.requested": auditHandler,
  "correction.otp.verified": auditHandler,
  "correction.otp.failed": auditHandler,
  "correction.apply.requested": auditHandler,
  "correction.apply.completed": auditHandler,
  "correction.apply.failed": auditHandler,
  "correction.rollback.requested": auditHandler,
  "correction.rollback.completed": auditHandler,
  "correction.notification.sent": timelineHandler,
};

// Also subscribe notification handler for completed events
eventBus.subscribe("correction.apply.completed", notificationHandler);
eventBus.subscribe("correction.rollback.completed", notificationHandler);

// Subscribe all audit handlers
for (const [eventType, handler] of Object.entries(HANDLERS)) {
  eventBus.subscribe(eventType, handler);
}

// Also subscribe timeline handler for ALL events
const allEventTypes = [
  "correction.draft.created",
  "correction.otp.requested",
  "correction.otp.verified",
  "correction.otp.failed",
  "correction.approval.required",
  "correction.approval.granted",
  "correction.approval.rejected",
  "correction.apply.requested",
  "correction.apply.completed",
  "correction.apply.failed",
  "correction.rollback.requested",
  "correction.rollback.completed",
  "correction.notification.sent",
];

for (const eventType of allEventTypes) {
  eventBus.subscribe(eventType, timelineHandler);
}
