"use client";

import { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { CardSkeleton } from "@/components/shared/card-skeleton";
import { useWalletStore } from "@/store/wallet-store";
import { useAuthStore } from "@/store/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Plus, ArrowRightLeft } from "lucide-react";

const WalletBalanceCard = dynamic(
  () => import("@/components/finance/wallet-balance-card").then((m) => m.WalletBalanceCard),
  { loading: () => <CardSkeleton /> },
);

export default function WalletsPage() {
  const { user } = useAuthStore();
  const { wallets, loadWallets, isLoading, error } = useWalletStore();

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const canManage = user ? hasPermission(user.role, "finance.wallet.manage") : false;
  const canTransfer = user ? hasPermission(user.role, "finance.wallet.transfer") : false;

  const activeWallets = wallets.filter((w) => !w.isArchived);
  const archivedWallets = wallets.filter((w) => w.isArchived);

  return (
    <Container>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              Wallet
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Kelola dompet keuangan Anda
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canTransfer && activeWallets.length >= 2 && (
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

      {/* Active wallets */}
      <WidgetErrorBoundary title="Wallet Aktif">
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Wallet Aktif ({activeWallets.length})
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : activeWallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
              <p className="text-sm text-neutral-500 mb-3">Belum ada wallet.</p>
              {canManage && (
                <Link
                  href="/finance/wallets/create"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Buat Wallet Pertama
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeWallets.map((wallet) => (
                <WalletBalanceCard key={wallet.id} wallet={wallet} />
              ))}
            </div>
          )}
        </div>
      </WidgetErrorBoundary>

      {/* Archived wallets */}
      {archivedWallets.length > 0 && (
        <WidgetErrorBoundary title="Wallet Diarsipkan">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              Diarsipkan ({archivedWallets.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
              {archivedWallets.map((wallet) => (
                <WalletBalanceCard key={wallet.id} wallet={wallet} />
              ))}
            </div>
          </div>
        </WidgetErrorBoundary>
      )}
    </Container>
  );
}
