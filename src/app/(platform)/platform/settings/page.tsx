"use client";

import { useEffect, useState, useRef } from "react";
import { Container } from "@/components/shared/container";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Upload, Save, Loader2, CheckCircle2, X, Image, Monitor, Globe, Store } from "lucide-react";
import { usePlatformBrandingStore } from "@/store/platform-branding-store";
import { useAuthStore } from "@/store/auth-store";

/* ------------------------------------------------------------------ */
/*  Logo upload card component                                         */
/* ------------------------------------------------------------------ */

function LogoUploadCard({
  label,
  description,
  recommendation,
  value,
  field,
  isUploading,
  onUpload,
  onRemove,
}: {
  label: string;
  description: string;
  recommendation: string;
  value: string;
  field: string;
  isUploading: string | null;
  onUpload: (file: File, field: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
          {value ? (
            <img src={value} alt={label} className="max-h-full max-w-full object-contain rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <Image className="h-6 w-6 text-neutral-300" />
          )}
        </div>

        {/* Info & Actions */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{label}</h3>
          <p className="text-xs text-neutral-500">{description}</p>
          <p className="mt-0.5 text-[11px] text-neutral-400">{recommendation}</p>

          <div className="mt-2 flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
              {isUploading === field ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {value ? "Ganti" : "Upload"}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, field); }} />
            </label>
            {value && (
              <button onClick={onRemove}
                className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function PlatformBrandingPage() {
  const { settings, loadSettings } = usePlatformBrandingStore();
  const user = useAuthStore((s) => s.user);

  const [appName, setAppName] = useState("Medisync");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isUploading, setIsUploading] = useState<string | null>(null);

  // Store initial values for reset
  const initialRef = useRef({ appName: "Medisync", tagline: "", logoUrl: "", sidebarLogoUrl: "", faviconUrl: "" });

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      const vals = {
        appName: settings.appName || "Medisync",
        tagline: settings.tagline || "",
        logoUrl: settings.logoUrl || "",
        sidebarLogoUrl: settings.sidebarLogoUrl || "",
        faviconUrl: settings.faviconUrl || "",
      };
      setAppName(vals.appName);
      setTagline(vals.tagline);
      setLogoUrl(vals.logoUrl);
      setSidebarLogoUrl(vals.sidebarLogoUrl);
      setFaviconUrl(vals.faviconUrl);
      initialRef.current = vals;
    }
  }, [settings]);

  const handleReset = () => {
    const v = initialRef.current;
    setAppName(v.appName);
    setTagline(v.tagline);
    setLogoUrl(v.logoUrl);
    setSidebarLogoUrl(v.sidebarLogoUrl);
    setFaviconUrl(v.faviconUrl);
    setSaveState("idle");
  };

  const hasChanges =
    appName !== initialRef.current.appName ||
    tagline !== initialRef.current.tagline ||
    logoUrl !== initialRef.current.logoUrl ||
    sidebarLogoUrl !== initialRef.current.sidebarLogoUrl ||
    faviconUrl !== initialRef.current.faviconUrl;

  const handleUpload = async (file: File, field: string) => {
    if (!isSupabaseConnected()) { toast.error("Database tidak terhubung."); return; }
    setIsUploading(field);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      if (!supabase) throw new Error("Not connected");
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${field}-${timestamp}.${ext}`;
      console.log("[UPLOAD]", { field, fileName });
      const { error } = await supabase.storage.from("platform-assets").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("platform-assets").getPublicUrl(fileName);
      console.log("[UPLOAD] publicUrl:", publicUrl);
      const url = `${publicUrl}?t=${timestamp}`;
      if (field === "logo") setLogoUrl(url);
      else if (field === "sidebar_logo") setSidebarLogoUrl(url);
      else if (field === "favicon") setFaviconUrl(url);
      toast.success("File berhasil diupload.");
      setTimeout(() => handleSave(), 200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal upload.");
    } finally { setIsUploading(null); }
  };

  const handleSave = async () => {
    if (!isSupabaseConnected()) { toast.error("Database tidak terhubung."); return; }
    setIsSaving(true);
    setSaveState("saving");
    try {
      const { supabase } = await import("@/lib/supabase/client");
      if (!supabase) throw new Error("Not connected");
      const db = supabase as any;

      const existing = await db.from("platform_settings").select("id").limit(1).maybeSingle();
      const payload = { app_name: appName || null, tagline: tagline || null, logo_url: logoUrl || null, sidebar_logo_url: sidebarLogoUrl || null, favicon_url: faviconUrl || null, updated_by: user?.id ?? null, updated_at: new Date().toISOString() };

      if (existing?.data?.id) {
        const { error } = await db.from("platform_settings").update(payload).eq("id", existing.data.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("platform_settings").insert(payload);
        if (error) throw error;
      }

      await loadSettings();
      if (faviconUrl) {
        const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (link) link.href = faviconUrl;
      }
      setSaveState("saved");
      toast.success("Pengaturan berhasil disimpan.");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveState("error");
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally { setIsSaving(false); }
  };

  const displayName = appName || "Medisync";
  const displayTagline = tagline || "Modern Pharmacy Management System";

  return (
    <Container>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Pengaturan Platform</h1>
        <p className="mt-1 text-sm text-neutral-500">Atur identitas dan tampilan aplikasi Medisync di seluruh platform.</p>
      </div>

      <div className="max-w-3xl space-y-6 pb-24">
        {/* ── SECTION 1: IDENTITAS APLIKASI ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Identitas Aplikasi</h2>
              <p className="text-xs text-neutral-500">Informasi ini ditampilkan pada halaman login, title browser, dan area platform.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nama Aplikasi</label>
              <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)}
                placeholder="Medisync"
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tagline</label>
              <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
                placeholder="Modern Pharmacy Management System"
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
            </div>
          </div>
        </section>

        {/* ── SECTION 2: LOGO & IKON ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Image className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Logo & Ikon</h2>
              <p className="text-xs text-neutral-500">Aset visual yang digunakan di seluruh platform.</p>
            </div>
          </div>

          <div className="space-y-3">
            <LogoUploadCard
              label="Logo Utama"
              description="Ditampilkan pada halaman login."
              recommendation="Rekomendasi: PNG transparan, 512×512px"
              value={logoUrl} field="logo" isUploading={isUploading}
              onUpload={handleUpload} onRemove={() => setLogoUrl("")}
            />
            <LogoUploadCard
              label="Logo Sidebar"
              description="Ditampilkan pada sidebar Platform Admin."
              recommendation="Rekomendasi: PNG, 64×64px"
              value={sidebarLogoUrl} field="sidebar_logo" isUploading={isUploading}
              onUpload={handleUpload} onRemove={() => setSidebarLogoUrl("")}
            />
            <LogoUploadCard
              label="Favicon"
              description="Ditampilkan pada tab browser."
              recommendation="Rekomendasi: PNG/ICO, 32×32px"
              value={faviconUrl} field="favicon" isUploading={isUploading}
              onUpload={handleUpload} onRemove={() => setFaviconUrl("")}
            />
          </div>
        </section>

        {/* ── SECTION 3: TAMPILAN LOGIN ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Tampilan Login</h2>
              <p className="text-xs text-neutral-500">Halaman login selalu menggunakan branding platform Medisync.</p>
            </div>
          </div>

          {/* Login Page Mockup */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 dark:border-neutral-700 dark:bg-neutral-900/50">
            <div className="flex flex-col items-center gap-4">
              {/* Logo */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-2xl font-bold">M</span>
                )}
              </div>
              {/* Name + Tagline */}
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{displayName}</p>
                <p className="text-sm text-neutral-500">{displayTagline}</p>
              </div>
              {/* Mock login form */}
              <div className="w-full max-w-[280px] space-y-2">
                <div className="h-9 rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900" />
                <div className="h-9 rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900" />
                <div className="h-9 rounded-lg bg-brand-600" />
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: LIVE PREVIEW ── */}
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Preview</h2>
              <p className="text-xs text-neutral-500">Pratinjau branding di berbagai area platform.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Login */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="text-[11px] font-medium text-neutral-400 mb-2">Halaman Login</p>
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                  {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain" /> : "M"}
                </div>
                <p className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">{displayName}</p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="text-[11px] font-medium text-neutral-400 mb-2">Sidebar Platform</p>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-white text-[8px] font-bold">
                  {sidebarLogoUrl ? <img src={sidebarLogoUrl} alt="" className="h-full w-full object-contain" /> : "M"}
                </div>
                <p className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">{displayName}</p>
              </div>
            </div>

            {/* Browser Tab */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="text-[11px] font-medium text-neutral-400 mb-2">Tab Browser</p>
              <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-brand-600 text-[6px] font-bold text-white">
                  {faviconUrl ? <img src={faviconUrl} alt="" className="h-full w-full object-contain" /> : "M"}
                </div>
                <p className="text-[9px] text-neutral-600 dark:text-neutral-400 truncate">{displayName}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            {saveState === "saved" ? (
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Berhasil disimpan</span>
            ) : saveState === "saving" ? (
              <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</span>
            ) : saveState === "error" ? (
              <span className="text-red-500">Gagal menyimpan</span>
            ) : hasChanges ? (
              "Perubahan belum disimpan"
            ) : (
              "Semua perubahan tersimpan"
            )}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} disabled={!hasChanges || isSaving}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
              Reset
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
}
