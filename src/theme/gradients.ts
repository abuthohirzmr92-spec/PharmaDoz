import { colorTokens } from "./tokens";

export type GradientName = "primary" | "success" | "info" | "warning" | "danger";

export const gradientTokens: Record<GradientName, string> = {
  primary: `linear-gradient(135deg, ${colorTokens.mobile.turquoise} 0%, ${colorTokens.mobile.blue} 100%)`,
  success: `linear-gradient(135deg, #10B981 0%, #34D399 100%)`,
  info:    `linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)`,
  warning: `linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)`,
  danger:  `linear-gradient(135deg, #EF4444 0%, #F87171 100%)`,
} as const;
