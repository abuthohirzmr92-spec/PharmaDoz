import type { ReactNode } from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface AppBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}
