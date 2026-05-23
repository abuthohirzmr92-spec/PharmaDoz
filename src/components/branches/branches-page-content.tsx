"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Plus,
  ChevronRight,
  Circle,
  Phone,
  MapPin,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useBranchStore } from "@/store/branch-store";
import { cn } from "@/lib/cn";

export function BranchesPageContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const {
    branches,
    activeBranch,
    isLoading,
    error,
    loadBranches,
    setActiveBranch,
  } = useBranchStore();

  useEffect(() => {
    if (tenantId) {
      loadBranches(tenantId);
    }
  }, [tenantId, loadBranches]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Cabang
            </h1>
            <p className="text-xs text-neutral-500">
              Kelola cabang apotek Anda
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/branches/create")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Store className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500">Belum ada cabang</p>
        </div>
      ) : (
        <div className="space-y-2">
          {branches.map((branch) => {
            const isActive = activeBranch?.id === branch.id;
            return (
              <div
                key={branch.id}
                className={cn(
                  "rounded-xl border bg-white transition-colors dark:bg-neutral-900",
                  isActive
                    ? "border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/20"
                    : "border-neutral-200 dark:border-neutral-700",
                )}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        {branch.name}
                      </p>
                      {branch.isMain && (
                        <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-950/30 dark:text-green-400">
                          Utama
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                      <span className="font-mono">{branch.code}</span>
                      {branch.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {branch.address}
                        </span>
                      )}
                      {branch.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {branch.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Circle
                      className={cn(
                        "h-2 w-2 fill-current",
                        branch.isActive
                          ? "text-green-500"
                          : "text-neutral-300 dark:text-neutral-600",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => router.push(`/branches/${branch.id}/edit`)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Edit
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
