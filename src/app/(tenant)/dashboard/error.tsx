"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <div className="rounded-xl border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20 max-w-md w-full">
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              Dashboard tidak tersedia
            </p>
            <p className="mt-1 text-xs text-red-400 dark:text-red-500">
              Terjadi kesalahan saat memuat dashboard. Silakan coba lagi.
            </p>
          </div>
          <button
            onClick={reset}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
