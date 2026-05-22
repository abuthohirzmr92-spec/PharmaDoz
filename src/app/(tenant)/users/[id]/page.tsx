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
