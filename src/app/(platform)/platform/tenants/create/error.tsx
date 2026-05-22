"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function CreateTenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertTriangle className="mb-4 h-10 w-10 text-red-500" />
      <h2 className="text-lg font-semibold">Gagal Memuat Halaman</h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        {error.message || "Terjadi kesalahan saat memuat halaman provisioning."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <RotateCcw className="h-4 w-4" />
        Coba Lagi
      </button>
    </div>
  );
}
