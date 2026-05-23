"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { useSidebarStore } from "@/store/sidebar-store";
import { useAuthStore } from "@/store/auth-store";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { hasPermission } from "@/lib/auth/permissions";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { TENANT_NAVIGATION } from "@/config/navigation";
import { NavItem } from "./nav-item";
import { OfflineIndicator } from "./offline-indicator";
import { SyncStatus } from "./sync-status";
import { RoleSwitcher } from "./role-switcher";
import { SessionPanel } from "./session-panel";
import { logSidebarRender, isDiagnosticsEnabled } from "@/lib/diagnostics";

export function Sidebar() {
  const { expanded, toggle } = useSidebarStore();
  const user = useAuthStore((s) => s.user);

  /* Diagnostic render log — fires on every render when diagnostics enabled */
  if (isDiagnosticsEnabled()) {
    console.log("%c[DIAG] Sidebar render", "color:#8B5CF6", {
      hasUser: !!user,
      role: user?.role ?? null,
      tenantId: user?.tenantId ?? null,
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      isLoading: useAuthStore.getState().isLoading,
    });
  }

  // Defense-in-depth: proxy + (tenant) layout prevent platform users from reaching this.
  if (isPlatformUser(user?.role)) return null;

  // Compute nav from the subscribed user, not getState(), so React re-runs
  // this filter on every render where user changes.
  const filteredNav = useMemo(
    () => {
      const result = TENANT_NAVIGATION.filter(
        (item) =>
          !item.permission ||
          (user && hasPermission(user.role, item.permission)),
      );
      /* Diagnostic nav filter log + empty-sidebar probe */
      logSidebarRender({
        hasUser: !!user,
        role: user?.role ?? null,
        navFiltered: result.length,
        navTotal: TENANT_NAVIGATION.length,
      });

      if (isDiagnosticsEnabled()) {
        console.log("%c[DIAG] sidebar nav filter", "color:#8B5CF6", {
          hasUser: !!user,
          role: user?.role ?? null,
          tenantId: user?.tenantId ?? null,
          navTotal: TENANT_NAVIGATION.length,
          navFiltered: result.length,
          navFilteredLabels: result.map(i => i.label),
          navRejectedLabels: TENANT_NAVIGATION.filter(i => !result.includes(i)).map(i => ({
            label: i.label,
            permission: i.permission,
            hasUserHasPermission: user ? hasPermission(user.role, i.permission!) : false,
          })),
        });
      }
      return result;
    },
    [user],
  );

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-neutral-200 bg-white transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-900",
        expanded ? "w-[260px]" : "w-[68px]"
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-brand-600"
        >
          <span className="text-xl">+</span>
          {expanded && <span className="text-base">Apotek</span>}
        </Link>
        <OfflineIndicator />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredNav.length > 0 ? (
          filteredNav.map((item) => (
            <NavItem
              key={item.href}
              label={item.label}
              href={item.href}
              icon={<item.icon />}
              collapsed={!expanded}
            />
          ))
        ) : user ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-[11px] text-neutral-400 leading-relaxed px-1">
              {expanded
                ? "Gagal memuat navigasi. Muat ulang halaman."
                : ""}
            </p>
          </div>
        ) : null}
      </nav>

      {/* Sync Status */}
      <div className="px-3 pb-1">
        <SyncStatus />
      </div>

      {/* Session Panel */}
      <SessionPanel collapsed={!expanded} />

      {/* Role Switcher */}
      <RoleSwitcher />

      {/* Toggle */}
      <button
        onClick={toggle}
        className="flex h-10 items-center justify-center border-t border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform",
            !expanded && "rotate-180"
          )}
        />
      </button>
    </aside>
  );
}
