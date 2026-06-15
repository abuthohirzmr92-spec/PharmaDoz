"use client";

import { useEffect } from "react";
import { Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { PLATFORM_NAV_GROUPS } from "@/config/platform-navigation";
import { PlatformNavItem } from "./platform-nav-item";
import { SessionPanel } from "@/components/shared/session-panel";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { usePlatformBrandingStore } from "@/store/platform-branding-store";

export function PlatformSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const branding = usePlatformBrandingStore();

  useEffect(() => {
    branding.loadSettings();
  }, []);

  if (!isPlatformUser(user?.role)) return null;

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
        {branding.getSidebarLogoUrl() ? (
          <img
            src={branding.getSidebarLogoUrl()!}
            alt={branding.getAppName()}
            className="h-6 w-6 rounded object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        )}
        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {branding.getAppName()}
        </span>
      </div>

      <nav className="flex-1 space-y-4 overflow-auto p-3">
        {PLATFORM_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <PlatformNavItem
                    key={item.href}
                    item={item}
                    active={active}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: session info, connection status, logout */}
      <SessionPanel collapsed={false} />
      <RoleSwitcher />
    </aside>
  );
}
