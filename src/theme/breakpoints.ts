/** Breakpoint constants — single source of truth for responsive behavior */

export const BREAKPOINTS = {
  phoneMax: 767,
  tabletMin: 768,
  tabletMax: 1279,
  desktopMin: 1280,
} as const;

export function isPhone(width: number): boolean {
  return width <= BREAKPOINTS.phoneMax;
}

export function isTablet(width: number): boolean {
  return width >= BREAKPOINTS.tabletMin && width <= BREAKPOINTS.tabletMax;
}

export function isDesktop(width: number): boolean {
  return width >= BREAKPOINTS.desktopMin;
}
