"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Shield,
  UserPlus,
  Loader2,
  ChevronRight,
  Circle,
  Ban,
  Mail,
  Clock,
  Copy,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  listTenantMembers,
  removeMember,
  type TenantMember,
} from "@/lib/tenant/members";
import {
  listInvitations,
  resendInvitation,
  type TenantInvitation,
} from "@/lib/invitation/invite";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

export function UsersPageContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const can = useAuthStore((s) => s.can);

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);

    const [memberRes, inviteRes] = await Promise.all([
      listTenantMembers(tenantId),
      listInvitations(tenantId),
    ]);

    if (memberRes.success && memberRes.members) {
      setMembers(memberRes.members);
    } else {
      setError(memberRes.error ?? "Gagal memuat daftar pengguna.");
    }

    if (inviteRes.success && inviteRes.invitations) {
      setInvitations(inviteRes.invitations);
    }

    setIsLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemove = async (member: TenantMember) => {
    if (!tenantId) return;
    if (!confirm(`Nonaktifkan ${member.displayName} dari tenant?`)) return;

    setRemovingId(member.id);
    const res = await removeMember(member.id, tenantId);
    if (res.success) {
      toast.success(`${member.displayName} dinonaktifkan.`);
      loadData();
    } else {
      toast.error(res.error ?? "Gagal menonaktifkan pengguna.");
    }
    setRemovingId(null);
  };

  const handleResend = async (invitation: TenantInvitation) => {
    if (!tenantId) return;

    setResendingId(invitation.id);
    const res = await resendInvitation(invitation.id, tenantId);
    if (res.success && res.token) {
      const link = `${window.location.origin}/invite/accept?token=${res.token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link undangan baru disalin ke clipboard.");
      loadData();
    } else {
      toast.error(res.error ?? "Gagal mengirim ulang undangan.");
    }
    setResendingId(null);
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/accept?token=${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link undangan disalin ke clipboard.");
  };

  const canInvite = can("tenant.users.invite");

  // Split invitations: pending/expired (not yet accepted), used (already members)
  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "pending" || inv.status === "expired",
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Pengguna
            </h1>
            <p className="text-xs text-neutral-500">
              Kelola anggota tim di tenant ini
            </p>
          </div>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => router.push("/users/invite")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Undang
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : members.length === 0 && pendingInvitations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Users className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500">Belum ada anggota tim</p>
          {canInvite && (
            <button
              type="button"
              onClick={() => router.push("/users/invite")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Undang Anggota
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Anggota Aktif */}
          {members.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Anggota ({members.length})
              </h3>
              {members.map((member) => {
                const isCurrentUser = member.userId === user?.id;
                const isOwner = member.role === "tenant_owner";
                return (
                  <div
                    key={member.id}
                    className={cn(
                      "rounded-xl border bg-white transition-colors dark:bg-neutral-900",
                      isCurrentUser
                        ? "border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/20"
                        : "border-neutral-200 dark:border-neutral-700",
                    )}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                            {member.displayName}
                            {isCurrentUser && (
                              <span className="ml-1 text-[10px] text-neutral-400">
                                (Anda)
                              </span>
                            )}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                              isOwner
                                ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
                            )}
                          >
                            {ROLE_LABELS[member.role]}
                          </span>
                          {!member.isActive && (
                            <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                          {member.branchName && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {member.branchName}
                              {member.branchCode && (
                                <span className="font-mono text-[10px]">
                                  ({member.branchCode})
                                </span>
                              )}
                            </span>
                          )}
                          {!member.branchName && !isOwner && (
                            <span className="text-neutral-300">Semua cabang</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Circle
                          className={cn(
                            "h-2 w-2 fill-current",
                            member.isActive
                              ? "text-green-500"
                              : "text-neutral-300 dark:text-neutral-600",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => router.push(`/users/${member.id}`)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          Detail
                          <ChevronRight className="h-3 w-3" />
                        </button>
                        {canInvite && !isOwner && !isCurrentUser && (
                          <button
                            type="button"
                            onClick={() => handleRemove(member)}
                            disabled={removingId === member.id}
                            className="rounded-lg p-1 text-neutral-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                            title="Nonaktifkan anggota"
                          >
                            {removingId === member.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Undangan Pending / Kedaluwarsa */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Undangan ({pendingInvitations.length})
              </h3>
              {pendingInvitations.map((inv) => {
                const isExpired = inv.status === "expired";
                return (
                  <div
                    key={inv.id}
                    className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {inv.email}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                              isExpired
                                ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            )}
                          >
                            {isExpired ? "Kedaluwarsa" : "Menunggu"}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            {ROLE_LABELS[inv.role]}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                          {isExpired ? (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Kadaluarsa {new Date(inv.expiresAt).toLocaleDateString("id-ID")}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Berlaku hingga {new Date(inv.expiresAt).toLocaleDateString("id-ID")}
                            </span>
                          )}
                          {inv.branchName && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {inv.branchName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(inv.token)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title="Salin link undangan"
                        >
                          <Copy className="h-3 w-3" />
                          Salin
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResend(inv)}
                          disabled={resendingId === inv.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1.5 text-[11px] font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                          title="Kirim ulang undangan"
                        >
                          {resendingId === inv.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Kirim Ulang
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
