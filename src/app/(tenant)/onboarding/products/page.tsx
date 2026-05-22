"use client";

import { useRouter } from "next/navigation";
import { Package, ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function ProductsStep() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const { advance } = useOnboardingStore();

  const handleNext = async () => {
    if (!tenantId) return;
    const ok = await advance(tenantId, "product_setup");
    if (ok) router.push("/onboarding/team");
  };

  const handleSkip = async () => {
    if (!tenantId) return;
    const ok = await advance(tenantId, "product_setup");
    if (ok) router.push("/onboarding/team");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Produk Awal</h2>
        <p className="text-sm text-neutral-500">
          Tambahkan produk awal ke inventaris Anda. Anda bisa menambahkannya kapan saja nanti.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900">
        <Package className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600" />
        <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Fitur tambah produk akan tersedia di menu Produk
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Anda bisa langsung masuk ke Dashboard dan mulai menambah produk dari menu Products.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/onboarding/branch")}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <SkipForward className="h-4 w-4" />
            Lewati
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            Lanjut
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
