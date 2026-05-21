"use client";

import type { ReactNode } from "react";
import { Store } from "lucide-react";
import { useBranchContext } from "@/providers/branch-provider";

interface BranchGuardProps {
  children: ReactNode;
}

export function BranchGuard({ children }: BranchGuardProps) {
  const { branches, activeBranch, isLoading } = useBranchContext();

  // Still loading — show a minimal skeleton
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-neutral-400">Memuat cabang...</p>
        </div>
      </div>
    );
  }

  // No branches available at all
  if (branches.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
          <div className="rounded-full bg-neutral-100 p-4 dark:bg-neutral-800">
            <Store className="h-8 w-8 text-neutral-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
              Tidak Ada Cabang Tersedia
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Belum ada cabang yang terdaftar untuk akun ini. Silakan hubungi Super Admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Branches exist but none selected — prompt user to choose
  if (!activeBranch) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
          <div className="rounded-full bg-amber-50 p-4 dark:bg-amber-900/20">
            <Store className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
              Pilih Cabang
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Silakan pilih cabang terlebih dahulu untuk mulai menggunakan aplikasi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active branch is set — render children
  return <>{children}</>;
}
