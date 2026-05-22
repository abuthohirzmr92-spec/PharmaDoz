"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, MapPin, Phone, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useBranchStore } from "@/store/branch-store";
import { createBranch } from "@/lib/branch/branch-actions";
import { toast } from "sonner";

export default function CreateBranchPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;
  const { loadBranches } = useBranchStore();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    setError(null);

    const res = await createBranch({
      tenantId,
      name: form.name,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
    });

    if (res.success) {
      toast.success("Cabang berhasil dibuat.");
      await loadBranches(tenantId);
      router.push("/branches");
    } else {
      setError(res.error ?? "Gagal membuat cabang.");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/branches")}
          className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-5 w-5 text-neutral-500" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Tambah Cabang
          </h1>
          <p className="text-xs text-neutral-500">Buat cabang apotek baru</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Nama Cabang</label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nama cabang baru"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              required
              minLength={2}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Alamat</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Alamat cabang"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Telepon</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Nomor telepon cabang"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email cabang"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            "Simpan Cabang"
          )}
        </button>
      </form>
    </div>
  );
}
