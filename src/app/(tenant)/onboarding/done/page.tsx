"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useState } from "react";

export default function DoneStep() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const { complete } = useOnboardingStore();
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!tenantId) return;
    setCompleting(true);
    setError(null);

    const ok = await complete(tenantId);
    if (ok) {
      router.replace("/dashboard");
    } else {
      setError("Gagal menyelesaikan onboarding. Coba lagi.");
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Pengaturan Selesai
        </h2>
        <p className="text-sm text-neutral-500">
          Apotek Anda sudah siap beroperasi. Anda bisa mengelola apotek dari Dashboard.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left dark:border-neutral-800 dark:bg-neutral-800/50">
        <p className="mb-2 text-xs font-medium text-neutral-500">Yang bisa Anda lakukan sekarang:</p>
        <ul className="space-y-1.5 text-sm text-neutral-700 dark:text-neutral-300">
          <li>• Tambah produk dari menu Products</li>
          <li>• Undang tim dari menu Users</li>
          <li>• Kelola inventaris dari menu Inventory</li>
          <li>• Proses transaksi dari menu Cashier</li>
          <li>• Lihat laporan dari menu Reports</li>
        </ul>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleComplete}
        disabled={completing}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-50"
      >
        {completing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Menyelesaikan...
          </>
        ) : (
          <>
            Mulai Operasi
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
