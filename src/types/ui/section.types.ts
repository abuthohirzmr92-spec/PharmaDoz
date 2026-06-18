import type { ReactNode } from "react";

export interface AppSectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg";
}
