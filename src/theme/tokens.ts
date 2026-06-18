// Centralized design tokens — single source of truth for the entire app.
// Colors, typography, spacing, radius, shadows all live here.
// Components reference these tokens, never hardcode values.

export const colorTokens = {
  // Brand — modern blue
  brand: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },

  // Mobile — Medisync turquoise-cyan-blue gradient palette
  mobile: {
    turquoise: "#12D6B5",
    cyan: "#18B7C8",
    blue: "#1E88E5",
    deepBlue: "#1557D5",
    turquoiseLight: "#11C5B4",
  },

  // Backgrounds
  background: {
    light: "#F7F9FC",
    dark: "#0F172A",
    cardDark: "#1E293B",
  },

  // Neutral / slate
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },

  // Semantic
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0284c7",
} as const;

export const typographyTokens = {
  fontFamily: {
    sans: "var(--font-sans, 'Inter', system-ui, sans-serif)",
    mono: "var(--font-mono, 'JetBrains Mono', monospace)",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },
} as const;

export const spacingTokens = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

export const radiusTokens = {
  none: "0",
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
} as const;

export const shadowTokens = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
  hero: "0 16px 40px rgba(30,136,229,0.25)",
  card: "0 2px 12px rgba(0,0,0,0.04)",
} as const;
