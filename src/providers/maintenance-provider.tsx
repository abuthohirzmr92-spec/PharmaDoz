"use client";

import { Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMaintenanceStore } from "@/store/maintenance-store";
import { MaintenanceBanner } from "@/components/shared/maintenance-banner";

/* ------------------------------------------------------------------ */
/*  MaintenanceProvider                                                */
/* ------------------------------------------------------------------ */

export function MaintenanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = useMaintenanceStore((s) => s.config);
  const isActive = useMaintenanceStore((s) => s.isActive);
  const isReadonly = useMaintenanceStore((s) => s.isReadonly);

  // No maintenance active — render children as-is
  if (!isActive) {
    return <>{children}</>;
  }

  // Readonly mode: show compact banner + children (viewing allowed)
  if (isReadonly) {
    return (
      <>
        <MaintenanceBanner
          message={config.message}
          mode="readonly"
          scheduledEndAt={config.scheduledEndAt}
        />
        {children}
      </>
    );
  }

  // Full maintenance: block all access with full-page overlay
  if (config.mode === "full") {
    return (
      <>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
        <div
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4",
            "bg-white dark:bg-neutral-950",
            "animate-[fadeIn_0.4s_ease-in-out]",
          )}
        >
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              "bg-red-50 dark:bg-red-950/60",
            )}
          >
            <Wrench
              className="h-8 w-8 text-red-600 dark:text-red-400"
              aria-hidden
            />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Pemeliharaan Sistem
          </h1>
          <p className="max-w-md text-center text-sm text-neutral-600 dark:text-neutral-400">
            {config.message ||
              "Sistem sedang dalam pemeliharaan. Transaksi baru sementara ditutup."}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Sistem akan kembali normal setelah pemeliharaan selesai.
          </p>
        </div>
      </>
    );
  }

  // Scheduled mode (not yet active): render children normally
  return <>{children}</>;
}
