"use client";

import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function WelcomeStep() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { advance } = useOnboardingStore();
  const tenantId = user?.tenantId;

  const handleStart = async () => {
    if (!tenantId) return;
    const ok = await advance(tenantId, "welcome");
    if (ok) router.push("/onboarding/profile");
  };

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        <Building2 className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Selamat Datang di MEDISYNC
        </h1>
        <p className="text-sm text-neutral-500">
          Apotek Anda telah berhasil dibuat. Mari selesaikan pengaturan awal
          agar apotek Anda siap beroperasi.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left dark:border-neutral-800 dark:bg-neutral-800/50">
        <p className="mb-3 text-xs font-medium text-neutral-500">Yang akan Anda lakukan:</p>
        <ul className="space-y-2">
          {[
            "Lengkapi profil dan informasi apotek",
            "Verifikasi cabang utama",
            "Tambah produk awal (opsional)",
            "Undang tim farmasi Anda (opsional)",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={handleStart}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition"
      >
        Mulai Pengaturan
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
