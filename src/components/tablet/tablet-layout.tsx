"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * TabletLayout — future hybrid tablet layout.
 * Supports both mobile-mode (bottom bar) and desktop-mode (sidebar).
 * NOT YET WIRED — foundation only.
 */
interface TabletLayoutProps {
  children: ReactNode;
  mode: "mobile" | "desktop";
  className?: string;
}

export function TabletLayout({ children, mode, className }: TabletLayoutProps) {
  if (mode === "mobile") {
    return (
      <div className={cn("flex min-h-screen flex-col bg-[#F7F9FC] dark:bg-[#0F172A]", className)}>
        <main className="flex-1">{children}</main>
        {/* Tablet mobile bottom bar placeholder */}
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-screen bg-[#F7F9FC] dark:bg-[#0F172A]", className)}>
      {/* Tablet desktop sidebar placeholder */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
