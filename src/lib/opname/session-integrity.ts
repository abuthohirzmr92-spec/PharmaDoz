// ---------------------------------------------------------------------------
// RC1 P0E.3 — Session Integrity Validator (Pure Functions)
// ---------------------------------------------------------------------------
// Foundation for P0F Progress Tracking. No DB. No UI.
// ---------------------------------------------------------------------------

import type { StockOpnameSession, StockOpnameSessionItem, SessionItemStatus } from "@/types/opname-session";

export function validateSession(session: StockOpnameSession | null): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!session) { errors.push("Session tidak ditemukan."); return { valid: false, errors }; }
  if (!session.id) errors.push("Session ID wajib diisi.");
  if (!session.title?.trim()) errors.push("Nama session wajib diisi.");
  if (!session.conductedBy?.trim()) errors.push("Petugas wajib diisi.");
  const validStatuses = ["draft", "in_progress", "paused", "completed"];
  if (!validStatuses.includes(session.status)) errors.push(`Status "${session.status}" tidak valid.`);
  return { valid: errors.length === 0, errors };
}

export function validateSessionItems(items: StockOpnameSessionItem[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (items.length === 0) { errors.push("Session tidak memiliki item."); return { valid: false, errors }; }

  const keys = new Set<string>();
  for (const item of items) {
    if (!item.productId) errors.push(`Item "${item.key}": productId wajib.`);
    if (!item.batchId) errors.push(`Item "${item.key}": batchId wajib.`);
    if (item.systemQty < 0) errors.push(`Item "${item.key}": systemQty tidak valid.`);
    if (keys.has(item.key)) errors.push(`Item "${item.key}" duplikat.`);
    keys.add(item.key);
  }

  return { valid: errors.length === 0, errors };
}

export function validateSessionProgress(
  session: StockOpnameSession,
  items: StockOpnameSessionItem[],
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (session.totalItems !== items.length) {
    errors.push(`totalItems mismatch: session=${session.totalItems}, items=${items.length}`);
  }

  const completed = items.filter(i => i.status === "counted" || i.status === "skipped").length;
  if (session.completedItems !== completed) {
    errors.push(`completedItems mismatch: session=${session.completedItems}, actual=${completed}`);
  }

  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
  if (session.progressPercent !== pct) {
    errors.push(`progressPercent mismatch: session=${session.progressPercent}%, actual=${pct}%`);
  }

  return { valid: errors.length === 0, errors };
}

export function getCompletionSummary(items: StockOpnameSessionItem[]): {
  total: number;
  pending: number;
  counted: number;
  skipped: number;
} {
  const counted = items.filter(i => i.status === "counted").length;
  const skipped = items.filter(i => i.status === "skipped").length;
  const pending = items.filter(i => i.status === "pending").length;
  return { total: items.length, pending, counted, skipped };
}
