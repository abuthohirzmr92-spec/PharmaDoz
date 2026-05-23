"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Store,
  Loader2,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useBranchStore } from "@/store/branch-store";
import {
  listTenantMembers,
  updateMemberRole,
  updateBranchAssignment,
  removeMember,
  type TenantMember,
} from "@/lib/tenant/members";
import { TENANT_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import type { AppRole, Permission } from "@/types";
import { hasPermission } from "@/lib/auth/permissions";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from "@/lib/permissions/all-permissions";
import {
  getUserOverrides,
  setUserOverride,
  deleteUserOverride,
  type UserPermissionOverride,
} from "@/lib/permissions/user-overrides";
import { toast } from "sonner";

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const membershipId = params.id as string;

  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const { branches, loadBranches } = useBranchStore();

  const [member, setMember] = useState<TenantMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [form, setForm] = useState({ role: "", branchId: "" });

  // Permission overrides
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadMember = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    const res = await listTenantMembers(tenantId);
    if (res.success && res.members) {
      const m = res.members.find((m) => m.id === membershipId);
      if (m) {
        setMember(m);
        setForm({ role: m.role, branchId: m.branchId ?? "" });
      } else {
        setError("Anggota tidak ditemukan.");
      }
    } else {
      setError(res.error ?? "Gagal memuat data anggota.");
    }
    setIsLoading(false);
  }, [tenantId, membershipId]);

  useEffect(() => {
    loadMember();
    if (tenantId) loadBranches(tenantId);
  }, [loadMember, loadBranches, tenantId]);

  // Load permission overrides when member is loaded
  useEffect(() => {
    if (member && tenantId && user?.role === "tenant_owner") {
      setOverridesLoading(true);
      getUserOverrides(tenantId, member.userId)
        .then((res) => {
          if (res.success && res.overrides) setOverrides(res.overrides);
        })
        .finally(() => setOverridesLoading(false));
    }
  }, [member, tenantId, user?.role]);

  async function handleTogglePermission(permission: Permission) {
    if (!tenantId || !member) return;
    setToggling(permission);

    const roleHas = hasPermission(member.role as AppRole, permission);
    const existingOverride = overrides.find((o) => o.permission === permission);

    if (existingOverride) {
      // Override exists → delete to revert to role default
      const res = await deleteUserOverride(existingOverride.id, tenantId);
      if (res.success) {
        setOverrides((prev) => prev.filter((o) => o.permission !== permission));
      } else {
        toast.error(res.error ?? "Gagal mengembalikan izin.");
      }
    } else {
      // No override → create one to invert the default
      const res = await setUserOverride(tenantId, member.userId, permission, !roleHas);
      if (res.success) {
        // Reload to get the new override with its UUID
        const reload = await getUserOverrides(tenantId, member.userId);
        if (reload.success && reload.overrides) setOverrides(reload.overrides);
      } else {
        toast.error(res.error ?? "Gagal mengubah izin.");
      }
    }
    setToggling(null);
  }

  const handleSaveRole = async () => {
    if (!member || !tenantId) return;
    if (form.role === member.role) {
      toast.info("Tidak ada perubahan peran.");
      return;
    }

    setSaving(true);
    const res = await updateMemberRole(
      member.id,
      tenantId,
      form.role as "admin" | "pharmacist" | "cashier" | "staff",
    );

    if (res.success) {
      toast.success("Peran berhasil diubah.");
      loadMember();
    } else {
      toast.error(res.error ?? "Gagal mengubah peran.");
    }
    setSaving(false);
  };

  const handleSaveBranch = async () => {
    if (!member || !tenantId) return;
    const newBranchId = form.branchId || null;
    if (newBranchId === (member.branchId ?? null)) {
      toast.info("Tidak ada perubahan cabang.");
      return;
    }

    setSaving(true);
    const res = await updateBranchAssignment(member.id, tenantId, newBranchId);

    if (res.success) {
      toast.success("Cabang berhasil diubah.");
      loadMember();
    } else {
      toast.error(res.error ?? "Gagal mengubah cabang.");
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!member || !tenantId) return;
    if (!confirm(`Nonaktifkan ${member.displayName} dari tenant?`)) return;

    setRemoving(true);
    const res = await removeMember(member.id, tenantId);
    if (res.success) {
      toast.success(`${member.displayName} dinonaktifkan.`);
      router.push("/users");
    } else {
      toast.error(res.error ?? "Gagal menonaktifkan pengguna.");
      setRemoving(false);
    }
  };

  const isOwner = member?.role === "tenant_owner";
  const isCurrentUser = member?.userId === user?.id;
  const isCallerOwner = user?.role === "tenant_owner";

  // Filter peran yang bisa dipilih (bukan tenant_owner)
  const editableRoles = TENANT_ROLES.filter((r) => r !== "tenant_owner");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/users")}
          className="inline-flex items-center gap-2 rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-5 w-5 text-neutral-500" />
          <span className="text-sm text-neutral-500">Kembali</span>
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error ?? "Anggota tidak ditemukan."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/users")}
          className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-5 w-5 text-neutral-500" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Detail Anggota
          </h1>
          <p className="text-xs text-neutral-500">{member.displayName}</p>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Informasi Anggota
          </h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Nama</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {member.displayName}
              {isCurrentUser && (
                <span className="ml-1 text-[10px] text-neutral-400">
                  (Anda)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Peran Saat Ini</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <Shield className="h-3 w-3" />
              {ROLE_LABELS[member.role]}
            </span>
          </div>
          {member.branchName && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Cabang</span>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {member.branchName}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Status</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                member.isActive ? "text-green-600" : "text-red-500"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {member.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </div>
      </div>

      {/* Role editor — only for tenant_owner, not for self, not for owner */}
      {isCallerOwner && !isOwner && !isCurrentUser && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Ubah Peran
            </h2>
          </div>
          <div className="space-y-3 p-4">
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-3 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            >
              {editableRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSaveRole}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan Peran
            </button>
          </div>
        </div>
      )}

      {/* Permission toggle grid — only tenant_owner for other users */}
      {isCallerOwner && !isCurrentUser && member && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Izin Akses
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Override izin individual untuk {member.displayName} tanpa mengubah peran.
            </p>
          </div>
          <div className="space-y-4 p-4">
            {overridesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : (
              PERMISSION_GROUPS.map((group) => (
                <div key={group.key}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.permissions.map((perm) => {
                      const roleHas = hasPermission(member.role as AppRole, perm);
                      const override = overrides.find((o) => o.permission === perm);
                      const effective = override ? override.granted : roleHas;
                      const busy = toggling === perm;

                      return (
                        <div
                          key={perm}
                          className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                        >
                          <div className="flex items-center gap-2">
                            {/* Role default indicator */}
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${
                                roleHas ? "bg-green-400" : "bg-neutral-300 dark:bg-neutral-600"
                              }`}
                              title={roleHas ? "Default: Aktif" : "Default: Nonaktif"}
                            />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">
                              {PERMISSION_LABELS[perm]}
                            </span>
                            {override && (
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  override.granted
                                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                }`}
                              >
                                {override.granted ? "Diberikan" : "Dibatasi"}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(perm)}
                            disabled={busy}
                            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
                            style={{
                              backgroundColor: effective ? "#16a34a" : "#d1d5db",
                            }}
                          >
                            {busy && (
                              <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-white" />
                            )}
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                busy ? "opacity-0" : ""
                              } ${effective ? "translate-x-[26px]" : "translate-x-[3px]"}`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Branch assignment editor */}
      {isCallerOwner && !isOwner && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Penugasan Cabang
            </h2>
          </div>
          <div className="space-y-3 p-4">
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <select
                value={form.branchId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, branchId: e.target.value }))
                }
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              >
                <option value="">Semua cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleSaveBranch}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan Cabang
            </button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      {isCallerOwner && !isOwner && !isCurrentUser && (
        <div className="rounded-xl border border-red-200 dark:border-red-800">
          <div className="border-b border-red-200 px-4 py-3 dark:border-red-800">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Zona Berbahaya
            </h2>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-xs text-neutral-500">
              Nonaktifkan anggota ini dari tenant. Anggota tidak akan bisa login ke tenant ini lagi.
            </p>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {removing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              Nonaktifkan Anggota
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
