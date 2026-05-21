import { validateRouteAccess, getRequiredPermissionForPath } from "@/lib/auth/roles";
import type { AppRole, Permission } from "@/types";

/**
 * Server-side route access validation.
 * Uses the single source of truth in roles.ts for permission mapping.
 */

const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/unauthorized",
  "/offline",
]);

export function getRequiredPermission(path: string): Permission | null {
  return getRequiredPermissionForPath(path);
}

export function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  return (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/favicon.ico" ||
    path.includes(".")
  );
}

export function canAccessRoute(role: AppRole | null, path: string): boolean {
  if (!role) return isPublicPath(path);
  return validateRouteAccess(role, path);
}
