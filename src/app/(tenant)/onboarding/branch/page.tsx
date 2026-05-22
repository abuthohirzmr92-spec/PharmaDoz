"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, CheckCircle2, ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useBranchStore } from "@/store/branch-store";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function BranchStep() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const { branches, isLoading, loadBranches } = useBranchStore();
  const { advance } = useOnboardingStore();

  useEffect(() => {
    if (tenantId) {
      loadBranches(tenantId);
    }
  }, [tenantId, loadBranches]);

  const mainBranch = branches.find((b) => b.isMain);
  const otherBranches = branches.filter((b) => !b.isMain);

  const handleNext = async () => {
    if (!tenantId) return;
    const ok = await advance(tenantId, "branch_setup");
    if (ok) router.push("/onboarding/products");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Verifikasi Cabang</h2>
        <p className="text-sm text-neutral-500">
          Cabang utama telah dibuat otomatis. Anda bisa menambah cabang lain nanti.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Main branch */}
          {mainBranch && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    {mainBranch.name}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Cabang Utama — Kode: {mainBranch.code}
                  </p>
                  {mainBranch.address && (
                    <p className="mt-1 text-xs text-neutral-500">{mainBranch.address}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Other branches */}
          {otherBranches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {branch.name}
                  </p>
                  <p className="text-xs text-neutral-500">Kode: {branch.code}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Placeholder for future branch creation */}
          {!mainBranch && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center dark:border-neutral-700 dark:bg-neutral-800/50">
              <Building2 className="mx-auto h-8 w-8 text-neutral-400" />
              <p className="mt-2 text-sm text-neutral-500">Belum ada cabang terdaftar.</p>
              <p className="text-xs text-neutral-400">Hubungi Super Admin untuk membuat cabang.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/onboarding/profile")}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!mainBranch}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition disabled:opacity-50"
        >
          Lanjut
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
