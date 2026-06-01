"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { TransferForm } from "@/components/finance/transfer-form";
import { useWalletStore } from "@/store/wallet-store";
import { useAuthStore } from "@/store/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { ChevronLeft } from "lucide-react";

export default function TransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFromId = searchParams.get("from") ?? undefined;

  const { user } = useAuthStore();
  const { wallets, loadWallets, transferBetweenWallets, isLoading } = useWalletStore();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const canTransfer = user ? hasPermission(user.role, "finance.wallet.transfer") : false;

  if (!canTransfer) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-neutral-500">
            Anda tidak memiliki izin untuk transfer antar wallet.
          </p>
        </div>
      </Container>
    );
  }

  const activeWallets = wallets.filter((w) => !w.isArchived && w.isActive);

  const handleSubmit = async (
    fromId: string,
    toId: string,
    amount: number,
    options?: { fee?: number; notes?: string },
  ) => {
    setError("");
    setSuccess("");

    const result = await transferBetweenWallets(fromId, toId, amount, options);

    if (result) {
      const fromWallet = wallets.find((w) => w.id === fromId);
      const toWallet = wallets.find((w) => w.id === toId);
      setSuccess(
        `Berhasil transfer Rp ${amount.toLocaleString("id-ID")} dari ${fromWallet?.name ?? "?"} ke ${toWallet?.name ?? "?"}.`,
      );

      // Navigate back after brief delay
      setTimeout(() => {
        router.push("/finance");
      }, 2000);
    }
  };

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
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Transfer Antar Wallet
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Pindahkan dana antara dompet keuangan
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="max-w-lg">
        <WidgetErrorBoundary title="Form Transfer">
          {activeWallets.length < 2 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
              <p className="text-sm text-neutral-500">
                Minimal butuh 2 wallet aktif untuk transfer.
              </p>
            </div>
          ) : (
            <TransferForm
              wallets={wallets}
              preselectedFromId={preselectedFromId}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </WidgetErrorBoundary>
      </div>
    </Container>
  );
}
