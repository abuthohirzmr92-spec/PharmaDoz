"use client";

import { create } from "zustand";
import type {
  PurchaseDraft,
  PurchaseDraftItem,
  DraftSource,
  DraftStatus,
} from "@/types/purchase-draft";

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface PurchaseDraftState {
  drafts: PurchaseDraft[];
  activeDraftId: string | null;

  /* Actions */
  createDraft: (source: DraftSource, tenantId: string, branchId?: string | null) => string;
  setActiveDraft: (id: string | null) => void;
  getDraft: (id: string) => PurchaseDraft | undefined;
  saveDraft: (draft: PurchaseDraft) => void;
  deleteDraft: (id: string) => void;
  archiveDraft: (id: string) => void;
  updateDraftStatus: (id: string, status: DraftStatus) => void;

  /* Item actions */
  addItem: (draftId: string, item: PurchaseDraftItem) => void;
  updateItem: (draftId: string, itemId: string, updates: Partial<PurchaseDraftItem>) => void;
  removeItem: (draftId: string, itemId: string) => void;
  mergeItems: (draftId: string, sourceIds: string[], targetId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function newDraft(source: DraftSource, tenantId: string, branchId?: string | null): PurchaseDraft {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    tenantId,
    branchId: branchId ?? null,
    sourceType: source,
    sourceReference: null,
    supplierId: null,
    supplierName: null,
    invoiceNumber: null,
    purchaseDate: now,
    dueDate: null,
    items: [],
    subtotal: 0,
    discountTotal: 0,
    grandTotal: 0,
    status: "draft",
    createdBy: null,
    createdAt: now,
    updatedAt: now,
  };
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const usePurchaseDraftStore = create<PurchaseDraftState>()((set, get) => ({
  drafts: [],
  activeDraftId: null,

  /* ---- Draft CRUD ---- */

  createDraft: (source, tenantId, branchId) => {
    const draft = newDraft(source, tenantId, branchId);
    set((s) => ({
      drafts: [...s.drafts, draft],
      activeDraftId: draft.id,
    }));
    return draft.id;
  },

  setActiveDraft: (id) => set({ activeDraftId: id }),

  getDraft: (id) => get().drafts.find((d) => d.id === id),

  saveDraft: (draft) => {
    draft.updatedAt = new Date().toISOString();
    set((s) => ({
      drafts: s.drafts.map((d) => (d.id === draft.id ? { ...draft } : d)),
    }));
  },

  deleteDraft: (id) =>
    set((s) => ({
      drafts: s.drafts.filter((d) => d.id !== id),
      activeDraftId: s.activeDraftId === id ? null : s.activeDraftId,
    })),

  archiveDraft: (id) => {
    const draft = get().drafts.find((d) => d.id === id);
    if (draft) {
      draft.status = "cancelled";
      draft.updatedAt = new Date().toISOString();
      set((s) => ({
        drafts: s.drafts.map((d) => (d.id === id ? { ...draft } : d)),
      }));
    }
  },

  updateDraftStatus: (id, status) => {
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === id ? { ...d, status, updatedAt: new Date().toISOString() } : d,
      ),
    }));
  },

  /* ---- Item actions ---- */

  addItem: (draftId, item) => {
    set((s) => ({
      drafts: s.drafts.map((d) => {
        if (d.id !== draftId) return d;
        return {
          ...d,
          items: [...d.items, item],
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  updateItem: (draftId, itemId, updates) => {
    set((s) => ({
      drafts: s.drafts.map((d) => {
        if (d.id !== draftId) return d;
        return {
          ...d,
          items: d.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item,
          ),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  removeItem: (draftId, itemId) => {
    set((s) => ({
      drafts: s.drafts.map((d) => {
        if (d.id !== draftId) return d;
        return {
          ...d,
          items: d.items.filter((item) => item.id !== itemId),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  mergeItems: (draftId, sourceIds, targetId) => {
    set((s) => ({
      drafts: s.drafts.map((d) => {
        if (d.id !== draftId) return d;
        const items = [...d.items];
        const target = items.find((i) => i.id === targetId);
        if (!target) return d;

        let mergedQty = target.quantity;
        for (const srcId of sourceIds) {
          const src = items.find((i) => i.id === srcId);
          if (src && src.id !== targetId) {
            mergedQty += src.quantity;
            // Mark source as merged
            const srcIdx = items.findIndex((i) => i.id === srcId);
            if (srcIdx >= 0) {
              items[srcIdx] = {
                ...items[srcIdx]!,
                status: "merged" as const,
              };
            }
          }
        }

        // Update target with merged quantity
        const targetIdx = items.findIndex((i) => i.id === targetId);
        if (targetIdx >= 0) {
          items[targetIdx] = {
            ...items[targetIdx]!,
            quantity: mergedQty,
            mergedFromIds: [...(items[targetIdx]!.mergedFromIds || []), ...sourceIds],
          };
        }

        return { ...d, items, updatedAt: new Date().toISOString() };
      }),
    }));
  },
}));
