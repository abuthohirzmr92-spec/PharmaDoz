import { validateRouteAccess } from "@/lib/auth/roles";
import type { AppRole, Permission } from "@/types";

/**
 * Server-side route access validation.
 * Returns the required permission for a path, or null if no permission is needed.
 */

const PROTECTED_PATHS: Record<string, Permission> = {
  "/admin/tenants": "platform.tenants.manage",
  "/admin/expansions": "platform.expansions.approve",
  "/admin/monitoring": "platform.monitoring.view",
  "/admin": "platform.view",
};

const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/unauthorized",
  "/offline",
]);

export function getRequiredPermission(path: string): Permission | null {
  // Check exact match first
  if (PROTECTED_PATHS[path]) return PROTECTED_PATHS[path];

  // Check prefix matches
  for (const [prefix, permission] of Object.entries(PROTECTED_PATHS)) {
    if (path.startsWith(prefix + "/") || path.startsWith(prefix + "?")) {
      return permission;
    }
  }

  return null;
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
