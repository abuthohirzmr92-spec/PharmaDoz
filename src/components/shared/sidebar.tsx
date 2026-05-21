"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useSidebarStore } from "@/store/sidebar-store";
import { useAuthStore } from "@/store/auth-store";
import { ChevronLeft } from "lucide-react";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { TENANT_NAVIGATION } from "@/config/navigation";
import { NavItem } from "./nav-item";
import { OfflineIndicator } from "./offline-indicator";
import { SyncStatus } from "./sync-status";
import { RoleSwitcher } from "./role-switcher";
import { SessionPanel } from "./session-panel";

export function Sidebar() {
  const { expanded, toggle } = useSidebarStore();
  const user = useAuthStore((s) => s.user);

  // Defense-in-depth: proxy + (tenant) layout prevent platform users from reaching this.
  if (isPlatformUser(user?.role)) return null;

  const filteredNav = TENANT_NAVIGATION.filter(
    (item) =>
      !item.permission ||
      useAuthStore.getState().can(item.permission),
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
      <nav key={user?.role} className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredNav.map((item) => (
          <NavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={<item.icon />}
            collapsed={!expanded}
          />
        ))}
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
