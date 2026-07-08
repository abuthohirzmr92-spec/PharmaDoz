/* ------------------------------------------------------------------ */
/*  Demo Sale Allocations — mirrors production sale_batch_allocations */
/* ------------------------------------------------------------------ */

export interface DemoSaleAllocation {
  transactionId: string;
  transactionItemId: string;
  batchId: string;
  batchNumber: string;
  expiredDate: string | null;
  quantity: number;
  costPrice: number;
}

/**
 * Generate demo sale allocations from demo transactions + batches.
 *
 * Matches demo-001 through demo-010 products to their respective batches
 * from DEMO_BATCHES. Each allocation records the batch cost price at
 * the time of sale — exactly as production sale_batch_allocations does.
 *
 * Uses seeded pseudo-random for deterministic output across reloads.
 */
export function generateDemoSaleAllocations(
  transactions: { id: string; items: { productId: string; quantity: number; id?: string }[] }[],
): DemoSaleAllocation[] {
  const allocations: DemoSaleAllocation[] = [];

  // Per-product batch cost data (from DEMO_BATCHES — active batches only)
  const batchMap: Record<string, { batchId: string; batchNumber: string; expiredDate: string; costPrice: number }> = {
    "demo-001": { batchId: "bat-001b", batchNumber: "PAR-2026-001", expiredDate: "2027-12-31", costPrice: 8000 },
    "demo-002": { batchId: "bat-002b", batchNumber: "AMX-2026-001", expiredDate: "2027-06-30", costPrice: 15000 },
    "demo-003": { batchId: "bat-003a", batchNumber: "VTC-2026-001", expiredDate: "2027-09-30", costPrice: 20000 },
    "demo-004": { batchId: "bat-004b", batchNumber: "ANT-2026-001", expiredDate: "2026-08-31", costPrice: 6000 },
    "demo-005": { batchId: "bat-005a", batchNumber: "IBU-2026-001", expiredDate: "2027-03-31", costPrice: 10000 },
    "demo-006": { batchId: "bat-006b", batchNumber: "CET-2026-001", expiredDate: "2027-11-30", costPrice: 12000 },
    "demo-007": { batchId: "bat-007b", batchNumber: "OME-2026-001", expiredDate: "2027-01-31", costPrice: 16000 },
    "demo-008": { batchId: "bat-008b", batchNumber: "SAL-2026-001", expiredDate: "2026-07-31", costPrice: 35000 },
    "demo-009": { batchId: "bat-009a", batchNumber: "MLT-2026-001", expiredDate: "2027-08-31", costPrice: 25000 },
    "demo-010": { batchId: "bat-010b", batchNumber: "MKP-2026-001", expiredDate: "2028-06-30", costPrice: 11000 },
  };

  let seq = 0;
  for (const txn of transactions) {
    for (const item of txn.items) {
      const batch = batchMap[item.productId];
      if (!batch) continue;

      seq++;
      allocations.push({
        transactionId: txn.id,
        transactionItemId: item.id ?? `${txn.id}-item-${seq}`,
        batchId: batch.batchId,
        batchNumber: batch.batchNumber,
        expiredDate: batch.expiredDate,
        quantity: item.quantity,
        costPrice: batch.costPrice,
      });
    }
  }

  return allocations;
}
