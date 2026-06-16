"use client";

import { useState } from "react";
import { User, Mail, Phone, Save, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth-store";
import { usePlatformBrandingStore } from "@/store/platform-branding-store";
import { isSupabaseConnected } from "@/lib/supabase/client";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const refreshUserProfile = useAuthStore((s) => s.refreshUserProfile);
  const branding = usePlatformBrandingStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Nama tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    try {
      if (isSupabaseConnected()) {
        const { supabase } = await import("@/lib/supabase/client");
        if (supabase) {
          const { error } = await supabase.auth.updateUser({
            data: { display_name: displayName.trim(), phone: phone.trim() || null },
          });
          if (error) throw error;
        }
      }

      // Refresh local profile
      await refreshUserProfile();

      setIsDone(true);
      toast.success("Profil berhasil disimpan.");
      setTimeout(() => setIsDone(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Informasi Profil</h2>
          <p className="text-xs text-neutral-500">Data diri Anda di {branding.getAppName()}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Nama Lengkap
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="Nama lengkap Anda"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-3 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">Email tidak dapat diubah. Hubungi admin untuk perubahan.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Nomor Telepon
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="+62..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
            isDone
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
              : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50",
          )}
        >
          {isDone ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Tersimpan
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Simpan Perubahan
            </>
          )}
        </button>
      </div>
    </div>
  );
}
