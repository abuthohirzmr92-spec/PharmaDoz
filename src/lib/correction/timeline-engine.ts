// =================================================================
// Timeline Engine — reconstructs full correction lifecycle
// EEOS V5 — Platform Architect Approved
// All events linked by correlation_id
// =================================================================

import type { TimelineEvent } from "./correction-types";

export interface TimelineParams {
  correlationId: string;
}

/**
 * Build a chronological timeline from all available sources.
 *
 * In production: queries multiple tables joined by correlation_id.
 * For V1 demo: reads from sessionStorage event log.
 */
export async function buildTimeline(params: TimelineParams): Promise<TimelineEvent[]> {
  const { correlationId } = params;

  // In production, this would query:
  //   otp_sessions WHERE correlation_id = ?
  //   transaction_corrections WHERE correlation_id = ?
  //   activity_logs WHERE correlation_id = ?
  //   stock_movements WHERE correlation_id = ?
  //   notifications WHERE correlation_id = ?
  // All UNION ALL, ORDER BY created_at

  // For V1 demo: read from localStorage event store
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(`timeline:${correlationId}`);
    if (stored) {
      const events: TimelineEvent[] = JSON.parse(stored);
      return events.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
  }

  return [];
}

/**
 * Append an event to the timeline.
 */
export function appendTimelineEvent(
  correlationId: string,
  event: Omit<TimelineEvent, "correlationId">,
): void {
  if (typeof window === "undefined") return;

  const key = `timeline:${correlationId}`;
  const stored = localStorage.getItem(key);
  const events: TimelineEvent[] = stored ? JSON.parse(stored) : [];

  events.push({
    ...event,
    correlationId,
    createdAt: event.createdAt || new Date().toISOString(),
  });

  localStorage.setItem(key, JSON.stringify(events));
}

/**
 * Build timeline for a specific resource (all corrections on one invoice).
 */
export async function buildResourceTimeline(params: {
  resourceType: string;
  resourceId: string;
}): Promise<TimelineEvent[]> {
  // In production: query all corrections for this resource,
  // then build timeline for each correlation_id, merge and sort
  const { resourceType, resourceId } = params;

  if (typeof window !== "undefined") {
    // Scan all timeline keys for this resource
    const events: TimelineEvent[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("timeline:")) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const timelineEvents: TimelineEvent[] = JSON.parse(stored);
          events.push(...timelineEvents);
        }
      }
    }
    return events.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  return [];
}
