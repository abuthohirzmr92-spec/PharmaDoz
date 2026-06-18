import { colorTokens } from "@/theme/tokens";

type GradientName = "primary" | "success" | "info" | "warning" | "danger";

const gradients: Record<GradientName, { from: string; to: string; deg?: number }> = {
  primary: { from: colorTokens.mobile.turquoise, to: colorTokens.mobile.blue, deg: 135 },
  success: { from: "#10B981", to: "#34D399", deg: 135 },
  info:    { from: "#3B82F6", to: "#60A5FA", deg: 135 },
  warning: { from: "#F59E0B", to: "#FBBF24", deg: 135 },
  danger:  { from: "#EF4444", to: "#F87171", deg: 135 },
};

export function getGradient(name: GradientName): string {
  const g = gradients[name];
  return `linear-gradient(${g.deg ?? 135}deg, ${g.from} 0%, ${g.to} 100%)`;
}

export { gradients };
