"use client";

import { useRouter } from "next/navigation";
import { Smartphone, ArrowLeft, ExternalLink } from "lucide-react";
import { usePlatformBrandingStore } from "@/store/platform-branding-store";
import { useAuthStore } from "@/store/auth-store";

export default function MobileLockedPage() {
  const router = useRouter();
  const branding = usePlatformBrandingStore();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6 dark:bg-[#0F172A]">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#12D6B5] to-[#1E88E5] shadow-lg">
          <Smartphone className="h-10 w-10 text-white" />
        </div>

        {/* Content */}
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
          Akses Mobile Dinonaktifkan
        </h1>
        <p className="mt-3 text-sm text-neutral-500 leading-relaxed">
          Paket Anda belum mendukung penggunaan {branding.getAppName()} melalui perangkat mobile.
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          Silakan hubungi administrator atau tingkatkan paket Anda untuk mengaktifkan akses mobile.
        </p>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => router.push("/settings/account")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#12D6B5] to-[#1E88E5] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1E88E5]/25 transition active:scale-95"
          >
            <ExternalLink className="h-4 w-4" />
            Hubungi Administrator
          </button>
          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-6 py-3 text-sm font-medium text-neutral-600 transition active:scale-95 dark:border-neutral-700 dark:bg-[#1E293B] dark:text-neutral-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Logout
          </button>
        </div>

        <p className="mt-6 text-[11px] text-neutral-400">
          Desktop browser tetap dapat digunakan tanpa batasan.
        </p>
      </div>
    </div>
  );
}
