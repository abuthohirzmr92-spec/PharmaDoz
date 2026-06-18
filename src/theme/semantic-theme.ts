import { colorTokens } from "./tokens";

/**
 * Semantic Theme — maps abstract roles to concrete token values.
 * Replace this entire object to white-label or change theme preset.
 * Components reference semantic keys, never raw color values.
 */
export const semanticTheme = {
  primary: colorTokens.mobile.turquoise,
  primaryDark: colorTokens.mobile.blue,
  secondary: colorTokens.mobile.cyan,

  success: colorTokens.success,
  warning: colorTokens.warning,
  danger: colorTokens.danger,
  info: colorTokens.info,

  background: colorTokens.background.light,         // #F7F9FC
  backgroundDark: colorTokens.background.dark,       // #0F172A
  surface: "#FFFFFF",                                 // card background
  surfaceDark: colorTokens.background.cardDark,      // #1E293B

  border: "#E5E7EB",
  borderDark: colorTokens.neutral[700],

  textPrimary: colorTokens.neutral[800],
  textPrimaryDark: "#F1F5F9",
  textSecondary: colorTokens.neutral[500],
  textSecondaryDark: "#94A3B8",
} as const;
