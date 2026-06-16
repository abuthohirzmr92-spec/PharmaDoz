"use client";

import { useState, useEffect } from "react";
import { Monitor, Clock, Shield, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date(iso));
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;
  return `${Math.floor(hours / 24)} hari`;
}

export default function SessionPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    // Track session start time
    setSessionStart(new Date());
  }, []);

  const handleLogoutAll = async () => {
    setIsSigningOut(true);
    try {
      if (isSupabaseConnected()) {
        const { supabase } = await import("@/lib/supabase/client");
        if (supabase) {
          // Sign out from all devices
          await supabase.auth.signOut({ scope: "global" });
        }
      }

      await logout();
      toast.success("Berhasil logout dari semua perangkat.");
      router.push("/login");
    } catch {
      toast.error("Gagal logout.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const sessionAge = sessionStart ? Date.now() - sessionStart.getTime() : 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
          <Monitor className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Session Aktif</h2>
          <p className="text-xs text-neutral-500">Informasi session dan perangkat Anda</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Session Info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neutral-400" />
              <span className="text-xs text-neutral-500">Durasi Session</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {formatDuration(sessionAge)}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-neutral-400" />
              <span className="text-xs text-neutral-500">Role</span>
            </div>
            <p className="mt-1 text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-50">
              {user?.role ?? "—"}
            </p>
          </div>
        </div>

        {/* User Info */}
        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
          <p className="text-xs font-medium text-neutral-500">Informasi Akun</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Nama</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">{user?.displayName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Email</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">{user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Tenant</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">{user?.tenantName ?? user?.pharmacyName ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Logout All */}
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            Logout Semua Perangkat
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Ini akan mengeluarkan akun Anda dari semua browser dan perangkat yang sedang login.
          </p>
          <button
            type="button"
            onClick={handleLogoutAll}
            disabled={isSigningOut}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950 transition"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Logout...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" /> Logout Semua Perangkat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
