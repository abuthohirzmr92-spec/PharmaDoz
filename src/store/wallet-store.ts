"use client";

import { create } from "zustand";
import type {
  FinancialWallet,
  WalletTransaction,
  WalletTransfer,
  WalletCategory,
  WalletType,
  WalletTransferStatus,
} from "@/types";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { walletRepo } from "@/lib/repository-instances";
import { useAuthStore } from "@/store/auth-store";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface WalletState {
  wallets: FinancialWallet[];
  transactions: WalletTransaction[];
  transfers: WalletTransfer[];
  categories: WalletCategory[];
  isLoading: boolean;
  error: string | null;
  selectedWalletId: string | null;

  // Wallet CRUD
  loadWallets(branchId?: string): Promise<void>;
  loadWalletById(id: string): Promise<FinancialWallet | null>;
  createWallet(data: {
    name: string;
    type: WalletType;
    branchId?: string | null;
    currency?: string;
    allowOverdraft?: boolean;
    overdraftLimit?: number;
  }): Promise<FinancialWallet | null>;
  updateWallet(id: string, data: {
    name?: string;
    type?: WalletType;
    branchId?: string | null;
    isActive?: boolean;
    allowOverdraft?: boolean;
    overdraftLimit?: number;
  }): Promise<void>;
  archiveWallet(id: string): Promise<boolean>;

  // Transactions
  loadTransactions(walletId?: string, filters?: {
    type?: "credit" | "debit";
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    branchId?: string;
  }): Promise<void>;
  recordTransaction(walletId: string, data: {
    type: "credit" | "debit";
    amount: number;
    sourceType: "sale" | "purchase" | "expense" | "transfer_in" | "transfer_out" | "adjustment";
    sourceId?: string;
    description?: string;
  }): Promise<WalletTransaction | null>;

  // Transfers
  loadTransfers(filters?: { walletId?: string; status?: WalletTransferStatus }): Promise<void>;
  transferBetweenWallets(fromId: string, toId: string, amount: number, options?: {
    fee?: number;
    notes?: string;
  }): Promise<WalletTransfer | null>;

  // Categories
  loadCategories(): Promise<void>;

  // Computed helpers
  getTotalBalance(): number;
  getInflowSummary(days: number): number;
  getOutflowSummary(days: number): number;
  getWalletBalances(): Record<string, number>;

  // Lifecycle
  clear(): void;
  setSelectedWallet(id: string | null): void;
}

/* ------------------------------------------------------------------ */
/*  Demo seed data                                                     */
/* ------------------------------------------------------------------ */

const DEMO_WALLET_ID_1 = "demo-wallet-kas-001";
const DEMO_WALLET_ID_2 = "demo-wallet-bca-001";
const DEMO_WALLET_ID_3 = "demo-wallet-gopay-001";

const DEMO_WALLETS: FinancialWallet[] = [
  {
    id: DEMO_WALLET_ID_1,
    tenantId: "pharm-001",
    name: "Kas Utama",
    type: "cash",
    branchId: null,
    currency: "IDR",
    isActive: true,
    isArchived: false,
    allowOverdraft: false,
    overdraftLimit: 0,
    balance: 0,
    settings: {},
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-06-01T09:00:00Z",
  },
  {
    id: DEMO_WALLET_ID_2,
    tenantId: "pharm-001",
    name: "BCA Operasional",
    type: "bank",
    branchId: null,
    currency: "IDR",
    isActive: true,
    isArchived: false,
    allowOverdraft: false,
    overdraftLimit: 0,
    balance: 0,
    settings: { accountNumber: "1234567890" },
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-06-01T09:00:00Z",
  },
  {
    id: DEMO_WALLET_ID_3,
    tenantId: "pharm-001",
    name: "GoPay Bisnis",
    type: "digital",
    branchId: null,
    currency: "IDR",
    isActive: true,
    isArchived: false,
    allowOverdraft: false,
    overdraftLimit: 0,
    balance: 0,
    settings: { phoneNumber: "08123456789" },
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-05-15T14:00:00Z",
  },
];

function generateDemoTransactions(): WalletTransaction[] {
  const txs: WalletTransaction[] = [];
  const now = new Date();

  // Generate 60 days of demo transactions
  for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    // 1-3 sales per day → kredit to Kas or BCA
    const saleCount = 1 + Math.floor((daysAgo * 7) % 3);
    for (let i = 0; i < saleCount; i++) {
      const isCash = (daysAgo + i) % 3 !== 0;
      const walletId = isCash ? DEMO_WALLET_ID_1 : DEMO_WALLET_ID_2;
      const amount = 50000 + Math.floor(((daysAgo * 137 + i * 271) % 500) * 1000);
      txs.push({
        id: `demo-tx-sale-${daysAgo}-${i}`,
        walletId,
        type: "credit",
        amount,
        runningBalance: 0,
        sourceType: "sale",
        sourceId: `demo-sale-${daysAgo}-${i}`,
        description: `Penjualan harian`,
        branchId: null,
        transactionDate: date.toISOString(),
        accountCode: null,
        isReconciled: false,
        reconciledAt: null,
        createdAt: date.toISOString(),
      });
    }

    // Every 3 days: supplier payment → debit from BCA
    if (daysAgo % 3 === 0) {
      txs.push({
        id: `demo-tx-purchase-${daysAgo}`,
        walletId: DEMO_WALLET_ID_2,
        type: "debit",
        amount: 200000 + Math.floor(((daysAgo * 311) % 800) * 1000),
        runningBalance: 0,
        sourceType: "purchase",
        sourceId: `demo-purchase-${daysAgo}`,
        description: `Pembayaran supplier`,
        branchId: null,
        transactionDate: date.toISOString(),
        accountCode: null,
        isReconciled: false,
        reconciledAt: null,
        createdAt: date.toISOString(),
      });
    }

    // Every 7 days: expense → debit from Kas
    if (daysAgo % 7 === 0) {
      txs.push({
        id: `demo-tx-expense-${daysAgo}`,
        walletId: DEMO_WALLET_ID_1,
        type: "debit",
        amount: 100000 + Math.floor(((daysAgo * 97) % 300) * 1000),
        runningBalance: 0,
        sourceType: "expense",
        sourceId: null,
        description: daysAgo % 14 === 0 ? "Gaji karyawan mingguan" : "Biaya operasional",
        branchId: null,
        transactionDate: date.toISOString(),
        accountCode: null,
        isReconciled: false,
        reconciledAt: null,
        createdAt: date.toISOString(),
      });
    }
  }

  // Sort by date descending
  txs.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  // Compute running balances per wallet
  const balances: Record<string, number> = {};
  const reversed = [...txs].reverse();
  for (const tx of reversed) {
    const current = balances[tx.walletId] ?? 0;
    if (tx.type === "credit") {
      const newBal = current + tx.amount;
      balances[tx.walletId] = newBal;
      tx.runningBalance = newBal;
    } else {
      const newBal = current - tx.amount;
      balances[tx.walletId] = newBal;
      tx.runningBalance = newBal;
    }
  }

  return txs;
}

const DEMO_TRANSACTIONS = generateDemoTransactions();

const DEMO_TRANSFERS: WalletTransfer[] = [
  {
    id: "demo-transfer-001",
    fromWalletId: DEMO_WALLET_ID_2,
    toWalletId: DEMO_WALLET_ID_1,
    amount: 5000000,
    fee: 0,
    status: "completed",
    notes: "Transfer bulanan ke kas operasional",
    completedAt: "2026-05-28T10:00:00Z",
    createdAt: "2026-05-28T09:55:00Z",
    updatedAt: "2026-05-28T10:00:00Z",
  },
  {
    id: "demo-transfer-002",
    fromWalletId: DEMO_WALLET_ID_2,
    toWalletId: DEMO_WALLET_ID_3,
    amount: 1000000,
    fee: 0,
    status: "completed",
    notes: "Isi saldo GoPay",
    completedAt: "2026-05-25T14:00:00Z",
    createdAt: "2026-05-25T13:55:00Z",
    updatedAt: "2026-05-25T14:00:00Z",
  },
];

const DEMO_CATEGORIES: WalletCategory[] = [
  { id: "cat-1", tenantId: null, name: "Penjualan Tunai", type: "income", icon: "Banknote", color: "#16a34a", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-2", tenantId: null, name: "Penjualan Non-Tunai", type: "income", icon: "CreditCard", color: "#2563eb", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-3", tenantId: null, name: "Pendapatan Lain", type: "income", icon: "PlusCircle", color: "#7c3aed", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-4", tenantId: null, name: "Transfer Masuk", type: "income", icon: "ArrowDownCircle", color: "#0891b2", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-5", tenantId: null, name: "Pembelian Stok", type: "expense", icon: "Package", color: "#dc2626", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-6", tenantId: null, name: "Gaji Karyawan", type: "expense", icon: "Users", color: "#ea580c", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-7", tenantId: null, name: "Operasional", type: "expense", icon: "Wrench", color: "#eab308", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-8", tenantId: null, name: "Utang Supplier", type: "expense", icon: "Landmark", color: "#be123c", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-9", tenantId: null, name: "Transfer Keluar", type: "expense", icon: "ArrowUpCircle", color: "#4f46e5", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
  { id: "cat-10", tenantId: null, name: "Lainnya", type: "expense", icon: "Ellipsis", color: "#6b7280", isSystem: true, createdAt: "2026-01-01T00:00:00Z" },
];

/* ------------------------------------------------------------------ */
/*  Store                                                               */
/* ------------------------------------------------------------------ */

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  transactions: [],
  transfers: [],
  categories: [],
  isLoading: false,
  error: null,
  selectedWalletId: null,

  // ====== WALLETS ======

  loadWallets: async (branchId) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      const balances = get().getWalletBalances();
      const walletsWithBalance = DEMO_WALLETS.map((w) => ({
        ...w,
        balance: balances[w.id] || 0,
      }));
      set({ wallets: walletsWithBalance, isLoading: false });
      return;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ wallets: [], isLoading: false });
        return;
      }

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const wallets = await walletRepo.getWallets({ branchId });

      // Load balances for each wallet
      const walletsWithBalance = await Promise.all(
        wallets.map(async (w) => ({
          ...w,
          balance: await walletRepo.getWalletBalance(w.id),
        })),
      );

      set({ wallets: walletsWithBalance, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal memuat wallet", isLoading: false });
    }
  },

  loadWalletById: async (id: string) => {
    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      const demoWallet = DEMO_WALLETS.find((w) => w.id === id);
      if (!demoWallet) return null;
      const balances = get().getWalletBalances();
      return { ...demoWallet, balance: balances[demoWallet.id] || 0 };
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) return null;

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const wallet = await walletRepo.getWalletById(id);
      if (!wallet) return null;

      const balance = await walletRepo.getWalletBalance(id);
      return { ...wallet, balance };
    } catch {
      return null;
    }
  },

  createWallet: async (data) => {
    set({ isLoading: true, error: null });

    // Auto-set branchId from active branch if not explicitly provided
    if (!data.branchId) {
      const { useBranchStore } = await import("@/store/branch-store");
      data.branchId = useBranchStore.getState().activeBranch?.id ?? null;
    }

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      const newWallet: FinancialWallet = {
        id: `demo-wallet-${Date.now()}`,
        tenantId: "pharm-001",
        name: data.name,
        type: data.type,
        branchId: data.branchId ?? null,
        currency: data.currency ?? "IDR",
        isActive: true,
        isArchived: false,
        allowOverdraft: data.allowOverdraft ?? false,
        overdraftLimit: data.overdraftLimit ?? 0,
        balance: 0,
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((s) => ({ wallets: [...s.wallets, newWallet], isLoading: false }));
      return newWallet;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Tidak terautentikasi");

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const wallet = await walletRepo.createWallet(data);
      await get().loadWallets();
      set({ isLoading: false });
      return wallet;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal membuat wallet", isLoading: false });
      return null;
    }
  },

  updateWallet: async (id, data) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      set((s) => ({
        wallets: s.wallets.map((w) => (w.id === id ? { ...w, ...data } : w)),
        isLoading: false,
      }));
      return;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Tidak terautentikasi");

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      await walletRepo.updateWallet(id, data);
      await get().loadWallets();
      set({ isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal update wallet", isLoading: false });
    }
  },

  archiveWallet: async (id) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      set((s) => ({
        wallets: s.wallets.map((w) => (w.id === id ? { ...w, isArchived: true } : w)),
        isLoading: false,
      }));
      return true;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Tidak terautentikasi");

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      await walletRepo.archiveWallet(id);
      await get().loadWallets();
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal arsipkan wallet", isLoading: false });
      return false;
    }
  },

  // ====== TRANSACTIONS ======

  loadTransactions: async (walletId, filters) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      let filtered = [...DEMO_TRANSACTIONS];
      if (walletId) filtered = filtered.filter((t) => t.walletId === walletId);
      if (filters?.type) filtered = filtered.filter((t) => t.type === filters.type);
      if (filters?.dateFrom) filtered = filtered.filter((t) => new Date(t.transactionDate) >= new Date(filters.dateFrom!));
      if (filters?.dateTo) filtered = filtered.filter((t) => new Date(t.transactionDate) <= new Date(filters.dateTo!));

      set({ transactions: filtered, isLoading: false });
      return;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ transactions: [], isLoading: false });
        return;
      }

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const result = await walletRepo.getWalletTransactions({
        walletId,
        type: filters?.type,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 50,
        branchId: filters?.branchId,
      });

      set({ transactions: result.data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal memuat transaksi", isLoading: false });
    }
  },

  recordTransaction: async (walletId, data) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      const newTx: WalletTransaction = {
        id: `demo-tx-${Date.now()}`,
        walletId,
        type: data.type,
        amount: data.amount,
        runningBalance: 0,
        sourceType: data.sourceType,
        sourceId: data.sourceId ?? null,
        description: data.description ?? null,
        branchId: null,
        transactionDate: new Date().toISOString(),
        accountCode: null,
        isReconciled: false,
        reconciledAt: null,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ transactions: [newTx, ...s.transactions], isLoading: false }));
      await get().loadWallets(); // Refresh balances
      return newTx;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Tidak terautentikasi");

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const tx = await walletRepo.recordTransaction(walletId, {
        type: data.type,
        amount: data.amount,
        sourceType: data.sourceType,
        sourceId: data.sourceId ?? null,
        description: data.description ?? null,
      });

      await get().loadWallets(); // Refresh balances
      await get().loadTransactions(walletId);

      set({ isLoading: false });
      return tx;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal mencatat transaksi", isLoading: false });
      return null;
    }
  },

  // ====== TRANSFERS ======

  loadTransfers: async (filters) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      let filtered = [...DEMO_TRANSFERS];
      if (filters?.walletId) {
        filtered = filtered.filter(
          (t) => t.fromWalletId === filters.walletId || t.toWalletId === filters.walletId,
        );
      }
      if (filters?.status) filtered = filtered.filter((t) => t.status === filters.status);

      set({ transfers: filtered, isLoading: false });
      return;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ transfers: [], isLoading: false });
        return;
      }

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const transfers = await walletRepo.getTransfers({
        walletId: filters?.walletId,
        status: filters?.status,
      });

      set({ transfers, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal memuat transfer", isLoading: false });
    }
  },

  transferBetweenWallets: async (fromId, toId, amount, options) => {
    set({ isLoading: true, error: null });

    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      // Validate balance in demo
      const balances = get().getWalletBalances();
      const fromWallet = DEMO_WALLETS.find((w) => w.id === fromId);
      if (!fromWallet) {
        set({ error: "Wallet sumber tidak ditemukan", isLoading: false });
        return null;
      }
      const currentBalance = balances[fromId] || 0;
      if (currentBalance < amount + (options?.fee ?? 0)) {
        set({ error: "Saldo tidak mencukupi", isLoading: false });
        return null;
      }

      const newTransfer: WalletTransfer = {
        id: `demo-transfer-${Date.now()}`,
        fromWalletId: fromId,
        toWalletId: toId,
        amount,
        fee: options?.fee ?? 0,
        status: "completed",
        notes: options?.notes ?? null,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set((s) => ({ transfers: [newTransfer, ...s.transfers], isLoading: false }));
      await get().loadWallets(); // Refresh balances
      return newTransfer;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Tidak terautentikasi");

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const transfer = await walletRepo.transferBetweenWallets(fromId, toId, amount, options);

      await get().loadWallets();
      await get().loadTransfers();
      await get().loadTransactions();

      set({ isLoading: false });
      return transfer;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Gagal transfer", isLoading: false });
      return null;
    }
  },

  // ====== CATEGORIES ======

  loadCategories: async () => {
    const isDemo = checkDemoMode() || !isSupabaseConnected();

    if (isDemo) {
      set({ categories: DEMO_CATEGORIES });
      return;
    }

    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ categories: DEMO_CATEGORIES });
        return;
      }

      walletRepo.setTenantContext({
        tenantId: user.tenantId ?? "",
        role: user.role,
        userId: user.id,
      });

      const categories = await walletRepo.getCategories();
      set({ categories });
    } catch {
      set({ categories: DEMO_CATEGORIES });
    }
  },

  // ====== COMPUTED ======

  getTotalBalance: () => {
    const { wallets } = get();
    return wallets
      .filter((w) => !w.isArchived && w.isActive)
      .reduce((sum, w) => sum + (w.balance || 0), 0);
  },

  getInflowSummary: (days: number) => {
    const { transactions } = get();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return transactions
      .filter((t) => t.type === "credit" && new Date(t.transactionDate) >= cutoff)
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getOutflowSummary: (days: number) => {
    const { transactions } = get();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return transactions
      .filter((t) => t.type === "debit" && new Date(t.transactionDate) >= cutoff)
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getWalletBalances: () => {
    const { wallets, transactions } = get();
    const balances: Record<string, number> = {};

    // Initialize all wallets with 0
    for (const w of wallets) {
      balances[w.id] = 0;
    }

    // Add all transactions
    for (const tx of transactions) {
      const current = balances[tx.walletId] ?? 0;
      balances[tx.walletId] = tx.type === "credit" ? current + tx.amount : current - tx.amount;
    }

    return balances;
  },

  // ====== LIFECYCLE ======

  clear: () => {
    set({
      wallets: [],
      transactions: [],
      transfers: [],
      categories: [],
      isLoading: false,
      error: null,
      selectedWalletId: null,
    });
  },

  setSelectedWallet: (id) => set({ selectedWalletId: id }),
}));
