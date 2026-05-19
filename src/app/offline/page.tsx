import { WifiOff } from "lucide-react";

export default function Offline() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <WifiOff className="mx-auto h-16 w-16 text-neutral-400" />
        <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Anda Sedang Offline
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Silakan periksa koneksi internet Anda dan coba lagi.
        </p>
      </div>
    </div>
  );
}
