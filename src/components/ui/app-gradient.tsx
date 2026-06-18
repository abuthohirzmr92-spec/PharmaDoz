import { gradientTokens, type GradientName } from "@/theme/gradients";

export function getGradient(name: GradientName): string {
  return gradientTokens[name];
}

export type { GradientName };
