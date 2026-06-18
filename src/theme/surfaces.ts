import { colorTokens } from "./tokens";

export const surfaceTokens = {
  card: {
    light: "#FFFFFF",
    dark: colorTokens.neutral[800], // #1E293B
  },
  page: {
    light: colorTokens.background.light, // #F7F9FC
    dark: colorTokens.background.dark,  // #0F172A
  },
  hero: {
    gradient: `linear-gradient(135deg, ${colorTokens.mobile.turquoise} 0%, ${colorTokens.mobile.blue} 100%)`,
  },
  border: {
    light: "#E5E7EB",
    dark: colorTokens.neutral[700], // #334155
  },
  floating: {
    light: "rgba(255,255,255,0.95)",
    dark: "rgba(15,23,42,0.95)",
  },
} as const;
