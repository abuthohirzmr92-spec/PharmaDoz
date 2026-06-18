"use client";

import { useState, useEffect } from "react";
import { Monitor, Clock, Shield, Loader2, LogOut, Smartphone, Globe } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AppCard } from "@/components/ui/app-card";
import { AppBadge } from "@/components/ui/app-badge";

function getBrowserInfo(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  return "Browser";
}

function getOSInfo(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux") && !ua.includes("Android")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "Unknown";
}

function getDeviceIcon(): typeof Monitor {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Android|iPhone|iPad|iPod/.test(ua)) return Smartphone;
  return Monitor;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;
  return `${Math.floor(hours / 24)} hari`;
}

const DUMMY_SESSIONS = [
  { id: "1", device: `${getBrowserInfo()} ${getOSInfo()}`, current: true, lastActive: "Sekarang" },
  { id: "2", device: "Safari iPhone", current: false, lastActive: "2 hari lalu" },
  { id: "3", device: "Chrome Android", current: false, lastActive: "5 hari lalu" },
];

export default function SessionPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const DeviceIcon = getDeviceIcon();
  const browser = getBrowserInfo();
  const os = getOSInfo();

  useEffect(() => { setSessionStart(new Date()); }, []);

  const handleLogoutAll = async () => {
    setIsSigningOut(true);
    try {
      if (isSupabaseConnected()) {
        const { supabase } = await import("@/lib/supabase/client");
        if (supabase) await supabase.auth.signOut({ scope: "global" });
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
    <div className="space-y-4">
      {/* Current Device */}
      <AppCard variant="elevated">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
            <DeviceIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Perangkat Saat Ini</h2>
            <p className="text-xs text-neutral-500">{browser} · {os}</p>
          </div>
          <AppBadge variant="success" className="ml-auto">Perangkat Ini</AppBadge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-neutral-400" />
              <span className="text-xs text-neutral-500">Browser</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{browser}</p>
          </div>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-neutral-400" />
              <span className="text-xs text-neutral-500">Sistem Operasi</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{os}</p>
          </div>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neutral-400" />
              <span className="text-xs text-neutral-500">Durasi</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {formatDuration(sessionAge)}
            </p>
          </div>
        </div>
      </AppCard>

      {/* Session List */}
      <AppCard>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Semua Session</h3>
        <p className="text-xs text-neutral-400 mb-4">Perangkat yang pernah login dengan akun Anda</p>

        <div className="space-y-2">
          {DUMMY_SESSIONS.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                <Monitor className="h-4 w-4 text-neutral-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">{s.device}</p>
                <p className="text-xs text-neutral-400">{s.lastActive}</p>
              </div>
              {s.current && <AppBadge variant="success">Aktif</AppBadge>}
            </div>
          ))}
        </div>
      </AppCard>

      {/* Danger Zone */}
      <AppCard className="border border-neutral-200 dark:border-neutral-700">
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-red-500" />
            <p className="text-xs font-medium text-red-700 dark:text-red-300">Danger Zone</p>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            Keluar dari semua perangkat yang terhubung dengan akun Anda.
          </p>
          <button
            type="button"
            onClick={handleLogoutAll}
            disabled={isSigningOut}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition active:scale-[0.97]"
          >
            {isSigningOut ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Keluar...</>
            ) : (
              <><LogOut className="h-4 w-4" /> Keluar dari Semua Perangkat</>
            )}
          </button>
        </div>
      </AppCard>
    </div>
  );
}
