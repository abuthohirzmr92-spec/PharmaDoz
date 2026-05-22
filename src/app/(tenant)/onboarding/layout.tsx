"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import type { OnboardingStep } from "@/types";
import { cn } from "@/lib/cn";

const STEPS: { key: OnboardingStep; label: string; description: string }[] = [
  { key: "welcome", label: "Selamat Datang", description: "Pengenalan MEDISYNC" },
  { key: "profile_setup", label: "Profil Apotek", description: "Informasi apotek" },
  { key: "branch_setup", label: "Cabang", description: "Verifikasi cabang utama" },
  { key: "product_setup", label: "Produk Awal", description: "Tambah produk awal" },
  { key: "team_invite", label: "Tim", description: "Undang staf apotek" },
  { key: "done", label: "Selesai", description: "Mulai operasi" },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { state, isLoading, load } = useOnboardingStore();

  useEffect(() => {
    if (user?.tenantId) {
      load(user.tenantId);
    }
  }, [user?.tenantId, load]);

  // Redirect to dashboard if onboarding is complete
  useEffect(() => {
    if (state?.isCompleted) {
      router.replace("/dashboard");
    }
  }, [state?.isCompleted, router]);

  // Only tenant_owner can access onboarding
  useEffect(() => {
    if (user && user.role !== "tenant_owner") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Map pathname to current step index
  const currentStepKey = pathname.split("/").pop() as OnboardingStep | undefined;
  const currentIndex = STEPS.findIndex((s) => s.key === currentStepKey);

  if (isLoading || !state) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (state.isCompleted) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Progress indicator */}
      <nav aria-label="Onboarding progress">
        <ol className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const isCompleted = state.stepsCompleted.some(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (s: any) => s.step === step.key,
            );
            const isCurrent = step.key === currentStepKey;
            const isPast = i < currentIndex;

            return (
              <li key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      isCompleted || isPast
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-brand-600 text-white ring-4 ring-brand-100"
                          : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800",
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 hidden text-[10px] font-medium sm:block",
                      isCurrent
                        ? "text-brand-700 dark:text-brand-300"
                        : "text-neutral-400",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 w-8 sm:w-12",
                      isPast ? "bg-green-500" : "bg-neutral-200 dark:bg-neutral-700",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <main>{children}</main>
    </div>
  );
}
