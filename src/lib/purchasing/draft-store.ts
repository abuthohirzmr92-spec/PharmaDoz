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
  replaceItems: (draftId: string, items: PurchaseDraftItem[]) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return crypto.randomUUID();
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
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === draft.id ? { ...draft, updatedAt: new Date().toISOString() } : d,
      ),
    }));
  },

  deleteDraft: (id) =>
    set((s) => ({
      drafts: s.drafts.filter((d) => d.id !== id),
      activeDraftId: s.activeDraftId === id ? null : s.activeDraftId,
    })),

  archiveDraft: (id) => {
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === id
          ? { ...d, status: "cancelled" as const, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));
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

  replaceItems: (draftId, items) => {
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === draftId ? { ...d, items, updatedAt: new Date().toISOString() } : d,
      ),
    }));
  },
}));
