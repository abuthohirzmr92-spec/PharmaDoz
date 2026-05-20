"use client";

import { create } from "zustand";
import type { Transaction } from "@/types/transaction";
import { generateDemoTransactions } from "@/lib/demo-transactions";
import { isInRange } from "@/lib/date-utils";
import type { DateRange } from "@/types/report";
import { transactionRepo } from "@/lib/repository-instances";

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface TransactionState {
  transactions: Transaction[];

  /* UI */
  isLoaded: boolean;
  isLoading: boolean;
  isDemoMode: boolean;

  /* Actions */
  loadDemoTransactions: () => Promise<void>;
  addTransaction: (tx: Transaction) => void;
  addTransactions: (txs: Transaction[]) => void;

  /* Queries */
  getTransactionsByRange: (range: DateRange) => Transaction[];
  getTodayTransactions: () => Transaction[];
  getTodaySalesTotal: () => number;
  getTodayTransactionCount: () => number;
  getSalesTrend: (days: number) => { date: string; label: string; total: number; count: number }[];
  getTopProducts: (limit?: number) => { productId: string; productName: string; qtySold: number; revenue: number }[];
  getTransactionsByPaymentMethod: (method: string) => Transaction[];
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useTransactionStore = create<TransactionState>()((set, get) => ({
  transactions: [],
  isLoaded: false,
  isLoading: false,
  isDemoMode: true,

  loadDemoTransactions: async () => {
    if (get().isLoaded) return;

    if (transactionRepo.isConnected) {
      set({ isLoading: true });
      try {
        const { data } = await transactionRepo.getTransactions({ pageSize: 1000 });
        set({
          transactions: data,
          isLoaded: true,
          isDemoMode: false,
          isLoading: false,
        });
      } catch (e) {
        console.error('Failed to load transactions from DB, falling back to demo:', e);
        set({
          transactions: generateDemoTransactions(90),
          isLoaded: true,
          isDemoMode: true,
          isLoading: false,
        });
      }
    } else {
      set({
        transactions: generateDemoTransactions(90),
        isLoaded: true,
        isDemoMode: true,
        isLoading: false,
      });
    }
  },

  getTransactionsByRange: (range) => {
    return get().transactions.filter((t) => isInRange(t.createdAt, range));
  },

  getTodayTransactions: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return get().transactions.filter((t) => {
      const d = new Date(t.createdAt);
      return d >= today && d < tomorrow;
    });
  },

  getTodaySalesTotal: () => {
    return get().getTodayTransactions().reduce((sum, t) => sum + t.total, 0);
  },

  getTodayTransactionCount: () => {
    return get().getTodayTransactions().length;
  },

  getSalesTrend: (days) => {
    const transactions = get().transactions;
    const now = new Date();
    const result: { date: string; label: string; total: number; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      const dayTxns = transactions.filter((t) => {
        const td = new Date(t.createdAt);
        return td >= d && td < next;
      });

      result.push({
        date: dateStr,
        label,
        total: dayTxns.reduce((s, t) => s + t.total, 0),
        count: dayTxns.length,
      });
    }

    return result;
  },

  getTopProducts: (limit = 5) => {
    const map = new Map<string, { productId: string; productName: string; qtySold: number; revenue: number }>();

    for (const txn of get().transactions) {
      for (const item of txn.items) {
        const existing = map.get(item.productId);
        if (existing) {
          existing.qtySold += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          map.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            qtySold: item.quantity,
            revenue: item.subtotal,
          });
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  addTransaction: (tx) => {
    set({ transactions: [tx, ...get().transactions], isLoaded: true });
  },

  addTransactions: (txs) => {
    set({ transactions: [...txs, ...get().transactions], isLoaded: true });
  },

  getTransactionsByPaymentMethod: (method) => {
    return get().transactions.filter((t) =>
      t.payments.some((p) => p.method === method),
    );
  },
}));
