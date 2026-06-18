"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AppSectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg";
}

const spacingMap = {
  sm: "mt-3 px-4",
  md: "mt-4 px-4",
  lg: "mt-6 px-4",
};

export function AppSection({ children, title, subtitle, action, className, spacing = "md" }: AppSectionProps) {
  return (
    <div className={cn(spacingMap[spacing], className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          <div>
            {title && <h3 className="text-sm font-bold text-neutral-800 dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
