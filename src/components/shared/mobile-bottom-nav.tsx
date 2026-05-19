"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Menu } from "lucide-react";
import { MOBILE_BOTTOM_NAV_HEIGHT } from "@/config/constants";
import { mainNavigation } from "@/config/navigation";
import { useSidebarStore } from "@/store/sidebar-store";
import { useAuthStore } from "@/store/auth-store";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebarStore();
  const user = useAuthStore((s) => s.user);

  const displayItems = mainNavigation
    .filter(
      (item) =>
        !item.permission ||
        useAuthStore.getState().can(item.permission),
    )
    .slice(0, 4);

  return (
    <nav
      key={user?.role}
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-neutral-200 bg-white md:hidden dark:border-neutral-800 dark:bg-neutral-900"
      style={{ height: MOBILE_BOTTOM_NAV_HEIGHT }}
    >
      {displayItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs",
              isActive
                ? "text-brand-600"
                : "text-neutral-500"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        onClick={() => setMobileOpen(true)}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-neutral-500"
      >
        <Menu className="h-5 w-5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
