/**
 * Device detection — mobile vs desktop.
 * No PWA check needed. Mobile browser and installed PWA are both "mobile".
 */

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
