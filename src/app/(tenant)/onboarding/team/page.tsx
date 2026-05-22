"use client";

import { useRouter } from "next/navigation";
import { Users, ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";

const ROLE_PREVIEW = [
  { role: "admin", label: "Admin", description: "Kelola pengguna, produk, dan laporan" },
  { role: "pharmacist", label: "Apoteker", description: "Verifikasi resep, kelola stok obat" },
  { role: "cashier", label: "Kasir", description: "Proses transaksi penjualan" },
  { role: "staff", label: "Staf", description: "Bantu operasional harian apotek" },
];

export default function TeamStep() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const { advance } = useOnboardingStore();

  const handleNext = async () => {
    if (!tenantId) return;
    const ok = await advance(tenantId, "team_invite");
    if (ok) router.push("/onboarding/done");
  };

  const handleSkip = async () => {
    if (!tenantId) return;
    const ok = await advance(tenantId, "team_invite");
    if (ok) router.push("/onboarding/done");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Undang Tim</h2>
        <p className="text-sm text-neutral-500">
          Undang apoteker, kasir, dan staf ke apotek Anda. Anda bisa melakukannya nanti dari menu Users.
        </p>
      </div>

      {/* Role preview */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-neutral-500">Peran yang tersedia:</p>
        {ROLE_PREVIEW.map((r) => (
          <div
            key={r.role}
            className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{r.label}</p>
              <p className="text-xs text-neutral-500">{r.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-950/20 dark:text-brand-300">
        Setelah onboarding selesai, Anda bisa mengundang anggota tim dari menu &quot;Users&quot; di sidebar.
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/onboarding/products")}
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
