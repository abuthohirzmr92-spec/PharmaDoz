import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-danger" />
        <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Akses Ditolak
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
