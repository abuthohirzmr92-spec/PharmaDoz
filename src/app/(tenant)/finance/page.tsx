"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { CardSkeleton } from "@/components/shared/card-skeleton";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { useWalletStore } from "@/store/wallet-store";
import { useAuthStore } from "@/store/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Plus, ArrowRightLeft } from "lucide-react";

// Lazy-loaded widgets
const FinanceSummaryCards = dynamic(
  () => import("@/components/finance/finance-summary-cards").then((m) => m.FinanceSummaryCards),
  {
    loading: () => (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    ),
  },
);

const CashflowChart = dynamic(
  () => import("@/components/finance/cashflow-chart").then((m) => m.CashflowChart),
  {
    loading: () => <CardSkeleton className="h-[300px]" />,
  },
);

const TransactionList = dynamic(
  () => import("@/components/finance/transaction-list").then((m) => m.TransactionList),
  {
    loading: () => <TableSkeleton rows={5} />,
  },
);

const WalletBalanceCard = dynamic(
  () => import("@/components/finance/wallet-balance-card").then((m) => m.WalletBalanceCard),
  {
    loading: () => <CardSkeleton />,
  },
);

export default function FinanceDashboardPage() {
  const { user } = useAuthStore();
  const {
    wallets,
    transactions,
    transfers,
    loadWallets,
    loadTransactions,
    loadTransfers,
    isLoading,
    error,
  } = useWalletStore();

  useEffect(() => {
    loadWallets();
    loadTransactions(undefined, { limit: 10 });
    loadTransfers();
  }, [loadWallets, loadTransactions, loadTransfers]);

  const canManage = user ? hasPermission(user.role, "finance.wallet.manage") : false;
  const canTransfer = user ? hasPermission(user.role, "finance.wallet.transfer") : false;

  const walletNames: Record<string, string> = {};
  for (const w of wallets) {
    walletNames[w.id] = w.name;
  }

  const recentTransfers = transfers.slice(0, 5);

  return (
    <Container>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              Keuangan
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Manajemen dompet keuangan, cashflow, dan transfer
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canTransfer && wallets.length >= 2 && (
              <Link
                href="/finance/wallets/transfer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Transfer
              </Link>
            )}
            {canManage && (
              <Link
                href="/finance/wallets/create"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Wallet Baru
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Summary Cards */}
        <WidgetErrorBoundary title="Ringkasan Keuangan">
          <FinanceSummaryCards />
        </WidgetErrorBoundary>

        {/* Wallet Balance Cards */}
        <WidgetErrorBoundary title="Saldo Wallet">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Saldo Wallet
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : wallets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
                <p className="text-sm text-neutral-500 mb-3">
                  Belum ada wallet. Buat wallet pertama Anda.
                </p>
                {canManage && (
                  <Link
                    href="/finance/wallets/create"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Buat Wallet
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {wallets
                  .filter((w) => !w.isArchived)
                  .map((wallet) => (
                    <WidgetErrorBoundary key={wallet.id} title={`Wallet ${wallet.name}`}>
                      <WalletBalanceCard wallet={wallet} />
                    </WidgetErrorBoundary>
                  ))}
              </div>
            )}
          </div>
        </WidgetErrorBoundary>

        {/* Cashflow Chart + Recent Transfers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <WidgetErrorBoundary title="Arus Kas">
              <CashflowChart />
            </WidgetErrorBoundary>
          </div>
          <div className="lg:col-span-2">
            <WidgetErrorBoundary title="Transfer Terakhir">
              <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Transfer Terakhir
                  </h3>
                  {canTransfer && (
                    <Link
                      href="/finance/wallets/transfer"
                      className="text-xs text-brand-600 hover:text-brand-700"
                    >
                      Transfer Baru
                    </Link>
                  )}
                </div>
                {recentTransfers.length === 0 ? (
                  <p className="text-sm text-neutral-400 py-6 text-center">
                    Belum ada transfer
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentTransfers.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg border border-neutral-100 p-3 text-xs dark:border-neutral-800"
                      >
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-50">
                            {walletNames[t.fromWalletId] ?? "?"} → {walletNames[t.toWalletId] ?? "?"}
                          </p>
                          <p className="text-neutral-400">
                            {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                              new Date(t.createdAt),
                            )}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            t.status === "completed"
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                              : t.status === "pending"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                          }`}
                        >
                          {t.status === "completed" ? "Selesai" : t.status === "pending" ? "Pending" : "Ditolak"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </WidgetErrorBoundary>
          </div>
        </div>

        {/* Recent Transactions */}
        <WidgetErrorBoundary title="Transaksi Terakhir">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Transaksi Terakhir
              </h2>
              <Link
                href="/finance/transactions"
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                Lihat Semua
              </Link>
            </div>
            <TransactionList
              transactions={transactions.slice(0, 10)}
              isLoading={isLoading}
              showWallet
              walletNames={walletNames}
            />
          </div>
        </WidgetErrorBoundary>
      </div>
    </Container>
  );
}
