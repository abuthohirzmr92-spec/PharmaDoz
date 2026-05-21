"use client";

import { Users, Shield, CheckCircle2, XCircle, AlertTriangle, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/auth/roles";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { canAddUser, getQuotaLockMessage } from "@/lib/quota-guard";
import { isDemoMode as checkDemoMode } from "@/config/env";

export default function UsersPage() {
  const { user, can, getRole } = useAuth();
  const isDemo = checkDemoMode();

  const currentRole = getRole();
  const permissions = currentRole ? ROLE_PERMISSIONS[currentRole] : [];

  const quotaCheck = canAddUser(3, "basic");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Users &amp; Permissions
            </h1>
            <p className="text-xs text-neutral-500">
              {isDemo
                ? "Demo Mode — Role-Based Access Control aktif"
                : "Kelola pengguna dan izin akses"}
            </p>
          </div>
        </div>
      </div>

      {/* Demo mode alert — only visible in demo mode */}
      {isDemo && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-brand-500" />
            <div>
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                Demo Mode — Role-Based Access Control aktif
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Gunakan role switcher di sidebar untuk berganti role dan melihat
                perubahan permission secara real-time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current User Info */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Current User
          </h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Display Name</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {user?.displayName ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Email</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {user?.email ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Role</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <Shield className="h-3 w-3" />
              {currentRole ? ROLE_LABELS[currentRole] : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">User ID</span>
            <span className="text-xs font-mono text-neutral-500">
              {user?.id ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Tenant Quota — User Slot Limit */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Kuota Pengguna
          </h2>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500">Paket</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              Basic
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500">Pengguna</span>
            <span className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
              {quotaCheck.current} / {quotaCheck.max}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mb-3 h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                quotaCheck.allowed
                  ? "bg-brand-500"
                  : "bg-red-500",
              )}
              style={{
                width: `${Math.min(100, (quotaCheck.current / quotaCheck.max) * 100)}%`,
              }}
            />
          </div>
          {quotaCheck.allowed ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-300">
                Kuota tersedia — Anda dapat menambah pengguna baru.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Batas Pengguna Tercapai
                  </p>
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {getQuotaLockMessage("users", quotaCheck.max)}
                  </p>
                  <button
                    disabled
                    className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-medium text-amber-600 opacity-60 cursor-not-allowed dark:border-amber-700 dark:bg-amber-900 dark:text-amber-300"
                  >
                    Upgrade Paket (Segera Hadir)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Role Switcher — demo only */}
      {isDemo && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Quick Role Switch
            </h2>
          </div>
          <div className="p-2">
            <RoleSwitcher />
          </div>
        </div>
      )}

      {/* Permissions List */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Granted Permissions ({permissions.length})
          </h2>
        </div>
        <div className="divide-y divide-neutral-100 p-2 dark:divide-neutral-800">
          {permissions.length === 0 ? (
            <p className="p-2 text-xs text-neutral-400">
              No permissions granted for this role.
            </p>
          ) : (
            permissions.map((p) => {
              const hasIt = can(p);
              return (
                <div
                  key={p}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                >
                  <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                    {p}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      hasIt
                        ? "text-green-600"
                        : "text-neutral-300",
                    )}
                  >
                    {hasIt ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Granted
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        Denied
                      </>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
