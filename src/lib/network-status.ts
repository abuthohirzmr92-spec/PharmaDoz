// ---------------------------------------------------------------------------
// Network status detection utility
// ---------------------------------------------------------------------------

import type { NetworkStatus } from "@/types";

const listeners = new Set<(status: NetworkStatus) => void>();

let currentStatus: NetworkStatus = "online";

function computeStatus(): NetworkStatus {
  if (typeof window === "undefined") return "online";
  return navigator.onLine ? "online" : "offline";
}

function notifyListeners() {
  const status = computeStatus();
  currentStatus = status;
  listeners.forEach((cb) => cb(status));
}

/* ---- Initialise event listeners (client-only) ---- */
if (typeof window !== "undefined") {
  window.addEventListener("online", notifyListeners);
  window.addEventListener("offline", notifyListeners);

  // Re-check when the tab becomes visible (e.g. user returns after
  // briefly losing connectivity while the tab was backgrounded).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      notifyListeners();
    }
  });
}

// Set initial status
currentStatus = computeStatus();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns `true` if the browser currently reports being online. */
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

/** Returns the current {@link NetworkStatus}. */
export function getNetworkStatus(): NetworkStatus {
  return currentStatus;
}

/**
 * Subscribe to network status changes.
 *
 * @param callback – invoked with the new status whenever it changes.
 * @returns an unsubscribe function.
 */
export function subscribeToNetworkChanges(
  callback: (status: NetworkStatus) => void,
): () => void {
  listeners.add(callback);

  // Immediately call with the current status so the subscriber is in-sync.
  callback(currentStatus);

  return () => {
    listeners.delete(callback);
  };
}
