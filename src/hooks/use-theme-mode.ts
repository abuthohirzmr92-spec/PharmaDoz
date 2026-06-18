"use client";

import { useState, useEffect } from "react";

type ThemeMode = "light" | "dark" | "system";

/**
 * Returns current theme mode with persistence.
 * Foundation hook — NOT YET WIRED.
 */
export function useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void } {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = localStorage.getItem("medisync-theme") as ThemeMode | null;
    if (stored) setModeState(stored);
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("medisync-theme", m);
    if (m === "dark") document.documentElement.classList.add("dark");
    else if (m === "light") document.documentElement.classList.remove("dark");
    else {
      // system
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  return { mode, setMode };
}
