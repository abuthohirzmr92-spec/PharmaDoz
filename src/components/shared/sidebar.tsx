"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { useSidebarStore } from "@/store/sidebar-store";
import { useAuthStore } from "@/store/auth-store";
import {
  ChevronLeft,
  Monitor,
  PanelLeftClose,
  PanelRightClose,
  PanelBottom,
  AlertTriangle,
} from "lucide-react";
import { hasPermission } from "@/lib/auth/permissions";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { TENANT_NAVIGATION, type NavItem as NavItemConfig } from "@/config/navigation";
import { NavItem } from "./nav-item";
import { OfflineIndicator } from "./offline-indicator";
import { useTenantBranding } from "@/providers/tenant-brand-provider";
import { logSidebarRender, isDiagnosticsEnabled } from "@/lib/diagnostics";
import type { SidebarMode } from "@/store/sidebar-store";

/* ------------------------------------------------------------------ */
/*  Sidebar mode badge (shown in toggle row)                           */
/* ------------------------------------------------------------------ */

const MODE_LABELS: Record<SidebarMode, string> = {
  expanded: "Penuh",
  icon: "Ikon",
  sliding: "Geser",
};

const MODE_ICONS: Record<SidebarMode, typeof Monitor> = {
  expanded: PanelRightClose,
  icon: PanelBottom,
  sliding: PanelLeftClose,
};

function ModeSwitcher({ mode, collapsed }: { mode: SidebarMode; collapsed: boolean }) {
  const toggle = useSidebarStore((s) => s.toggle);

  const nextMode = (
    { expanded: "icon", icon: "sliding", sliding: "expanded" } as const
  )[mode];

  return (
    <button
      onClick={toggle}
      title={`Mode: ${MODE_LABELS[mode]} — klik untuk ${MODE_LABELS[nextMode]}`}
      className="flex h-10 w-full items-center justify-center gap-2 border-t border-neutral-200 text-xs text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
    >
      {collapsed ? (
        <ChevronLeft className={cn("h-4 w-4 transition-transform", mode === "sliding" && "rotate-180")} />
      ) : (
        <>
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            {MODE_LABELS[mode]}
          </span>
          <span className="text-[10px] text-neutral-300">→ {MODE_LABELS[nextMode]}</span>
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar content (reusable between sticky and sliding overlay)      */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const { mode, slidingOpen } = useSidebarStore();
  const user = useAuthStore((s) => s.user);
  const { branding } = useTenantBranding();
  const isExpanded = mode === "expanded" || (mode === "sliding" && slidingOpen);
  const isCollapsed = mode === "icon";

  if (isDiagnosticsEnabled()) {
    console.log("%c[DIAG] Sidebar render", "color:#8B5CF6", {
      hasUser: !!user,
      role: user?.role ?? null,
      tenantId: user?.tenantId ?? null,
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      isLoading: useAuthStore.getState().isLoading,
    });
  }

  if (isPlatformUser(user?.role)) return null;

  const filteredNav = useMemo(
    () => {
      const canSee = (permission?: NavItemConfig["permission"]) =>
        !permission || (!!user && hasPermission(user.role, permission));

      // Groups (items with children) are filtered recursively: keep visible
      // children, and show the group if it is itself permitted OR has at
      // least one visible child.
      const result = TENANT_NAVIGATION.flatMap((item) => {
        if (item.children && item.children.length > 0) {
          const children = item.children.filter((c) => canSee(c.permission));
          if (!canSee(item.permission) && children.length === 0) return [];
          return [{ ...item, children }];
        }
        return canSee(item.permission) ? [item] : [];
      });

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
        });
      }
      return result;
    },
    [user],
  );

  // In sliding mode and closed, render nothing (hamburger is in layout)
  if (mode === "sliding" && !slidingOpen) return null;

  const widthClass = isExpanded ? "w-[260px]" : "w-[68px]";

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-neutral-200 bg-white transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-900",
        widthClass,
      )}
    >
      {/* Brand — tenant logo + name, fallback "+ Apotek" */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-brand-600 min-w-0"
        >
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.companyName ?? "Logo"}
              className="h-10 w-10 rounded-lg object-contain shrink-0" />
          ) : (
            <span className="text-xl shrink-0">+</span>
          )}
          {isExpanded && (
            <span className="text-base truncate">
              {branding?.companyName ?? "Apotek"}
            </span>
          )}
        </Link>
        <OfflineIndicator />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredNav.length > 0 ? (
          filteredNav.map((item) => (
            <NavItem
              key={item.href ?? item.label}
              label={item.label}
              href={item.href}
              icon={<item.icon />}
              collapsed={!isExpanded}
              subItems={item.children?.map((c) => ({
                label: c.label,
                href: c.href,
                icon: <c.icon />,
              }))}
            />
          ))
        ) : user ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-[11px] text-neutral-400 leading-relaxed px-1">
              {isExpanded ? "Gagal memuat navigasi. Muat ulang halaman." : ""}
            </p>
          </div>
        ) : null}
      </nav>

      {/* Mode toggle — compact, keeps sidebar functionality accessible */}
      <ModeSwitcher mode={mode} collapsed={!isExpanded} />
    </aside>
  );
}

