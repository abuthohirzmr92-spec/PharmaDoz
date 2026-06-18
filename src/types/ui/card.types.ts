import type { ReactNode, CSSProperties } from "react";

export type CardVariant = "default" | "elevated" | "hero" | "outline" | "flat";

export interface AppCardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  style?: CSSProperties;
}
