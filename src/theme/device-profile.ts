import { BREAKPOINTS } from "./breakpoints";

export enum DeviceProfile {
  PHONE = "phone",
  TABLET_MOBILE = "tablet_mobile",
  TABLET_DESKTOP = "tablet_desktop",
  DESKTOP = "desktop",
}

/**
 * Determine device profile from viewport width.
 * Only call this client-side (requires window).
 */
export function getDeviceProfile(width?: number): DeviceProfile {
  const w = width ?? (typeof window !== "undefined" ? window.innerWidth : BREAKPOINTS.desktopMin);

  if (w <= BREAKPOINTS.phoneMax) return DeviceProfile.PHONE;
  if (w <= BREAKPOINTS.tabletMax) return DeviceProfile.TABLET_MOBILE; // default tablet → mobile UI
  return DeviceProfile.DESKTOP;
}

/** Tablet can optionally use desktop UI if screen is large enough */
export function getTabletProfile(width?: number): DeviceProfile {
  const w = width ?? (typeof window !== "undefined" ? window.innerWidth : BREAKPOINTS.desktopMin);

  if (w <= BREAKPOINTS.phoneMax) return DeviceProfile.PHONE;
  if (w <= BREAKPOINTS.tabletMax) {
    // Tablet: use mobile UI for portrait, desktop UI for landscape
    if (w >= 1024) return DeviceProfile.TABLET_DESKTOP;
    return DeviceProfile.TABLET_MOBILE;
  }
  return DeviceProfile.DESKTOP;
}
