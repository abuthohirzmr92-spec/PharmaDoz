"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-[#DCFCE7] text-[#10B981] dark:bg-green-950 dark:text-green-400",
  warning: "bg-[#FEF3C7] text-[#F59E0B] dark:bg-amber-950 dark:text-amber-400",
  danger:  "bg-[#FEE2E2] text-[#EF4444] dark:bg-red-950 dark:text-red-400",
  info:    "bg-[#DBEAFE] text-[#3B82F6] dark:bg-blue-950 dark:text-blue-400",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

interface AppBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function AppBadge({ variant = "neutral", children, className }: AppBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", variantStyles[variant], className)}>
      {children}
    </span>
  );
}
