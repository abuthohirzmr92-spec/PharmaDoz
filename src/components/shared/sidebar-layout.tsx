"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useSidebarStore } from "@/store/sidebar-store";
import { useAuthStore } from "@/store/auth-store";
import { MOBILE_BOTTOM_NAV_HEIGHT, SIDEBAR_CONTENT_GAP } from "@/config/constants";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Menu, X } from "lucide-react";

export function SidebarLayout({ children }: { children: ReactNode }) {
  const {
    mode,
    mobileOpen,
    slidingOpen,
    setMobileOpen,
    setSlidingOpen,
  } = useSidebarStore();
  const user = useAuthStore((s) => s.user);

  if (isPlatformUser(user?.role)) return <>{children}</>;

  const isSliding = mode === "sliding";

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Desktop: sticky sidebar (expanded / icon modes) */}
      {!isSliding && (
        <div className="hidden md:block">
          <Sidebar />
        </div>
      )}

      {/* Desktop: sliding overlay + hamburger */}
      {isSliding && (
        <div className="hidden md:block">
          {/* Hamburger button when sidebar is hidden */}
          {!slidingOpen && (
            <button
              onClick={() => setSlidingOpen(true)}
              className="fixed left-3 top-3 z-40 rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 shadow-sm hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 transition"
              title="Buka sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Overlay backdrop */}
          {slidingOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 transition-opacity"
              onClick={() => setSlidingOpen(false)}
            />
          )}

          {/* Sliding sidebar panel */}
          <div
            className={cn(
              "fixed left-0 top-0 z-50 h-screen transition-transform duration-250",
              slidingOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <button
              onClick={() => setSlidingOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

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
        className="flex flex-1 flex-col overflow-hidden"
        style={{ paddingBottom: MOBILE_BOTTOM_NAV_HEIGHT }}
      >
        {/* Global Topbar */}
        <Topbar />

        {/* Page content — fills remaining height, pages handle their own scroll */}
        <div
          className="flex flex-1 flex-col min-h-0 overflow-hidden"
          style={{ paddingLeft: SIDEBAR_CONTENT_GAP, paddingRight: 0, paddingTop: 12, paddingBottom: 12 }}
        >
          {children}
        </div>
      </main>

    </div>
  );
}
