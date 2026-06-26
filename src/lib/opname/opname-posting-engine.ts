// ---------------------------------------------------------------------------
// RC1 P0H.3G-BUGFIX — Opname Posting Engine (Shared Persistence)
// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for stock opname posting.
// Used by: Legacy Path (performOpname) + Session Path (postSessionOpname).
//
// ZERO UI dependencies. ZERO Store dependencies. Repository only.
//
// Business Rule:
//   1. Create stock_opname + stock_opname_items in DB
//   2. Reload current batch quantities (prevent concurrent corruption)
//   3. For each item with difference: update batch + create movement
//   4. Return result with updated batches
// ---------------------------------------------------------------------------

import type { ProductBatch } from "@/types/inventory";
import { inventoryRepo } from "@/lib/repository-instances";

// ============================================================================
// Types
// ============================================================================

export interface OpnamePostingItem {
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
  note?: string;
}

export interface OpnamePostingInput {
  date: string;
  status?: string;
  conductedBy?: string;
  notes?: string;
  referencePrefix?: string;   // e.g. "OPN" for legacy, "SES" for session
  items: OpnamePostingItem[];
}

export interface OpnamePostingOutput {
  success: boolean;
  opnameId?: string;
  updatedBatches?: ProductBatch[];
  error?: string;
}

// ============================================================================
// Engine
// ============================================================================

/**
 * Post stock opname results to database.
 *
 * This is the SINGLE SOURCE OF TRUTH for opname persistence.
 * Both legacy performOpname() and session postSessionOpname() call this.
 *
 * Flow:
 *   1. Validate items
 *   2. Create stock_opname + items in DB
 *   3. Reload current batch quantities (P4C: prevent concurrent corruption)
 *   4. For each item with difference: update batch + create movement
 *   5. Return result
 */
export async function postOpnameResults(
  input: OpnamePostingInput,
): Promise<OpnamePostingOutput> {
  // Step 1: Validate
  const itemsWithDiff = input.items.filter((i) => i.difference !== 0);
  console.log("[ENGINE-TRACE-1] ENTER postOpnameResults. total items:", input.items.length, "itemsWithDiff:", itemsWithDiff.length);
  if (itemsWithDiff.length === 0 && input.items.length === 0) {
    return { success: false, error: "Tidak ada item untuk diposting." };
  }

  try {
    // Step 2: Create stock opname header + items
    console.log("[ENGINE-TRACE-2] Calling inventoryRepo.createStockOpname. itemsWithDiff:", itemsWithDiff.length, "total input items:", input.items.length);
    console.log("[ENGINE-TRACE-2a] Items sample (first 3):", JSON.stringify(input.items.slice(0, 3).map(i => ({
      productId: i.productId,
      batchId: i.batchId,
      systemQty: i.systemQty,
      physicalQty: i.physicalQty,
      difference: i.difference,
    }))));
    const { id: opnameId } = await inventoryRepo.createStockOpname({
      opnameDate: input.date,
      status: input.status ?? "confirmed",
      conductedBy: input.conductedBy ?? undefined,
      notes: input.notes ?? undefined,
      items: itemsWithDiff.map((item) => ({
        productId: item.productId,
        batchId: item.batchId || undefined,
        systemQty: item.systemQty,
        physicalQty: item.physicalQty,
        note: item.note || undefined,
      })),
    });

    console.log("[ENGINE-TRACE-3] createStockOpname SUCCESS. opnameId:", opnameId);
    // Step 3: Reload current batch quantities (P4C: prevent concurrent corruption)
    const currentBatches = await inventoryRepo.getBatches();
    const batchQtyMap = new Map(currentBatches.map((b) => [b.id, b.quantity]));

    // Step 4: For each item with difference — update batch + movement
    const prefix = input.referencePrefix ?? "OPN";
    for (const item of input.items) {
      if (item.difference === 0) continue;

      // Use LIVE quantity, not snapshotted systemQty
      const currentQty = batchQtyMap.get(item.batchId) ?? item.systemQty;
      const actualDiff = item.physicalQty - currentQty;
      if (actualDiff === 0) continue; // concurrent change resolved the difference

      await inventoryRepo.updateBatchQuantity(item.batchId, item.physicalQty);
      await inventoryRepo.createStockMovement({
        type: "adjustment",
        productId: item.productId,
        productName: item.productName,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        qtyBefore: currentQty,
        qtyChange: actualDiff,
        qtyAfter: item.physicalQty,
        referenceNumber: `${prefix}-${opnameId.slice(0, 8)}`,
        note: item.note || `Penyesuaian dari opname ${input.date}`,
      });
    }

    // Step 5: Return updated batches for store sync
    const updatedBatches = await inventoryRepo.getBatches();
    console.log("[ENGINE-TRACE-4] All items processed. Returning success. opnameId:", opnameId);
    return { success: true, opnameId, updatedBatches };
  } catch (err: any) {
    console.error("[ENGINE-TRACE-ERR] CAUGHT in engine:", err?.message, err);
    return { success: false, error: err?.message ?? "Gagal memposting opname." };
  }
}
