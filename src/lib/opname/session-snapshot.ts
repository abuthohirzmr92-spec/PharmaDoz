// ---------------------------------------------------------------------------
// RC1 P0F.1 — Batch-Based Session Snapshot Engine
// ---------------------------------------------------------------------------
// Pure functions. Zero side effects. No DB. No Zustand.
// Session items are BATCH-based (not product-based).
// ---------------------------------------------------------------------------

import type { SessionItemStatus } from "@/types/opname-session";

export interface SessionSnapshotItem {
  /** Composite key: "productId:batchId" */
  key: string;
  productId: string;
  batchId: string;
  status: SessionItemStatus;
}

export interface BatchInput {
  productId: string;
  batchId: string;
  quantity: number;
  productName?: string;
  rackLocation?: string | null;
}

/**
 * Build batch-based session snapshot from inventory data.
 * One entry per batch — matches FEFO unit of work.
 *
 * Filters by rack location if provided.
 */
export function buildBatchSessionSnapshot(
  batches: BatchInput[],
  selectedLocationIds: string[] = [],
): SessionSnapshotItem[] {
  const active = batches.filter((b) => b.quantity > 0);

  const filtered =
    selectedLocationIds.length === 0
      ? active
      : active.filter((b) => {
          const loc = (b.rackLocation ?? "").trim().toLowerCase();
          return loc.length > 0 && selectedLocationIds.map((s) => s.toLowerCase()).includes(loc);
        });

  return filtered.map((b) => ({
    key: `${b.productId}:${b.batchId}`,
    productId: b.productId,
    batchId: b.batchId,
    status: "pending",
  }));
}
