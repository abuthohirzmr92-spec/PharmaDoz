"use client";

import { useState } from "react";

export default function GlobalError({
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

  return (
    <html lang="id">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        <div className="flex min-h-screen items-center justify-center font-[system-ui,sans-serif]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900">
              Terjadi Kesalahan Sistem
            </h1>
            {error.digest ? (
              <p className="mt-2 text-sm text-neutral-400">
                Kode: {error.digest}
              </p>
            ) : (
              <p className="mt-2 text-neutral-500">
                Silakan muat ulang halaman.
              </p>
            )}
            <p className="mt-4 text-xs text-neutral-400">
              {errorCode} &middot; {errorTimestamp}
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
