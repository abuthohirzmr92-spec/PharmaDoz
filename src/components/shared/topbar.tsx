"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Bell,
  Building2,
  Wifi,
  WifiOff,
  Shield,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth-store";
import { useBranchStore } from "@/store/branch-store";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode as checkDemoMode } from "@/config/env";
import { SIDEBAR_CONTENT_GAP } from "@/config/constants";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeBranch = useBranchStore((s) => s.activeBranch);
  const branches = useBranchStore((s) => s.branches);
  const setActiveBranch = useBranchStore((s) => s.setActiveBranch);
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const isDemo = checkDemoMode();
  const isConnected = isSupabaseConnected();
  const isPlatform = isPlatformUser(user.role);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push("/login");
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
      style={{ paddingLeft: SIDEBAR_CONTENT_GAP, paddingRight: SIDEBAR_CONTENT_GAP }}
    >
      {/* Left: Connection status */}
      <div className="flex items-center gap-3">
        {isDemo ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
            <WifiOff className="h-3 w-3" /> Demo
          </span>
        ) : isConnected ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
            <Wifi className="h-3 w-3" /> Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-red-500">
            <WifiOff className="h-3 w-3" /> Offline
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="relative">
            <button
              onClick={() => { setBranchOpen(!branchOpen); setProfileOpen(false); }}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{activeBranch?.name ?? "Pilih Cabang"}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", branchOpen && "rotate-180")} />
            </button>
            {branchOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBranchOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setActiveBranch(b); setBranchOpen(false); }}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800",
                        activeBranch?.id === b.id && "bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300",
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Notification Bell */}
        <button
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          title="Notifikasi"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setBranchOpen(false); }}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {user.displayName?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[100px]">
                {user.displayName}
              </p>
              <p className="text-[10px] text-neutral-400">
                {isPlatform && <Shield className="mr-0.5 inline h-2.5 w-2.5 text-brand-500" />}
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <ChevronDown className={cn("h-3 w-3 text-neutral-400 transition-transform", profileOpen && "rotate-180")} />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {/* User info */}
                <div className="border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.displayName}</p>
                  <p className="text-xs text-neutral-400">{user.email}</p>
                  {user.pharmacyName && (
                    <p className="text-xs text-neutral-400">{user.pharmacyName}</p>
                  )}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {loggingOut ? "Keluar..." : "Keluar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
