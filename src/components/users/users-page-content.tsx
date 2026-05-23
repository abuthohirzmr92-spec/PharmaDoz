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
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  listTenantMembers,
  removeMember,
  type TenantMember,
} from "@/lib/tenant/members";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

export function UsersPageContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const can = useAuthStore((s) => s.can);

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);

    const res = await listTenantMembers(tenantId);
    if (res.success && res.members) {
      setMembers(res.members);
    } else {
      setError(res.error ?? "Gagal memuat daftar pengguna.");
    }
    setIsLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRemove = async (member: TenantMember) => {
    if (!tenantId) return;
    if (!confirm(`Nonaktifkan ${member.displayName} dari tenant?`)) return;

    setRemovingId(member.id);
    const res = await removeMember(member.id, tenantId);
    if (res.success) {
      toast.success(`${member.displayName} dinonaktifkan.`);
      loadMembers();
    } else {
      toast.error(res.error ?? "Gagal menonaktifkan pengguna.");
    }
    setRemovingId(null);
  };

  const canInvite = can("tenant.users.invite");

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
      ) : members.length === 0 ? (
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
        <div className="space-y-2">
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
    </div>
  );
}
