"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Mail, Phone, Save, Loader2, CheckCircle2, Lock, Monitor, Palette, Shield, Building2, Hash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth-store";
import { usePlatformBrandingStore } from "@/store/platform-branding-store";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { AppCard } from "@/components/ui/app-card";
import { AppBadge } from "@/components/ui/app-badge";

const ACCOUNT_TABS = [
  { label: "Profil", href: "/settings/account", icon: User },
  { label: "Keamanan", href: "/settings/account/security", icon: Lock },
  { label: "Session", href: "/settings/account/session", icon: Monitor },
  { label: "Tema", href: "/settings/account/theme", icon: Palette },
];

export default function ProfilePage() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const refreshUserProfile = useAuthStore((s) => s.refreshUserProfile);
  const branding = usePlatformBrandingStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) { toast.error("Nama tidak boleh kosong."); return; }
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
      await refreshUserProfile();
      setIsDone(true);
      toast.success("Profil berhasil disimpan.");
      setTimeout(() => setIsDone(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Account sub-tabs */}
      <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
        {ACCOUNT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href}
              className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300")}>
              <Icon className="h-4 w-4" />{tab.label}
            </Link>
          );
        })}
      </div>

      {/* Profile Header */}
      <AppCard variant="elevated">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-600 dark:bg-brand-900 dark:text-brand-400">
            {user?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
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
    </div>
  );
}
