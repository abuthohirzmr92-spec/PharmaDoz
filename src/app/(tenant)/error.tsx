"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

function safeId(): string {
  try {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  } catch {
    return "UNKNOWN";
  }
}

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showStack, setShowStack] = useState(false);
  const [errorId] = useState(safeId);

  useEffect(() => {
    console.error(
      "[TENANT-ROUTE-CRASH]",
      JSON.stringify({
        name: error?.name ?? "Unknown",
        message: error?.message ?? "No message",
        digest: (error as any)?.digest ?? null,
        stackTop: error?.stack?.split("\n").slice(0, 6).join("\n") ?? null,
        timestamp: new Date().toISOString(),
      }),
    );
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white shadow-sm dark:border-red-800 dark:bg-neutral-900">
        <div className="border-b border-red-100 px-5 py-4 dark:border-red-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
                Halaman Tidak Dapat Dimuat
              </h2>
              <p className="mt-0.5 text-xs text-red-500 dark:text-red-400/80">
                Terjadi kesalahan saat memuat halaman ini.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
            <p className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300">
              {error?.name ?? "Error"}: {error?.message ?? "Unknown error"}
            </p>
            <p className="mt-1 text-[10px] text-neutral-400">
              ID: {errorId} · Digest: {(error as any)?.digest ?? "N/A"}
            </p>

            <button
              onClick={() => setShowStack(!showStack)}
              className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              {showStack ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Detail Teknis
            </button>

            {showStack && error?.stack && (
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-neutral-100 p-2 text-[10px] text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 whitespace-pre-wrap break-all">
                {error.stack}
              </pre>
            )}
          </div>
          <p className="mt-3 text-[10px] text-neutral-400">
            Buka konsol browser (F12) untuk detail teknis lengkap.
          </p>
        </div>

        <div className="flex items-center gap-3 border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    </div>
  );
}
