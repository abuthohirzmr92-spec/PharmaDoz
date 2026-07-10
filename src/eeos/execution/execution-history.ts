// =================================================================
// EEOS Execution Engine — History
// 🔒 Certified Architecture v2.x (LOCKED)
//
// In-memory execution history. Append-only. No persistence.
// =================================================================

import type { EngineResult } from "../runtime/types";

export interface HistoryEntry {
  executionId: string;
  engineId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  result: EngineResult | null;
}

const history: HistoryEntry[] = [];

export function appendHistory(entry: HistoryEntry): void {
  history.push({ ...entry });
}

export function findHistory(executionId: string): HistoryEntry[] {
  return history.filter((e) => e.executionId === executionId);
}

export function latestHistory(limit = 10): HistoryEntry[] {
  return history.slice(-limit);
}

export function clearHistory(): void {
  history.length = 0;
}
