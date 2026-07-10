// =================================================================
// EEOS Execution Engine — Trace
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Immutable execution trace. Append-only.
// =================================================================

export interface TraceEntry {
  timestamp: string;
  engine: string;
  phase: string;
  event: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
}

export function createTrace(): TraceEntry[] {
  return [];
}

export function recordTrace(
  trace: readonly TraceEntry[],
  entry: Omit<TraceEntry, "timestamp">,
): TraceEntry[] {
  return [
    ...trace,
    { ...entry, timestamp: new Date().toISOString() },
  ];
}
