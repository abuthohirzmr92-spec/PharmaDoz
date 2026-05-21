"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorTimestamp] = useState(() => new Date().toLocaleString("id-ID"));
  const [errorCode] = useState(
    () => `ERR-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
  );

  useEffect(() => {
    console.error("Tenant error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="mx-4 max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
          <AlertTriangle className="h-8 w-8 text-danger" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Terjadi Kesalahan
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Gagal memuat halaman ini. Silakan coba lagi atau kembali ke dashboard.
        </p>
        <p className="mt-4 text-xs text-neutral-400">
          {errorCode} &middot; {errorTimestamp}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
