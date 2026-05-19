"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-4 max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
          <AlertTriangle className="h-8 w-8 text-danger" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Terjadi Kesalahan
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Maaf, sesuatu tidak berfungsi. Silakan coba lagi.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
