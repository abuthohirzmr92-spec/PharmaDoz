"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { CardSkeleton } from "@/components/shared/card-skeleton";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { useCapitalStore } from "@/store/capital-store";
import { useWalletStore } from "@/store/wallet-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useAuthStore } from "@/store/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { CapitalModal } from "@/components/finance/capital-modal";
import { formatRupiah } from "@/lib/finance/profit-engine";
import { Wallet, TrendingUp, Plus, Minus } from "lucide-react";

// Lazy-loaded components
const ProfitSummaryCards = dynamic(
  () => import("@/components/finance/profit-summary-cards").then((m) => m.ProfitSummaryCards),
  { loading: () => <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div> },
);

const BranchProfitRanking = dynamic(
  () => import("@/components/finance/branch-profit-ranking").then((m) => m.BranchProfitRanking),
  { loading: () => <TableSkeleton rows={5} /> },
);

const CapitalHistory = dynamic(
  () => import("@/components/finance/capital-history").then((m) => m.CapitalHistory),
  { loading: () => <CardSkeleton className="h-[200px]" /> },
);

export default function InsightPage() {
  const { user } = useAuthStore();
  const { balance: capitalBalance, transactions: capitalTxns, loadTransactions: loadCapital, deposit, withdraw, isLoading } = useCapitalStore();
  const { wallets, loadWallets } = useWalletStore();
  const loadInventory = useInventoryStore((s) => (s as any).loadBatches);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"deposit" | "withdrawal">("deposit");

  useEffect(() => {
    loadCapital();
    loadWallets();
    loadInventory?.();
  }, []);

  const canManage = user ? hasPermission(user.role, "finance.wallet.manage") : false;

  const walletNames: Record<string, string> = {};
  for (const w of wallets) walletNames[w.id] = w.name;

  const handleCapitalSubmit = async (data: { type: "deposit" | "withdrawal"; amount: number; walletId: string; description: string }) => {
    if (data.type === "deposit") {
      const ok = await deposit({ amount: data.amount, walletId: data.walletId, description: data.description || null });
      if (ok) setModalOpen(false);
    } else {
      const ok = await withdraw({ amount: data.amount, walletId: data.walletId, description: data.description || null });
      if (ok) setModalOpen(false);
    }
  };

  return (
    <Container>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Insight Bisnis</h1>
            <p className="mt-1 text-sm text-neutral-500">Modal, profit, dan performa bisnis Anda</p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setModalType("withdrawal"); setModalOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950 transition-colors">
                <Minus className="h-4 w-4" />Tarik Modal
              </button>
              <button onClick={() => { setModalType("deposit"); setModalOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors">
                <Plus className="h-4 w-4" />Setor Modal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Capital Card */}
      <WidgetErrorBoundary title="Modal Usaha">
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Total Modal Disetor</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{formatRupiah(capitalBalance)}</p>
              {capitalTxns.length > 0 && (
                <p className="text-xs text-neutral-400 mt-0.5">{capitalTxns.length} transaksi modal tercatat</p>
              )}
            </div>
          </div>
        </div>
      </WidgetErrorBoundary>

      {/* Profit Summary */}
      <WidgetErrorBoundary title="Profit Summary">
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Performa Bisnis</h2>
          <ProfitSummaryCards capitalBalance={capitalBalance} />
        </div>
      </WidgetErrorBoundary>

      {/* Branch Profit + Capital History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 mb-6">
        <div className="lg:col-span-3">
          <WidgetErrorBoundary title="Profit Cabang">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Profit per Cabang</h2>
              <BranchProfitRanking />
            </div>
          </WidgetErrorBoundary>
        </div>
        <div className="lg:col-span-2">
          <WidgetErrorBoundary title="Riwayat Modal">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Riwayat Modal</h2>
              <CapitalHistory transactions={capitalTxns} walletNames={walletNames} />
            </div>
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* Capital Modal */}
      <CapitalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCapitalSubmit}
        wallets={wallets}
        capitalBalance={capitalBalance}
        isLoading={isLoading}
      />
    </Container>
  );
}
