/* ------------------------------------------------------------------ */
/*  RBAC unit tests                                                    */
/*  Run with: npx vitest run                                           */
/* ------------------------------------------------------------------ */

import { describe, it, expect, beforeEach } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/lib/auth/permissions";
import { ROLE_PERMISSIONS, ROLE_LABELS } from "@/lib/auth/roles";
import { useAuthStore } from "@/store/auth-store";
import type { AppRole, Permission } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ALL_PERMISSIONS: readonly Permission[] = [
  "inventory.stock.view",
  "inventory.stock.edit",
  "cashier.transaction.create",
  "cashier.transaction.void",
  "reports.sales.view",
  "reports.inventory.view",
  "products.view",
  "products.edit",
  "suppliers.view",
  "suppliers.edit",
  "purchases.create",
  "purchases.view",
  "users.view",
  "users.edit",
  "settings.view",
  "settings.edit",
  "logs.view",
  "expired.view",
  "expired.edit",
];

/** Permissions that involve _actions_ (edit / create / void). */
const ACTION_PERMISSIONS: readonly Permission[] = [
  "inventory.stock.edit",
  "cashier.transaction.create",
  "cashier.transaction.void",
  "products.edit",
  "suppliers.edit",
  "purchases.create",
  "users.edit",
  "settings.edit",
  "expired.edit",
];

const ALL_ROLES: readonly AppRole[] = [
  "super_admin",
  "tenant_owner",
  "pharmacist",
  "admin",
  "cashier",
  "staff",
];

/* ------------------------------------------------------------------ */
/*  Reset auth store before each test                                  */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

/* ================================================================== */
/*  1. Role-Permission Mapping                                         */
/* ================================================================== */

describe("Role-Permission Mapping", () => {
  it("system roles (super_admin) should have ALL permissions", () => {
    ALL_PERMISSIONS.forEach((perm) => {
      expect(hasPermission("super_admin", perm)).toBe(true);
    });
  });

  it("staff role should have only view permissions (no .edit, .create, .void)", () => {
    // Every permission granted to staff must end with ".view"
    ROLE_PERMISSIONS.staff.forEach((perm) => {
      expect(perm.endsWith(".view")).toBe(true);
    });

    // Staff must not have any action permissions
    ACTION_PERMISSIONS.forEach((perm) => {
      expect(hasPermission("staff", perm)).toBe(false);
    });
  });

  it("tenant_owner should have ALL business permissions", () => {
    ALL_PERMISSIONS.forEach((perm) => {
      expect(hasPermission("tenant_owner", perm)).toBe(true);
    });
  });

  it("pharmacist should have inventory.stock.edit, purchases.create, expired.edit", () => {
    expect(hasPermission("pharmacist", "inventory.stock.edit")).toBe(true);
    expect(hasPermission("pharmacist", "purchases.create")).toBe(true);
    expect(hasPermission("pharmacist", "expired.edit")).toBe(true);
  });

  it("admin should NOT have inventory.stock.edit, purchases.create, expired.edit", () => {
    expect(hasPermission("admin", "inventory.stock.edit")).toBe(false);
    expect(hasPermission("admin", "purchases.create")).toBe(false);
    expect(hasPermission("admin", "expired.edit")).toBe(false);
  });

  it("cashier should only have cashier.transaction.create, inventory.stock.view, expired.view, products.view", () => {
    expect(ROLE_PERMISSIONS.cashier).toHaveLength(4);
    expect(hasPermission("cashier", "cashier.transaction.create")).toBe(true);
    expect(hasPermission("cashier", "inventory.stock.view")).toBe(true);
    expect(hasPermission("cashier", "expired.view")).toBe(true);
    expect(hasPermission("cashier", "products.view")).toBe(true);
  });

  it("cashier should NOT have reports.sales.view, users.view, settings.view", () => {
    expect(hasPermission("cashier", "reports.sales.view")).toBe(false);
    expect(hasPermission("cashier", "users.view")).toBe(false);
    expect(hasPermission("cashier", "settings.view")).toBe(false);
  });

  it("ROLE_LABELS should have labels for all 7 roles", () => {
    ALL_ROLES.forEach((role) => {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe("string");
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    });
  });
});

/* ================================================================== */
/*  2. Permission Helpers                                              */
/* ================================================================== */

describe("Permission Helpers", () => {
  it("hasPermission should return true for granted permission", () => {
    expect(hasPermission("admin", "inventory.stock.view")).toBe(true);
    expect(hasPermission("cashier", "cashier.transaction.create")).toBe(true);
  });

  it("hasPermission should return false for denied permission", () => {
    expect(hasPermission("cashier", "inventory.stock.edit")).toBe(false);
    expect(hasPermission("admin", "expired.edit")).toBe(false);
  });

  it("hasPermission should return false for unknown role (use type assertion)", () => {
    const result = hasPermission("unknown_role" as AppRole, "inventory.stock.view");
    expect(result).toBe(false);
  });

  it("hasAnyPermission should return true if at least one matches", () => {
    const result = hasAnyPermission("cashier", [
      "inventory.stock.edit",
      "inventory.stock.view",
    ]);
    expect(result).toBe(true);
  });

  it("hasAnyPermission should return false if none match", () => {
    const result = hasAnyPermission("cashier", [
      "inventory.stock.edit",
      "users.view",
      "settings.view",
    ]);
    expect(result).toBe(false);
  });

  it("hasAllPermissions should return true only if all match", () => {
    // All match
    expect(
      hasAllPermissions("admin", ["inventory.stock.view", "reports.sales.view"]),
    ).toBe(true);
    // One does not match
    expect(
      hasAllPermissions("admin", ["inventory.stock.view", "inventory.stock.edit"]),
    ).toBe(false);
  });
});

/* ================================================================== */
/*  3. Auth Store                                                      */
/* ================================================================== */

describe("Auth Store", () => {
  it("initial state should have user=null, isAuthenticated=false", () => {
    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('loginAs("tenant_owner") should set user with correct role and isAuthenticated=true', () => {
    useAuthStore.getState().loginAs("tenant_owner");
    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).not.toBeNull();
    expect(user?.role).toBe("tenant_owner");
    expect(isAuthenticated).toBe(true);
  });

  it("loginAs should create user with correct display name and email", () => {
    useAuthStore.getState().loginAs("tenant_owner");
    const { user } = useAuthStore.getState();
    expect(user?.displayName).toBe("Budi Santoso");
    expect(user?.email).toBe("owner@apotek-sehat.id");
  });

  it("logout should clear user and set isAuthenticated=false", () => {
    useAuthStore.getState().loginAs("tenant_owner");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it("switchRole should update user role without changing isAuthenticated", () => {
    useAuthStore.getState().loginAs("tenant_owner");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().switchRole("cashier");
    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user?.role).toBe("cashier");
    expect(isAuthenticated).toBe(true);
  });

  it("can(permission) should return false when not authenticated", () => {
    const { can } = useAuthStore.getState();
    expect(can("inventory.stock.view")).toBe(false);
    expect(can("inventory.stock.edit")).toBe(false);
  });

  it("can(permission) should return correct value after login", () => {
    useAuthStore.getState().loginAs("tenant_owner");
    const { can } = useAuthStore.getState();
    expect(can("inventory.stock.edit")).toBe(true);
    expect(can("users.edit")).toBe(true);
    expect(can("expired.edit")).toBe(true);
  });

  it("isSystemUser should return true for super_admin, false for cashier", () => {
    useAuthStore.getState().loginAs("super_admin");
    expect(useAuthStore.getState().isSystemUser()).toBe(true);

    useAuthStore.getState().switchRole("cashier");
    expect(useAuthStore.getState().isSystemUser()).toBe(false);
  });
});

/* ================================================================== */
/*  4. Role Switching                                                  */
/* ================================================================== */

describe("Role Switching", () => {
  it("switching from owner to cashier should immediately change permissions", () => {
    useAuthStore.getState().loginAs("tenant_owner");
    expect(useAuthStore.getState().can("inventory.stock.edit")).toBe(true);

    useAuthStore.getState().switchRole("cashier");
    expect(useAuthStore.getState().can("inventory.stock.edit")).toBe(false);
    expect(useAuthStore.getState().can("cashier.transaction.create")).toBe(true);
  });

  it("switching to super_admin should grant all permissions", () => {
    useAuthStore.getState().loginAs("cashier");
    expect(useAuthStore.getState().can("users.edit")).toBe(false);

    useAuthStore.getState().switchRole("super_admin");
    expect(useAuthStore.getState().can("users.edit")).toBe(true);
    expect(useAuthStore.getState().can("settings.edit")).toBe(true);
    expect(useAuthStore.getState().can("expired.edit")).toBe(true);
  });

  it("canAny and canAll should work correctly for a given role", () => {
    useAuthStore.getState().loginAs("admin");
    const { canAny, canAll } = useAuthStore.getState();

    // canAny — at least one matches
    expect(
      canAny(["inventory.stock.edit", "inventory.stock.view"]),
    ).toBe(true);

    // canAny — none match
    expect(
      canAny(["inventory.stock.edit", "expired.edit"]),
    ).toBe(false);

    // canAll — all match
    expect(
      canAll(["inventory.stock.view", "reports.sales.view"]),
    ).toBe(true);

    // canAll — one does not match
    expect(
      canAll(["inventory.stock.view", "inventory.stock.edit"]),
    ).toBe(false);
  });
});

/* ================================================================== */
/*  5. Unauthorized Access Prevention                                  */
/* ================================================================== */

describe("Unauthorized Access Prevention", () => {
  it("cashier should not have expired.edit permission", () => {
    useAuthStore.getState().loginAs("cashier");
    expect(useAuthStore.getState().can("expired.edit")).toBe(false);
  });

  it("cashier should not have purchases.create permission", () => {
    useAuthStore.getState().loginAs("cashier");
    expect(useAuthStore.getState().can("purchases.create")).toBe(false);
  });

  it("cashier should not have inventory.stock.edit permission", () => {
    useAuthStore.getState().loginAs("cashier");
    expect(useAuthStore.getState().can("inventory.stock.edit")).toBe(false);
  });

  it("admin should not have expired.edit permission", () => {
    useAuthStore.getState().loginAs("admin");
    expect(useAuthStore.getState().can("expired.edit")).toBe(false);
  });

  it("staff should not have any .edit, .create, or .void permissions", () => {
    useAuthStore.getState().loginAs("staff");
    const { can } = useAuthStore.getState();

    ACTION_PERMISSIONS.forEach((perm) => {
      expect(can(perm)).toBe(false);
    });
  });
});

/* ================================================================== */
/*  6. Edge Cases                                                      */
/* ================================================================== */

describe("Edge Cases", () => {
  it("hasPermission with invalid permission string should return false at runtime", () => {
    // Using `as Permission` to simulate an unknown permission value that
    // TypeScript would otherwise reject at compile time.
    const fake = "does.not.exist" as Permission;
    expect(hasPermission("admin", fake)).toBe(false);
    expect(hasPermission("super_admin", fake)).toBe(false);
    expect(hasPermission("cashier", fake)).toBe(false);
  });

  it("loginAs with each of the 7 roles should all succeed", () => {
    ALL_ROLES.forEach((role) => {
      useAuthStore.getState().loginAs(role);
      const { user, isAuthenticated } = useAuthStore.getState();
      expect(user).not.toBeNull();
      expect(user?.role).toBe(role);
      expect(isAuthenticated).toBe(true);

      // Reset for next role
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    });
  });

  it("rapid role switching should maintain correct state (switch 3 times, check final state)", () => {
    useAuthStore.getState().loginAs("tenant_owner");
    useAuthStore.getState().switchRole("cashier");
    useAuthStore.getState().switchRole("admin");
    useAuthStore.getState().switchRole("pharmacist");

    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).not.toBeNull();
    expect(user?.role).toBe("pharmacist");
    expect(isAuthenticated).toBe(true);
  });
});
