"use client";

import { create } from "zustand";
import type { StockTransfer, CreateTransferInput, TransferStatus } from "@/types/stock-transfer";
import { StockTransferRepository } from "@/lib/repositories/stock-transfer";

const transferRepo = new StockTransferRepository();

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface StockTransferState {
  transfers: StockTransfer[];
  isLoading: boolean;
  error: string | null;

  loadTransfers: (filters?: { status?: TransferStatus }) => Promise<void>;
  createTransfer: (data: CreateTransferInput) => Promise<StockTransfer>;
  approveTransfer: (id: string) => Promise<void>;
  rejectTransfer: (id: string, note?: string) => Promise<void>;
  markInTransit: (id: string) => Promise<void>;
  receiveTransfer: (id: string) => Promise<void>;
  clear: () => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useStockTransferStore = create<StockTransferState>()((set, get) => ({
  transfers: [],
  isLoading: false,
  error: null,

  loadTransfers: async (filters) => {
    const state = get();
    if (state.isLoading) return;

    // Skip if no tenant context
    if (transferRepo.isConnected && !transferRepo.getTenantId()) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const result = await transferRepo.getTransfers(filters ?? {});
      set({ transfers: result, isLoading: false });
    } catch (e) {
      console.error("Failed to load transfers:", e);
      set({
        error: e instanceof Error ? e.message : "Gagal memuat daftar transfer",
        isLoading: false,
      });
    }
  },

  createTransfer: async (data) => {
    set({ error: null });

    try {
      const result = await transferRepo.createTransfer(data);

      // Reload list
      const transfers = await transferRepo.getTransfers();
      set({ transfers });

      return result;
    } catch (e) {
      console.error("Failed to create transfer:", e);
      const msg = e instanceof Error ? e.message : "Gagal membuat transfer";
      set({ error: msg });
      throw e;
    }
  },

  approveTransfer: async (id) => {
    set({ error: null });

    try {
      const approvedBy = transferRepo.getTenantUserId() ?? "system";
      const result = await transferRepo.approveTransfer(id, approvedBy);

      if (!result) {
        set({ error: "Transfer tidak ditemukan atau sudah diproses" });
        return;
      }

      // Update list
      const transfers = get().transfers.map((t) =>
        t.id === id ? { ...t, status: "approved" as TransferStatus } : t,
      );
      set({ transfers });
    } catch (e) {
      console.error("Failed to approve transfer:", e);
      const msg = e instanceof Error ? e.message : "Gagal menyetujui transfer";
      set({ error: msg });
    }
  },

  rejectTransfer: async (id, note) => {
    set({ error: null });

    try {
      const result = await transferRepo.rejectTransfer(id, note);

      if (!result) {
        set({ error: "Transfer tidak ditemukan atau sudah diproses" });
        return;
      }

      // Update list
      const transfers = get().transfers.map((t) =>
        t.id === id
          ? { ...t, status: "rejected" as TransferStatus, note: note ?? t.note }
          : t,
      );
      set({ transfers });
    } catch (e) {
      console.error("Failed to reject transfer:", e);
      const msg = e instanceof Error ? e.message : "Gagal menolak transfer";
      set({ error: msg });
    }
  },

  markInTransit: async (id) => {
    set({ error: null });

    try {
      const result = await transferRepo.markInTransit(id);

      if (!result) {
        set({ error: "Transfer tidak ditemukan atau sudah diproses" });
        return;
      }

      // Update list
      const transfers = get().transfers.map((t) =>
        t.id === id ? { ...t, status: "in_transit" as TransferStatus } : t,
      );
      set({ transfers });
    } catch (e) {
      console.error("Failed to mark transfer in transit:", e);
      const msg = e instanceof Error ? e.message : "Gagal mengubah status ke in_transit";
      set({ error: msg });
    }
  },

  receiveTransfer: async (id) => {
    set({ error: null });

    try {
      const result = await transferRepo.receiveTransfer(id);

      if (!result) {
        set({ error: "Transfer tidak ditemukan atau sudah diproses" });
        return;
      }

      // Update list
      const transfers = get().transfers.map((t) =>
        t.id === id ? { ...t, status: "received" as TransferStatus } : t,
      );
      set({ transfers });
    } catch (e) {
      console.error("Failed to receive transfer:", e);
      const msg = e instanceof Error ? e.message : "Gagal menerima transfer";
      set({ error: msg });
    }
  },

  clear: () => {
    set({
      transfers: [],
      isLoading: false,
      error: null,
    });
  },
}));
