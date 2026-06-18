import { BREAKPOINTS } from "@/theme/breakpoints";

export enum LayoutProfile {
  PHONE = "phone",
  TABLET_MOBILE = "tablet_mobile",
  TABLET_HYBRID = "tablet_hybrid",
  DESKTOP = "desktop",
}

/**
 * Determine layout profile from viewport width.
 * Only call client-side.
 */
export function getLayoutProfile(width?: number): LayoutProfile {
  const w = width ?? (typeof window !== "undefined" ? window.innerWidth : BREAKPOINTS.desktopMin);

  if (w <= BREAKPOINTS.phoneMax) return LayoutProfile.PHONE;
  if (w <= BREAKPOINTS.tabletMax) {
    // Tablet: mobile UI for portrait, hybrid (desktop-like) for landscape
    if (w >= 1024) return LayoutProfile.TABLET_HYBRID;
    return LayoutProfile.TABLET_MOBILE;
  }
  return LayoutProfile.DESKTOP;
}
