// ---------------------------------------------------------------------------
// RC1.5 P0C — MPKB Bootstrap (Singleton)
// ---------------------------------------------------------------------------
// Registers MPKB listener exactly ONCE. Safe for HMR, provider remounts,
// and multiple app mounts. Duplicate calls are detected and silently ignored.
// ---------------------------------------------------------------------------

import { initMpkbListener } from "@/lib/mpkb/listener";

// Use globalThis to survive HMR and provider remounts
const KEY = "__MPKB_LISTENER_INITIALIZED__";

export function bootstrapMpkb(): void {
  // Guard: already initialized
  if ((globalThis as any)[KEY]) return;

  try {
    initMpkbListener();
    (globalThis as any)[KEY] = true;
    if (process.env.NODE_ENV === "development") {
      console.log("[MPKB] Listener registered successfully.");
    }
  } catch (err) {
    console.warn("[MPKB] Failed to initialize listener:", err);
    // Never crash the app — MPKB is non-critical
  }
}
