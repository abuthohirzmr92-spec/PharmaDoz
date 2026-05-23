"use client";

import { useEffect, useState } from "react";

function safeId(): string {
  try {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  } catch {
    return "UNKNOWN";
  }
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorId] = useState(safeId);

  useEffect(() => {
    console.error(
      "[GLOBAL-CRASH]",
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
    <html lang="id">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        <div className="flex min-h-screen items-center justify-center font-[system-ui,sans-serif]">
          <div className="mx-4 max-w-md text-center">
            <h1 className="text-2xl font-bold text-neutral-900">
              Terjadi Kesalahan Sistem
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {error?.message ?? "Silakan muat ulang halaman."}
            </p>
            <p className="mt-4 text-xs text-neutral-400">
              ID: {errorId}{" "}
              {(error as any)?.digest ? `· Digest: ${(error as any).digest}` : ""}
            </p>
            <p className="mt-2 text-[10px] text-neutral-400">
              Buka konsol browser (F12) untuk detail teknis lengkap.
            </p>
            <button
              onClick={() => reset()}
              className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
