/**
 * P0.8E.1 — Draft Service (Orchestration Layer)
 *
 * Coordinates multiple engines for draft workflows.
 * Engines remain pure. Store remains dumb.
 * Service is the ONLY layer that calls both engines and store.
 */

import { usePurchaseDraftStore } from "../draft-store";
import { validateDraft, calculateDraftTotals } from "../draft-engine";
import { generateWarnings } from "../warning-engine";
import { detectDuplicates } from "../duplicate-engine";
import { mergeItems, suggestMerge } from "../merge-engine";
import type { PurchaseDraft } from "@/types/purchase-draft";

// ---------------------------------------------------------------------------
// Merge Duplicate Items
// ---------------------------------------------------------------------------

/**
 * Full merge flow for a draft:
 * 1. Detect duplicates
 * 2. Decide merge strategy
 * 3. Execute merge via engine
 * 4. Write result to store
 */
export function resolveDuplicates(draftId: string): {
  mergedCount: number;
  remainingDuplicates: number;
} {
  const store = usePurchaseDraftStore.getState();
  const draft = store.getDraft(draftId);
  if (!draft) return { mergedCount: 0, remainingDuplicates: 0 };

  const duplicates = detectDuplicates(draft.items);
  let mergedCount = 0;

  for (const group of duplicates) {
    const strategy = suggestMerge(group.items);

    if (strategy === "auto_merge") {
      const targetId = group.items[0]!.id;
      const sourceIds = group.items.slice(1).map((i) => i.id);

      const result = mergeItems(draft.items, targetId, sourceIds);
      if (result.mergedItem) {
        store.replaceItems(draftId, result.items);
        mergedCount++;
      }
    }
  }

  // Re-check after merges
  const updatedDraft = store.getDraft(draftId);
  const remaining = updatedDraft
    ? detectDuplicates(updatedDraft.items).length
    : 0;

  return { mergedCount, remainingDuplicates: remaining };
}

// ---------------------------------------------------------------------------
// Validate & Update Status
// ---------------------------------------------------------------------------

/**
 * Run full validation on a draft and update its status in the store.
 */
export function refreshDraftStatus(draftId: string): void {
  const store = usePurchaseDraftStore.getState();
  const draft = store.getDraft(draftId);
  if (!draft) return;

  const { status, errors } = validateDraft(draft);
  store.updateDraftStatus(draftId, status);

  // Store validation errors on items (update warnings)
  for (const error of errors) {
    if (error.itemId) {
      store.updateItem(draftId, error.itemId, {
        warnings: [...(draft.items.find((i) => i.id === error.itemId)?.warnings || []), error],
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Prepare Draft for Confirmation
// ---------------------------------------------------------------------------

/**
 * Run all pre-confirmation checks:
 * - Resolve auto-merge duplicates
 * - Recalculate totals
 * - Validate
 * Returns whether draft is ready to confirm.
 */
export function prepareForConfirmation(draftId: string): {
  ready: boolean;
  draft: PurchaseDraft | null;
  errors: string[];
} {
  const store = usePurchaseDraftStore.getState();

  // Resolve duplicates
  resolveDuplicates(draftId);

  // Recalculate totals
  const draft = store.getDraft(draftId);
  if (!draft) return { ready: false, draft: null, errors: ["Draft tidak ditemukan."] };

  const totals = calculateDraftTotals(draft);
  const updatedDraft: PurchaseDraft = {
    ...draft,
    ...totals,
  };
  store.saveDraft(updatedDraft);

  // Validate
  const { canConfirm, errors } = validateDraft(updatedDraft);
  const errorMessages: string[] = [];
  if (!canConfirm) {
    if (errors.length > 0) {
      const criticalErrors = errors.filter((e) => e.level === "critical");
      errorMessages.push(...criticalErrors.map((e) => e.message));
    }
    if (errorMessages.length === 0) {
      errorMessages.push("Draft belum siap untuk dikonfirmasi.");
    }
  }

  return { ready: canConfirm, draft: updatedDraft, errors: errorMessages };
}

// ---------------------------------------------------------------------------
// Generate Warnings for All Items
// ---------------------------------------------------------------------------

/**
 * Refresh warnings for every item in the draft using warning-engine.
 */
export function refreshAllWarnings(draftId: string): void {
  const store = usePurchaseDraftStore.getState();
  const draft = store.getDraft(draftId);
  if (!draft) return;

  for (const item of draft.items) {
    if (item.status === "merged" || item.status === "deleted") continue;

    const warnings = generateWarnings(item);
    store.updateItem(draftId, item.id, { warnings });
  }
}
