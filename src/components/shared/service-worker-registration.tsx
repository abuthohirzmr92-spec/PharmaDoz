"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker on mount.
 * Must be included in the root layout.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service Worker registration failed:", err.message);
      });
  }, []);

  return null;
}
