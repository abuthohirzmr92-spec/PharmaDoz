"use client";

import { useRouter } from "next/navigation";
import { Lock, Settings, Shield, ShieldAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSystemUser = useAuthStore((s) => s.isSystemUser());
  const canViewSettings = usePermission("settings.view");

  if (!canViewSettings) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-950/30">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
          Akses Ditolak
        </h2>
        <p className="max-w-xs text-sm text-neutral-500">
          Anda tidak memiliki izin untuk mengakses halaman Settings. Hubungi
          administrator untuk informasi lebih lanjut.
        </p>
      </div>
    );
  }

  return (
    <>
      <ModulePlaceholder
        title="Settings"
        description="Konfigurasi apotek, profil, tema, backup, dan pengaturan sistem."
        icon={<Settings className="h-8 w-8" />}
        moduleName="Settings"
      />

      {/* System roles: Platform Administration link */}
      {isSystemUser && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
              <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-200">
                Platform Administration
              </h3>
              <p className="text-xs text-brand-600 dark:text-brand-400">
                Kelola seluruh apotek, pengguna, dan persetujuan cabang
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-300 dark:hover:bg-brand-800"
          >
            <ExternalLink className="h-4 w-4" />
            Buka Platform Admin
          </button>
        </div>
      )}

      {/* Business owner: locked "Buka Toko Baru" card */}
      {!isSystemUser && user?.role === "tenant_owner" && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Buka Toko Baru
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Fitur ini memerlukan persetujuan Super Admin
              </p>
            </div>
          </div>
          <button
            disabled
            onClick={() =>
              toast.info(
                "Fitur buka cabang baru memerlukan koneksi database. Hubungi Super Admin untuk membuka cabang baru.",
              )
            }
            className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-700 opacity-60 cursor-not-allowed dark:border-amber-700 dark:bg-amber-900 dark:text-amber-300"
          >
            Ajukan Cabang Baru (Segera Hadir)
          </button>
          <p className="mt-2 text-[10px] text-amber-500">
            Hubungi Super Admin di super@apotek-manage.id untuk membuka cabang baru
          </p>
        </div>
      )}
    </>
  );
}
