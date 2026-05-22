"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Store, MapPin, Phone, Mail, ArrowLeft, Loader2, Ban } from "lucide-react";
import { useBranchStore } from "@/store/branch-store";
import { updateBranch, deactivateBranch } from "@/lib/branch/branch-actions";
import { toast } from "sonner";

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.id as string;
  const { branches, loadBranches } = useBranchStore();

  const branch = branches.find((b) => b.id === branchId);

  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name,
        address: branch.address ?? "",
        phone: branch.phone ?? "",
        email: branch.email ?? "",
      });
    }
  }, [branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await updateBranch(branchId, {
      name: form.name,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
    });

    if (res.success) {
      toast.success("Cabang berhasil diperbarui.");
      if (branch?.tenantId) await loadBranches(branch.tenantId);
      router.push("/branches");
    } else {
      setError(res.error ?? "Gagal memperbarui cabang.");
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("Nonaktifkan cabang ini? Cabang utama tidak bisa dinonaktifkan.")) return;
    setDeactivating(true);
    setError(null);

    const res = await deactivateBranch(branchId);
    if (res.success) {
      toast.success("Cabang dinonaktifkan.");
      if (branch?.tenantId) await loadBranches(branch.tenantId);
      router.push("/branches");
    } else {
      setError(res.error ?? "Gagal menonaktifkan cabang.");
      setDeactivating(false);
    }
  };

  if (!branch) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

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
            Edit Cabang
          </h1>
          <p className="text-xs text-neutral-500">{branch.code}</p>
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
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              required
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
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Menyimpan..." : "Simpan"}
          </button>

          {!branch.isMain && (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {deactivating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
              Nonaktifkan
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
