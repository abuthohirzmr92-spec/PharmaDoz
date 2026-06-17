"use client";

import { MobileBottomNav } from "./mobile-bottom-nav";

/**
 * Mobile Layout — replaces SidebarLayout on mobile screens.
 * Wraps page content with bottom navigation.
 * Only visible on screens < 768px (md breakpoint).
 */
export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:hidden flex flex-col min-h-screen bg-[#F7F9FC] dark:bg-[#0F172A]">
      <main className="flex-1">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
