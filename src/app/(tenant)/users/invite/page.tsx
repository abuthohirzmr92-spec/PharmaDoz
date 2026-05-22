"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mail, Shield, Copy, CheckCircle2, Store } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { inviteUser } from "@/lib/invitation/invite";
import { TENANT_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { toast } from "sonner";

export default function InviteUserPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    email: "",
    role: "staff" as string,
    branchId: "",
  });

  // Filter peran yang bisa di-invite (bukan tenant_owner atau system roles)
  const invitableRoles = TENANT_ROLES.filter((r) => r !== "tenant_owner");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    setError(null);
    setInviteLink(null);

    const res = await inviteUser({
      tenantId,
      email: form.email,
      role: form.role as "admin" | "pharmacist" | "cashier" | "staff",
      branchId: form.branchId || undefined,
    });

    if (res.success && res.token) {
      const link = `${window.location.origin}/invite/accept?token=${res.token}`;
      setInviteLink(link);
      toast.success("Undangan berhasil dibuat.");
    } else {
      setError(res.error ?? "Gagal membuat undangan.");
    }

    setSaving(false);
  };

  const copyToClipboard = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link disalin ke clipboard.");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
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
            Undang Pengguna
          </h1>
          <p className="text-xs text-neutral-500">Kirim undangan ke staf apotek</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {inviteLink ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Undangan berhasil dibuat
              </p>
            </div>
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">
              Bagikan link di bawah ini ke {form.email}. Link berlaku selama 7 hari.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
              Link Undangan
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-white px-3 py-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {inviteLink}
              </code>
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 transition"
              >
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Disalin" : "Salin"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setInviteLink(null);
              setForm({ email: "", role: "staff", branchId: "" });
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
          >
            Undang Pengguna Lain
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="staf@apotek.com"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Peran
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              >
                {invitableRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Cabang (opsional)
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={form.branchId}
                onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                placeholder="ID cabang — kosongkan untuk akses semua"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Untuk peran farmasis/kasir/staf, isi ID cabang untuk membatasi akses ke cabang tertentu.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Membuat Undangan..." : "Buat Undangan"}
          </button>
        </form>
      )}
    </div>
  );
}
