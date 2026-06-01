"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { WalletForm, type WalletFormData } from "@/components/finance/wallet-form";
import { useWalletStore } from "@/store/wallet-store";
import { useBranchStore } from "@/store/branch-store";
import { useAuthStore } from "@/store/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CreateWalletPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createWallet, isLoading } = useWalletStore();
  const { branches } = useBranchStore();
  const [error, setError] = useState("");

  const canManage = user ? hasPermission(user.role, "finance.wallet.manage") : false;

  if (!canManage) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-neutral-500">
            Anda tidak memiliki izin untuk membuat wallet.
          </p>
        </div>
      </Container>
    );
  }

  const handleSubmit = async (data: WalletFormData) => {
    setError("");
    const result = await createWallet({
      name: data.name,
      type: data.type,
      branchId: data.branchId || null,
      currency: data.currency,
      allowOverdraft: data.allowOverdraft,
      overdraftLimit: data.overdraftLimit,
    });

    if (result) {
      router.push(`/finance/wallets/${result.id}`);
    } else {
      setError("Gagal membuat wallet. Silakan coba lagi.");
    }
  };

  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

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
          Buat Wallet Baru
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tambahkan dompet kas, rekening bank, atau dompet digital
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="max-w-lg">
        <WidgetErrorBoundary title="Form Wallet">
          <WalletForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            branches={branchOptions}
          />
        </WidgetErrorBoundary>
      </div>
    </Container>
  );
}
