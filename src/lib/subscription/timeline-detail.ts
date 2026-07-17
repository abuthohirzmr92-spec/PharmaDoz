// ---------------------------------------------------------------------------
// Timeline detail ViewModel — friendly formatting of event metadata (PURE)
// ---------------------------------------------------------------------------
// Consumes a TimelineNode and returns key/value pairs suitable for a detail
// panel. Never exposes raw JSON directly. Presentation-only.
// ---------------------------------------------------------------------------

import type { TimelineNode } from "@/lib/repositories/subscription";

export interface TimelineDetailEntry { label: string; value: string }

export function timelineDetail(n: TimelineNode): TimelineDetailEntry[] {
  const m = (n.metadata as Record<string, unknown>) ?? {};
  const out: TimelineDetailEntry[] = [];

  const reason = typeOf(m.reason, "string");
  if (reason) out.push({ label: "Alasan", value: reason });

  const trigger = m.trigger as Record<string, unknown> | undefined;
  if (trigger?.kind) out.push({ label: "Pemicu", value: String(trigger.kind) });

  const correlationId = typeOf(m.correlation_id, "string");
  if (correlationId) out.push({ label: "ID Korelasi", value: correlationId });

  const before = m.before as Record<string, unknown> | undefined;
  if (before?.lifecycle_state) out.push({ label: "Status sebelumnya", value: String(before.lifecycle_state) });

  const after = m.after as Record<string, unknown> | undefined;
  if (after?.lifecycle_state) out.push({ label: "Status setelah", value: String(after.lifecycle_state) });

  const actorId = (n.actorId && n.actorId.length >= 8) ? n.actorId.slice(0, 8) : null;
  if (actorId) out.push({ label: "Actor ID", value: actorId });

  return out;
}

function typeOf(v: unknown, t: string): string | null {
  return typeof v === t ? String(v) : null;
}
