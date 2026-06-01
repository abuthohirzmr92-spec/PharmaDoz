"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { useWalletStore } from "@/store/wallet-store";
import { useAuthStore } from "@/store/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { Banknote, Landmark, Smartphone, ChevronLeft, Archive, ArrowRightLeft, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FinancialWallet } from "@/types";

const TransactionList = dynamic(
  () => import("@/components/finance/transaction-list").then((m) => m.TransactionList),
  { loading: () => <TableSkeleton rows={10} /> },
);

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const typeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  cash: { icon: Banknote, label: "Kas" },
  bank: { icon: Landmark, label: "Bank" },
  digital: { icon: Smartphone, label: "Digital" },
};

export default function WalletDetailPage() {
  const params = useParams();
  const router = useRouter();
  const walletId = params.id as string;

  const { user } = useAuthStore();
  const {
    transactions,
    loadTransactions,
    loadWalletById,
    archiveWallet,
    isLoading,
    error,
  } = useWalletStore();

  const [wallet, setWallet] = useState<FinancialWallet | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (walletId) {
      loadWalletById(walletId).then(setWallet);
      loadTransactions(walletId, { limit: 50 });
    }
  }, [walletId, loadWalletById, loadTransactions]);

  const canManage = user ? hasPermission(user.role, "finance.wallet.manage") : false;
  const canTransfer = user ? hasPermission(user.role, "finance.wallet.transfer") : false;

  const handleArchive = async () => {
    if (!window.confirm(`Arsipkan wallet "${wallet?.name}"?\n\nWallet hanya dapat diarsipkan jika saldo Rp 0.`)) {
      return;
    }
    setArchiving(true);
    const success = await archiveWallet(walletId);
    setArchiving(false);
    if (success) {
      router.push("/finance/wallets");
    }
  };

  if (!wallet && !isLoading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-neutral-500">Wallet tidak ditemukan.</p>
          <Link href="/finance/wallets" className="mt-3 text-sm text-brand-600 hover:text-brand-700">
            Kembali ke daftar wallet
          </Link>
        </div>
      </Container>
    );
  }

  const config = typeConfig[wallet?.type ?? "cash"]!;
  const TypeIcon = config.icon;

  return (
    <Container>
      <div className="mb-6">
        <Link
          href="/finance/wallets"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Wallet
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {wallet && (
        <>
          {/* Wallet Info Card */}
          <WidgetErrorBoundary title="Info Wallet">
            <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                    <TypeIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                      {wallet.name}
                    </h1>
                    <p className="text-sm text-neutral-500">
                      {config.label} {wallet.branchId ? "· Per Cabang" : "· Tenant Level"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canTransfer && (
                    <Link
                      href={`/finance/wallets/transfer?from=${wallet.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Transfer
                    </Link>
                  )}
                  {canManage && (
                    <button
                      onClick={handleArchive}
                      disabled={archiving || wallet.balance !== 0}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-red-900 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950 transition-colors"
                      title={wallet.balance !== 0 ? "Kosongkan saldo terlebih dahulu sebelum mengarsipkan" : "Arsipkan wallet"}
                    >
                      <Archive className="h-4 w-4" />
                      {archiving ? "Mengarsipkan..." : "Arsipkan"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-neutral-500">Saldo Saat Ini</p>
                  <p className={cn(
                    "mt-1 text-2xl font-bold",
                    wallet.balance >= 0 ? "text-neutral-900 dark:text-neutral-50" : "text-red-600",
                  )}>
                    {formatRupiah(wallet.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Tipe</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {config.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Mata Uang</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {wallet.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Overdraft</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {wallet.allowOverdraft
                      ? `Ya · Limit ${formatRupiah(wallet.overdraftLimit)}`
                      : "Tidak"}
                  </p>
                </div>
              </div>
            </div>
          </WidgetErrorBoundary>

          {/* Transactions */}
          <WidgetErrorBoundary title="Riwayat Transaksi">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Riwayat Transaksi
              </h2>
              <TransactionList
                transactions={transactions}
                isLoading={isLoading}
                emptyMessage="Belum ada transaksi di wallet ini."
              />
            </div>
          </WidgetErrorBoundary>
        </>
      )}
    </Container>
  );
}
