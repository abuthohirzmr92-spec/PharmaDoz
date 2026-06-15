"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/shared/container";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Upload, Save, Loader2 } from "lucide-react";
import { usePlatformBrandingStore } from "@/store/platform-branding-store";
import { useAuthStore } from "@/store/auth-store";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export default function PlatformBrandingPage() {
  const { settings, loadSettings } = usePlatformBrandingStore();
  const user = useAuthStore((s) => s.user);

  const [appName, setAppName] = useState("Apotek Manage");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      if (settings.appName) setAppName(settings.appName);
      if (settings.tagline) setTagline(settings.tagline);
      if (settings.logoUrl) setLogoUrl(settings.logoUrl);
      if (settings.sidebarLogoUrl) setSidebarLogoUrl(settings.sidebarLogoUrl);
      if (settings.faviconUrl) setFaviconUrl(settings.faviconUrl);
    }
  }, [settings]);

  const handleUpload = async (file: File, field: string) => {
    if (!isSupabaseConnected()) {
      toast.error("Database tidak terhubung.");
      return;
    }

    setIsUploading(field);

    try {
      const { supabase } = await import("@/lib/supabase/client");
      if (!supabase) throw new Error("Not connected");

      const ext = file.name.split(".").pop() || "png";
      const fileName = `${field}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("platform-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("platform-assets").getPublicUrl(fileName);

      const url = `${publicUrl}?t=${Date.now()}`;

      if (field === "logo") setLogoUrl(url);
      else if (field === "sidebar_logo") setSidebarLogoUrl(url);
      else if (field === "favicon") setFaviconUrl(url);

      toast.success("File berhasil diupload.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal upload file.");
    } finally {
      setIsUploading(null);
    }
  };

  const handleSave = async () => {
    if (!isSupabaseConnected()) {
      toast.error("Database tidak terhubung.");
      return;
    }

    setIsSaving(true);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      if (!supabase) throw new Error("Not connected");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      const existing = await db
        .from("platform_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      const payload = {
        app_name: appName || null,
        tagline: tagline || null,
        logo_url: logoUrl || null,
        sidebar_logo_url: sidebarLogoUrl || null,
        favicon_url: faviconUrl || null,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      const existingId = existing.data?.id as string | undefined;

      if (existingId) {
        const { error } = await db
          .from("platform_settings")
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("platform_settings")
          .insert(payload);
        if (error) throw error;
      }

      // Reload store
      await loadSettings();

      // Update favicon in DOM
      if (faviconUrl) {
        const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (link) link.href = faviconUrl;
      }

      toast.success("Branding berhasil disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan branding.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Pengaturan Platform
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Atur nama, logo, dan tampilan aplikasi Medisync di seluruh platform.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* App Name */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Nama Aplikasi
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Default: Apotek Manage. Tampil di halaman login, title bar, dan sidebar.
          </p>
        </div>

        {/* Tagline */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            placeholder="Modern Pharmacy Management System"
          />
        </div>

        {/* Logo Uploads */}
        {[
          { label: "Logo Utama", field: "logo", value: logoUrl, desc: "Tampil di halaman login. Disarankan: PNG, 512×512." },
          { label: "Logo Sidebar", field: "sidebar_logo", value: sidebarLogoUrl, desc: "Tampil di sidebar. Disarankan: PNG, 64×64." },
          { label: "Favicon", field: "favicon", value: faviconUrl, desc: "Icon browser tab. Disarankan: ICO atau PNG, 32×32." },
        ].map((item) => (
          <div key={item.field} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {item.label}
            </label>
            <p className="text-xs text-neutral-400">{item.desc}</p>

            <div className="mt-3 flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
                {isUploading === item.field ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, item.field);
                  }}
                />
              </label>

              {item.value && (
                <div className="flex items-center gap-2">
                  <img
                    src={item.value}
                    alt={item.label}
                    className="h-10 w-10 rounded-lg border object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <button
                    onClick={() => {
                      if (item.field === "logo") setLogoUrl("");
                      else if (item.field === "sidebar_logo") setSidebarLogoUrl("");
                      else setFaviconUrl("");
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Preview */}
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/50">
          <h3 className="text-sm font-medium text-neutral-500">Preview</h3>
          <div className="mt-3 space-y-2">
            <p className="text-xs text-neutral-400">
              App Name: <span className="text-neutral-700 dark:text-neutral-300">{appName || "Apotek Manage"}</span>
            </p>
            <p className="text-xs text-neutral-400">
              Tagline: <span className="text-neutral-700 dark:text-neutral-300">{tagline || "(default)"}</span>
            </p>
            <p className="text-xs text-neutral-400">
              Logo: {logoUrl ? <span className="text-green-600">✓ Tersimpan</span> : <span className="text-neutral-400">—</span>}
            </p>
            <p className="text-xs text-neutral-400">
              Sidebar Logo: {sidebarLogoUrl ? <span className="text-green-600">✓ Tersimpan</span> : <span className="text-neutral-400">—</span>}
            </p>
            <p className="text-xs text-neutral-400">
              Favicon: {faviconUrl ? <span className="text-green-600">✓ Tersimpan</span> : <span className="text-neutral-400">—</span>}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Branding
        </button>
      </div>
    </Container>
  );
}
