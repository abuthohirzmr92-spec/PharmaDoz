"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Shield, ExternalLink, Save, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useTenantBranding } from "@/providers/tenant-brand-provider";
import { isTenantOwner } from "@/lib/auth/permissions";
import { isSupabaseConnected } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSystemUser = useAuthStore((s) => s.isSystemUser());
  const canViewSettings = usePermission("settings.view");
  const canEditSettings = usePermission("settings.edit");
  const { branding } = useTenantBranding();

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 150 * 1024; // 150 KB

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Hanya menerima JPG, PNG, atau WebP.");
      return;
    }
    // Validate size
    if (file.size > MAX_SIZE) {
      setUploadError("Ukuran file maksimal 150 KB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).supabase;
      if (!supabase) throw new Error("Storage tidak tersedia.");

      const tenantId = user?.tenantId;
      if (!tenantId) throw new Error("Tenant tidak ditemukan.");

      const ext = file.name.split(".").pop() ?? "png";
      const filePath = `${tenantId}/logo.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("tenant-assets")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("tenant-assets")
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast.success("Logo berhasil diupload.");
    } catch (err: any) {
      setUploadError(err?.message ?? "Gagal mengupload logo.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (branding) {
      console.log("RENDER_LOGO_URL", branding.logoUrl);
      setCompanyName(branding.companyName ?? "");
      setLogoUrl(branding.logoUrl ?? "");
      setAddress(branding.address ?? "");
      setPhone(branding.phone ?? "");
      setReceiptFooter(branding.receiptFooter ?? "");
    }
  }, [branding]);

  if (!canViewSettings) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-neutral-700">Akses Ditolak</h2>
        <p className="max-w-xs text-sm text-neutral-500">Anda tidak memiliki izin untuk mengakses halaman Settings.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!canEditSettings) {
      toast.error("Anda tidak memiliki izin mengubah pengaturan.");
      return;
    }
    setSaving(true);
    setSaved(false);

    try {
      const supabase = (await import("@/lib/supabase/client")).supabase;
      if (!supabase) throw new Error("Database tidak tersedia.");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = supabase;

      // MERGE — read current settings first, then overlay new values
      const { data: current } = await db
        .from("tenants")
        .select("settings")
        .eq("id", user?.tenantId)
        .single();

      const existing = (current?.settings ?? {}) as Record<string, unknown>;

      const merged = {
        ...existing,
        company_name: companyName || null,
        logo_url: logoUrl || null,
        address: address || null,
        phone: phone || null,
        receipt_footer: receiptFooter || null,
      };

      const { error } = await db
        .from("tenants")
        .update({ settings: merged })
        .eq("id", user?.tenantId);

      if (error) throw error;

      setSaved(true);
      toast.success("Pengaturan berhasil disimpan.");

      // Refresh page to re-fetch tenant data (branding provider reads from fresh DB)
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Pengaturan</h1>
        <p className="mt-1 text-sm text-neutral-500">Konfigurasi identitas apotek dan pengaturan sistem</p>
      </div>

      {/* Branding Form */}
      {canEditSettings && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Identitas Apotek</h2>
              <p className="text-xs text-neutral-500">Tampil di struk, dashboard, dan laporan</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nama Apotek</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder={user?.pharmacyName ?? "Contoh: Apotek Sehat"}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Upload Logo</label>
              <div className="mt-1 flex items-center gap-3">
                <label className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  {uploading ? "Mengupload..." : "Pilih File"}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleLogoUpload} disabled={uploading}
                    className="hidden" />
                </label>
                {logoUrl && (
                  <button type="button" onClick={() => setLogoUrl("")}
                    className="text-xs text-red-500 hover:text-red-700">Hapus</button>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-400">JPG, PNG, atau WebP — maksimal 150 KB.</p>
              {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
              {/* DEBUG */ undefined}
              {logoUrl && (
                <div className="mt-2 flex h-16 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900">
                  <img src={logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain"
                    onError={(e) => { console.error("LOGO_LOAD_ERROR", (e.target as HTMLImageElement).src); }} />
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Alamat</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                placeholder="Jl. Merdeka No. 123, Jakarta"
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Telepon</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-3456-7890"
                className="mt-1 block w-full max-w-[250px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>

            {/* Receipt Footer */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Footer Struk</label>
              <input type="text" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan"
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan Pengaturan"}
          </button>
        </div>
      )}

      {/* System roles: Platform link */}
      {isSystemUser && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
              <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-200">Platform Administration</h3>
              <p className="text-xs text-brand-600 dark:text-brand-400">Kelola seluruh apotek, pengguna, dan persetujuan cabang</p>
            </div>
          </div>
          <button onClick={() => router.push("/admin")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-300 dark:hover:bg-brand-800">
            <ExternalLink className="h-4 w-4" />Buka Platform Admin
          </button>
        </div>
      )}
    </div>
  );
}
