"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * AppShell — future universal layout wrapper.
 * Replaces ad-hoc div wrappers across devices.
 * NOT YET WIRED — foundation only.
 */
export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-[#F7F9FC] dark:bg-[#0F172A]", className)}>
      {children}
    </div>
  );
}
