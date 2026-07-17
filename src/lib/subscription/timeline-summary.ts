// ---------------------------------------------------------------------------
// Timeline summary ViewModel helpers (PURE)
// ---------------------------------------------------------------------------
// Presentation-only: aggregate event counts, filter by type. Consume timeline
// nodes already fetched via SubscriptionRepository.getTimeline().
// ---------------------------------------------------------------------------

import type { TimelineNode } from "@/lib/repositories/subscription";

export interface TimelineFilters {
  eventTypes?: string[];
}

export function applyTimelineFilters(nodes: TimelineNode[], filters: TimelineFilters): TimelineNode[] {
  if (!filters.eventTypes || filters.eventTypes.length === 0) return nodes;
  const allowed = new Set(filters.eventTypes);
  return nodes.filter((n) => allowed.has(n.eventType));
}

/** Count occurrences of each event type in the timeline. */
export function timelineEventCounts(nodes: TimelineNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const n of nodes) {
    counts[n.eventType] = (counts[n.eventType] ?? 0) + 1;
  }
  return counts;
}
