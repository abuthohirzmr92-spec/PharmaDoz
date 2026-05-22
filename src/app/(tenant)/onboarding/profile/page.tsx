"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Phone, Mail, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { savePharmacyProfile } from "@/lib/tenant/onboarding-state";
import { useTenantContext } from "@/providers/tenant-provider";

export default function ProfileStep() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { state, advance } = useOnboardingStore();
  const { tenant } = useTenantContext();
  const tenantId = user?.tenantId;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: tenant?.name ?? "",
    address: "",
    phone: "",
    email: user?.email ?? "",
  });

  // Pre-fill from onboarding data if resuming
  useEffect(() => {
    if (state?.data.profile_setup) {
      const saved = state.data.profile_setup as Record<string, unknown>;
      setForm((prev) => ({
        name: (saved.name as string) ?? prev.name,
        address: (saved.address as string) ?? prev.address,
        phone: (saved.phone as string) ?? prev.phone,
        email: (saved.email as string) ?? prev.email,
      }));
    }
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    setError(null);

    try {
      const res = await savePharmacyProfile(tenantId, {
        name: form.name,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });

      if (!res.success) {
        setError(res.error ?? "Gagal menyimpan profil.");
        setSaving(false);
        return;
      }

      const ok = await advance(tenantId, "profile_setup", form);
      if (ok) {
        router.push("/onboarding/branch");
      } else {
        setError("Gagal melanjutkan ke langkah berikutnya.");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Profil Apotek</h2>
        <p className="text-sm text-neutral-500">Lengkapi informasi apotek Anda.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Nama Apotek</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
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
              placeholder="Alamat lengkap apotek"
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
              placeholder="Nomor telepon apotek"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Email Apotek</label>
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
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/onboarding/welcome")}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Menyimpan..." : "Lanjut"}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
