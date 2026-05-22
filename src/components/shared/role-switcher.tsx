"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Shield, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  ROLE_LABELS,
  SYSTEM_ROLES,
  BUSINESS_ROLES,
} from "@/lib/auth/roles";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import type { AppRole } from "@/types";

export function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const currentRole = useAuthStore((s) => s.getRole());
  const switchRole = useAuthStore((s) => s.switchRole);

  if (!currentRole) return null;

  const isPlatform = isPlatformUser(currentRole);

  const handleSelect = (role: AppRole) => {
    switchRole(role);
    setOpen(false);
  };

  return (
    <div className="relative border-t border-neutral-200 dark:border-neutral-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">
          {ROLE_LABELS[currentRole]}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          {/* Overlay to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute bottom-full left-2 right-2 z-50 mb-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {/* System Roles — platform users only */}
            {isPlatform && (
              <div className={cn(!isPlatform || "mb-2")}>
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  System Roles
                </p>
                {SYSTEM_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleSelect(role)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                      currentRole === role
                        ? "bg-brand-50 text-brand-700 font-medium dark:bg-brand-950 dark:text-brand-300"
                        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        currentRole === role
                          ? "bg-brand-500"
                          : "bg-neutral-300",
                      )}
                    />
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            )}

            {/* Divider — only when both sections visible */}
            {isPlatform && (
              <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
            )}

            {/* Business (Tenant) Roles */}
            <div>
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {isPlatform ? "Business Roles" : "Peran"}
              </p>
              {BUSINESS_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => handleSelect(role)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                    currentRole === role
                      ? "bg-brand-50 text-brand-700 font-medium dark:bg-brand-950 dark:text-brand-300"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      currentRole === role
                        ? "bg-brand-500"
                        : "bg-neutral-300",
                    )}
                  />
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
