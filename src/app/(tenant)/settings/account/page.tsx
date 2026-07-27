"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Save, Loader2, CheckCircle2, Shield, Building2, LogOut, Languages, Globe, Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth-store";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { AppCard } from "@/components/ui/app-card";
import { AppBadge } from "@/components/ui/app-badge";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { uploadAvatar, removeAvatar } from "@/lib/storage/avatar-storage";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const refreshUserProfile = useAuthStore((s) => s.refreshUserProfile);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Avatar — holds the selected File for P0.6 upload (page owns business logic)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleAvatarChange = useCallback((file: File | null) => {
    setAvatarFile(file);
  }, []);

  const handleSave = async () => {
    if (!displayName.trim()) { toast.error("Nama tidak boleh kosong."); return; }
    setIsSaving(true);

    let newAvatarUrl: string | undefined;
    const oldAvatarUrl = user?.avatarUrl ?? null;

    try {
      if (isSupabaseConnected()) {
        const { supabase } = await import("@/lib/supabase/client");
        if (supabase && user?.id) {
          // -------------------------------------------------------------------
          // Avatar upload (only on Save, not on file select)
          // -------------------------------------------------------------------
          if (avatarFile) {
            newAvatarUrl = await uploadAvatar(user.id, avatarFile);
          }

          // -------------------------------------------------------------------
          // Update profile metadata
          // -------------------------------------------------------------------
          const profileUpdate: Record<string, unknown> = {
            display_name: displayName.trim(),
            phone: phone.trim() || null,
            updated_at: new Date().toISOString(),
          };
          if (newAvatarUrl) {
            profileUpdate.avatar_url = newAvatarUrl;
          }

          // Update auth.users metadata
          const { error: authErr } = await supabase.auth.updateUser({
            data: profileUpdate,
          });
          if (authErr) {
            // Profile update failed — clean up newly uploaded file
            if (newAvatarUrl) {
              try { await removeAvatar(newAvatarUrl); } catch { /* best-effort */ }
            }
            throw authErr;
          }

          // Update profiles table
          const { error: profileErr } = await (supabase as any)
            .from("profiles")
            .upsert({ id: user.id, ...profileUpdate }, { onConflict: "id" });

          if (profileErr) {
            // Profile update failed — clean up newly uploaded file
            if (newAvatarUrl) {
              try { await removeAvatar(newAvatarUrl); } catch { /* best-effort */ }
            }
            throw profileErr;
          }

          // -------------------------------------------------------------------
          // Remove old avatar (only after successful update)
          // -------------------------------------------------------------------
          if (newAvatarUrl && oldAvatarUrl) {
            try { await removeAvatar(oldAvatarUrl); } catch { /* best-effort cleanup */ }
          }
        }
      }

      await refreshUserProfile();
      setIsDone(true);
      toast.success("Profil berhasil disimpan.");
      setTimeout(() => setIsDone(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      // Reset avatar file state after save (success or failure)
      setAvatarFile(null);
      setIsSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------------

  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("Berhasil keluar.");
      router.push("/login");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <AppCard variant="elevated">
        <div className="flex items-start gap-4">
          <AvatarUpload
            imageUrl={user?.avatarUrl}
            name={displayName}
            onChange={handleAvatarChange}
          />
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 truncate">{user?.displayName ?? "—"}</h2>
              <AppBadge variant="success">Aktif</AppBadge>
            </div>
            <p className="text-sm text-neutral-500">{user?.email ?? "—"}</p>
            <p className="text-xs text-neutral-400 mt-0.5 capitalize">{user?.role ?? "—"} · {user?.tenantName ?? user?.pharmacyName ?? "—"}</p>
          </div>
        </div>
      </AppCard>

      {/* Edit Profile Form */}
      <AppCard>
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-brand-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Edit Profil</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" placeholder="Nama lengkap Anda" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input type="email" value={user?.email ?? ""} disabled
                className="w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-3 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400" />
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">Email tidak dapat diubah. Hubungi admin untuk perubahan.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Nomor Telepon</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" placeholder="+62..." />
            </div>
          </div>
          <button type="button" onClick={handleSave} disabled={isSaving}
            className={cn("inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              isDone ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50")}>
            {isDone ? <><CheckCircle2 className="h-4 w-4" />Tersimpan</> : isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4" />Simpan Perubahan</>}
          </button>
        </div>
      </AppCard>

      {/* Account Information */}
      <AppCard>
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-purple-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Informasi Akun</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-neutral-400">Role</p><p className="font-medium capitalize text-neutral-900 dark:text-neutral-50">{user?.role ?? "—"}</p></div>
          <div><p className="text-xs text-neutral-400">Tenant</p><p className="font-medium truncate text-neutral-900 dark:text-neutral-50">{user?.tenantName ?? user?.pharmacyName ?? "—"}</p></div>
          <div><p className="text-xs text-neutral-400">Pharmacy</p><p className="font-medium truncate text-neutral-900 dark:text-neutral-50">{user?.pharmacyName ?? "—"}</p></div>
          <div><p className="text-xs text-neutral-400">User ID</p><p className="font-medium font-mono text-xs text-neutral-500 truncate">{user?.id?.slice(0, 8) ?? "—"}</p></div>
        </div>
      </AppCard>

      {/* Preferensi — Coming Soon */}
      <AppCard>
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Preferensi</h3>
        </div>
        <div className="space-y-2">
          {[
            { icon: Languages, label: "Bahasa", desc: "Pilih bahasa antarmuka aplikasi." },
            { icon: Globe, label: "Timezone", desc: "Zona waktu untuk tanggal & laporan." },
            { icon: Bell, label: "Notifikasi", desc: "Preferensi notifikasi & pengingat." },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3 opacity-70 dark:border-neutral-800">
              <p.icon className="h-4 w-4 text-neutral-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{p.label}</p>
                <p className="text-xs text-neutral-400">{p.desc}</p>
              </div>
              <AppBadge variant="warning">Coming Soon</AppBadge>
            </div>
          ))}
        </div>
      </AppCard>

      {/* Status */}
      <AppCard>
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Status Akun</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2"><AppBadge variant="success">Aktif</AppBadge><span className="text-xs text-neutral-500">Akun aktif</span></div>
          <div className="flex items-center gap-2"><AppBadge variant={isSupabaseConnected() ? "success" : "danger"}>{isSupabaseConnected() ? "Online" : "Offline"}</AppBadge><span className="text-xs text-neutral-500">Supabase</span></div>
        </div>
      </AppCard>

      {/* Logout */}
      <AppCard>
        <div className="mb-3 flex items-center gap-2">
          <LogOut className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Keluar dari Akun</h3>
        </div>
        <p className="mb-3 text-xs text-neutral-500">
          Keluar dari perangkat ini dan kembali ke halaman login.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
            "bg-red-50 text-red-700 hover:bg-red-100",
            "dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900",
            "disabled:opacity-50",
          )}
        >
          {isLoggingOut ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Keluar...</>
          ) : (
            <><LogOut className="h-4 w-4" />Keluar</>
          )}
        </button>
      </AppCard>
    </div>
  );
}
