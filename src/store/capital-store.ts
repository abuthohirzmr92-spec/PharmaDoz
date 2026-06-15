"use client";

import { create } from "zustand";
import type { CapitalTransaction } from "@/types";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { capitalRepo } from "@/lib/repository-instances";
import { useAuthStore } from "@/store/auth-store";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface CapitalState {
  transactions: CapitalTransaction[];
  balance: number;
  isLoading: boolean;
  error: string | null;

  loadTransactions(): Promise<void>;
  loadBalance(): Promise<void>;
  deposit(data: {
    amount: number;
    walletId?: string | null;
    branchId?: string | null;
    description?: string | null;
  }): Promise<CapitalTransaction | null>;
  withdraw(data: {
    amount: number;
    walletId?: string | null;
    branchId?: string | null;
    description?: string | null;
  }): Promise<CapitalTransaction | null>;
  clear(): void;
}

/* ------------------------------------------------------------------ */
/*  Demo seed data                                                     */
/* ------------------------------------------------------------------ */

const DEMO_TRANSACTIONS: CapitalTransaction[] = [
  {
    id: "capital-demo-001",
    tenantId: "pharm-001",
    branchId: null,
    walletId: "demo-wallet-bca-001",
    type: "deposit",
    amount: 50_000_000,
    description: "Modal awal usaha",
    transactionDate: "2026-01-15T08:00:00Z",
    actorId: "demo-tenant_owner",
    createdAt: "2026-01-15T08:00:00Z",
  },
  {
    id: "capital-demo-002",
    tenantId: "pharm-001",
    branchId: null,
    walletId: "demo-wallet-kas-001",
    type: "deposit",
    amount: 10_000_000,
    description: "Tambahan modal kas operasional",
    transactionDate: "2026-03-01T10:00:00Z",
    actorId: "demo-tenant_owner",
    createdAt: "2026-03-01T10:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  Store                                                               */
/* ------------------------------------------------------------------ */

export const useCapitalStore = create<CapitalState>((set, get) => ({
  transactions: [],
  balance: 0,
  isLoading: false,
  error: null,

  loadTransactions: async () => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      set({ transactions: DEMO_TRANSACTIONS, balance: 60_000_000, isLoading: false });
      return;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) { set({ transactions: [], isLoading: false }); return; }

      capitalRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const [txns, bal] = await Promise.all([
        capitalRepo.getCapitalTransactions(),
        capitalRepo.getCapitalBalance(),
      ]);

      set({ transactions: txns, balance: bal, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal memuat modal", isLoading: false });
    }
  },

  loadBalance: async () => {
    const isDemo = checkDemoMode() || !isSupabaseConnected();
    if (isDemo) { set({ balance: 60_000_000 }); return; }

    try {
      const user = useAuthStore.getState().user;
      if (!user) return;
      capitalRepo.setTenantContext({ tenantId: user.tenantId ?? "", role: user.role, userId: user.id });
      const bal = await capitalRepo.getCapitalBalance();
      set({ balance: bal });
    } catch { /* silently fail */ }
  },

  deposit: async (data) => {
    console.log("[CAPITAL_STORE_START]", { amount: data.amount, walletId: data.walletId, branchId: data.branchId });
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      console.log("[CAPITAL_STORE_DEMO] Demo mode active, skipping DB");
      const newTx: CapitalTransaction = {
        id: `capital-demo-${Date.now()}`,
        tenantId: "pharm-001",
        branchId: data.branchId ?? null,
        walletId: data.walletId ?? null,
        type: "deposit",
        amount: data.amount,
        description: data.description ?? null,
        transactionDate: new Date().toISOString(),
        actorId: "demo-tenant_owner",
        createdAt: new Date().toISOString(),
      };
      set((s) => ({
        transactions: [newTx, ...s.transactions],
        balance: s.balance + data.amount,
        isLoading: false,
      }));
      return newTx;
    }

    try {
      const user = useAuthStore.getState().user;
      console.log("[CAPITAL_STORE_USER]", { exists: !!user, tenantId: user?.tenantId, role: user?.role });
      if (!user) throw new Error("Tidak terautentikasi");

      capitalRepo.setTenantContext({ tenantId: user.tenantId ?? "", role: user.role, userId: user.id });
      console.log("[CAPITAL_STORE_CALLING_REPO]");
      const tx = await capitalRepo.depositCapital(data);
      console.log("[CAPITAL_STORE_REPO_SUCCESS]", { txId: tx?.id });
      await get().loadTransactions();
      console.log("[CAPITAL_LOAD_TX_SUCCESS]");
      set({ isLoading: false });
      return tx;
    } catch (err) {
      console.log("[CAPITAL_STORE_CATCH]", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3).join(" | ") : undefined,
      });
      set({ error: err instanceof Error ? err.message : "Gagal setor modal", isLoading: false });
      return null;
    }
  },

  withdraw: async (data) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      if (get().balance < data.amount) {
        set({ error: "Modal tidak mencukupi.", isLoading: false });
        return null;
      }
      const newTx: CapitalTransaction = {
        id: `capital-demo-${Date.now()}`,
        tenantId: "pharm-001",
        branchId: data.branchId ?? null,
        walletId: data.walletId ?? null,
        type: "withdrawal",
        amount: data.amount,
        description: data.description ?? null,
        transactionDate: new Date().toISOString(),
        actorId: "demo-tenant_owner",
        createdAt: new Date().toISOString(),
      };
      set((s) => ({
        transactions: [newTx, ...s.transactions],
        balance: s.balance - data.amount,
        isLoading: false,
      }));
      return newTx;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Tidak terautentikasi");

      capitalRepo.setTenantContext({ tenantId: user.tenantId ?? "", role: user.role, userId: user.id });
      const tx = await capitalRepo.withdrawCapital(data);
      await get().loadTransactions();
      set({ isLoading: false });
      return tx;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal tarik modal", isLoading: false });
      return null;
    }
  },

  clear: () => set({ transactions: [], balance: 0, isLoading: false, error: null }),
}));
