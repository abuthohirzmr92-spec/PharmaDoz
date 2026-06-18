"use client";

import { cn } from "@/lib/cn";
import { type ReactNode } from "react";

type CardVariant = "default" | "elevated" | "hero";

const variantStyles: Record<CardVariant, string> = {
  default: "rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1E293B]",
  elevated: "rounded-3xl bg-white p-5 shadow-xl dark:bg-[#1E293B]",
  hero: "rounded-3xl p-5 text-white",
};

interface AppCardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  style?: React.CSSProperties;
}

export function AppCard({ children, variant = "default", className, style }: AppCardProps) {
  return (
    <div className={cn(variantStyles[variant], className)} style={style}>
      {children}
    </div>
  );
}
