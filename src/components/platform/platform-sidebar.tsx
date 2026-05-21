"use client";

import { Shield, ExternalLink } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { PLATFORM_NAV_GROUPS } from "@/config/platform-navigation";
import { PlatformNavItem } from "./platform-nav-item";

export function PlatformSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  if (!isPlatformUser(user?.role)) return null;

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Platform Admin
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

      {isSuperAdmin(user?.role) && (
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Kembali ke Aplikasi
          </button>
        </div>
      )}
    </aside>
  );
}
