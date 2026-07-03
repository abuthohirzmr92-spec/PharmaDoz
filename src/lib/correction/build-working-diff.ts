// =================================================================
// build-working-diff.ts V3.2.1 — ADAPTER STAGE 1 (GENERIC)
// 🔒 ARCHITECTURE LOCKED
//
// PURE FUNCTION CONTRACT:
//   ✅ Input → Process → Output
//   ❌ NO toast    ❌ NO hook      ❌ NO store
//   ❌ NO repository  ❌ NO network   ❌ NO engine
//   ❌ NO mutation   ❌ NO setState   ❌ NO side effects
//
// Architecture:
//   Working Copy → Generic Diff → Correction Detail → Store → Engine
//
// Reusable: Purchase | Sales | Stock Adjustment | Transfer
// =================================================================

import type { WorkingDiff } from "@/components/inventory/invoice-revision/types";
import type { WorkingPurchaseItem } from "@/components/inventory/invoice-revision/types";

/**
 * Compare original items with working copy and produce a generic diff.
 * PURE FUNCTION — no side effects, no store, no network.
 *
 * @param workingItems — Working copy items with _state and _original
 * @returns WorkingDiff with changed, added, and removed items
 */
export function buildWorkingDiff(
  workingItems: WorkingPurchaseItem[],
): WorkingDiff {
  const changed: WorkingDiff["changed"] = [];
  const added: WorkingPurchaseItem[] = [];
  const removed: string[] = [];

  // TODO Sprint 4: implement diff logic
  // For each item:
  //   _state === "MODIFIED" → compare with _original, collect FieldChange[]
  //   _state === "NEW" → add to added[]
  //   _state === "DELETED" → add to removed[]

  for (const item of workingItems) {
    switch (item._state) {
      case "NEW":
        added.push(item);
        break;
      case "DELETED":
        if (item.originalItemId) removed.push(item.originalItemId);
        break;
      case "MODIFIED":
        if (item._original) {
          // TODO: field-by-field comparison
        }
        break;
    }
  }

  return { changed, added, removed };
}
