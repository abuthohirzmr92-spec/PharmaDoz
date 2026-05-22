"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { isDemoMode } from "@/config/env";

const STEP_TO_ROUTE: Record<string, string> = {
  welcome: "welcome",
  profile_setup: "profile",
  branch_setup: "branch",
  product_setup: "products",
  team_invite: "team",
  done: "done",
};

export function OnboardingBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { state, isLoading, load } = useOnboardingStore();
  const isDemo = isDemoMode();

  const tenantId = user?.tenantId;
  const isOwner = user?.role === "tenant_owner";

  useEffect(() => {
    if (tenantId && isOwner && !isDemo) {
      load(tenantId);
    }
  }, [tenantId, isOwner, isDemo, load]);

  // Jangan tampilkan apa pun di demo mode, bukan owner, atau jika loading/complete
  if (isDemo || !isOwner || !tenantId) return null;
  if (isLoading) return null;
  if (!state || state.isCompleted) return null;

  // Redirect dari dashboard ke onboarding
  if (pathname === "/dashboard") {
    return (
      <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-800 dark:bg-brand-950/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
              Selesaikan Pengaturan Awal
            </p>
            <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-400">
              Anda perlu menyelesaikan onboarding sebelum mulai operasi. Langkah saat ini:{" "}
              <span className="font-medium">{state.currentStep}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/onboarding/${STEP_TO_ROUTE[state.currentStep] ?? state.currentStep}`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition shrink-0"
          >
            Lanjutkan
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Di halaman onboarding — jangan tampilkan banner
  if (pathname.startsWith("/onboarding")) return null;

  // Di halaman lain — banner informasi (tanpa redirect paksa)
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-800 dark:bg-amber-950/20">
      <p className="text-xs text-amber-700 dark:text-amber-300">
        Pengaturan awal tenant belum selesai.{" "}
        <button
          type="button"
          onClick={() => router.push(`/onboarding/${STEP_TO_ROUTE[state.currentStep] ?? state.currentStep}`)}
          className="underline hover:text-amber-800 dark:hover:text-amber-200"
        >
          Lanjutkan onboarding
        </button>
      </p>
    </div>
  );
}
