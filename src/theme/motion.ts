export const motionTokens = {
  duration: {
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
  },
  scale: {
    tap: "0.97",
    hover: "1.01",
  },
  transition: {
    default: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    card: "200ms ease",
    button: "150ms ease",
  },
} as const;
