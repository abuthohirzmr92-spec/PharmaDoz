"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Building2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth-store";
import { ROLE_LABELS } from "@/lib/auth/roles";

interface SessionPanelProps {
  collapsed: boolean;
}

export function SessionPanel({ collapsed }: SessionPanelProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemoMode());
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
  };

  if (collapsed) {
    return (
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center py-2.5 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
          title="Keluar"
        >
          {isLoggingOut ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
      {/* User info */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {user.displayName}
        </p>
        <p className="text-xs text-neutral-500">
          {ROLE_LABELS[user.role]}
        </p>
        {user.pharmacyName && (
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.pharmacyName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 pt-0.5">
          {isDemo ? (
            <>
              <WifiOff className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="text-[11px] text-amber-600 dark:text-amber-500">Demo Mode</span>
            </>
          ) : (
            <>
              <Wifi className="h-3 w-3 shrink-0 text-emerald-500" />
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500">Connected to Supabase</span>
            </>
          )}
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          "border-neutral-200 text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600",
          "dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-red-950 dark:hover:border-red-800 dark:hover:text-red-400",
          "disabled:opacity-50",
        )}
      >
        {isLoggingOut ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
        {isLoggingOut ? "Keluar..." : "Keluar"}
      </button>
    </div>
  );
}
