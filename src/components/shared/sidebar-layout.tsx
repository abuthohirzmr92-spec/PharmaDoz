"use client";

import type { ReactNode } from "react";
import { useSidebarStore } from "@/store/sidebar-store";
import { useAuthStore } from "@/store/auth-store";
import { MOBILE_BOTTOM_NAV_HEIGHT } from "@/config/constants";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { X } from "lucide-react";

export function SidebarLayout({ children }: { children: ReactNode }) {
  const { mobileOpen, setMobileOpen } = useSidebarStore();
  const user = useAuthStore((s) => s.user);

  // Defense-in-depth: proxy + (tenant) layout prevent platform users from reaching this.
  if (isPlatformUser(user?.role)) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-[260px]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className="flex flex-1 flex-col overflow-x-hidden"
        style={{ paddingBottom: MOBILE_BOTTOM_NAV_HEIGHT }}
      >
        <div className="flex flex-1 flex-col p-2 sm:p-3 lg:p-4">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
