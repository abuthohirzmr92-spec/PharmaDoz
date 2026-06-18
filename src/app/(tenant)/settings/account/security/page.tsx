"use client";

import { useState } from "react";
import { Lock, Key, Loader2, CheckCircle2, AlertTriangle, Shield, Shuffle, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { isSupabaseConnected } from "@/lib/supabase/client";
import { AppCard } from "@/components/ui/app-card";
import { AppBadge } from "@/components/ui/app-badge";

const RECOMMENDATIONS = [
  { done: true, text: "Gunakan password yang kuat" },
  { done: true, text: "Logout dari perangkat yang tidak digunakan" },
  { done: false, text: "Aktifkan Two-Factor Authentication (2FA)" },
];

export default function SecurityPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");
  const [showChangeForm, setShowChangeForm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.newPassword.length < 6) { setError("Password baru minimal 6 karakter."); return; }
    if (form.newPassword !== form.confirm) { setError("Password baru tidak cocok."); return; }

    setIsSubmitting(true);
    try {
      if (!isSupabaseConnected()) { setError("Database tidak terhubung."); setIsSubmitting(false); return; }
      const { supabase } = await import("@/lib/supabase/client");
      if (!supabase) throw new Error("Not connected");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Session tidak valid.");
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: form.currentPassword });
      if (signInErr) { setError("Password saat ini salah."); setIsSubmitting(false); return; }
      const { error: updateErr } = await supabase.auth.updateUser({ password: form.newPassword });
      if (updateErr) throw updateErr;
      setIsDone(true);
      setShowChangeForm(false);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password berhasil diubah.");
      setTimeout(() => setIsDone(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Password Status */}
      <AppCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Password</h3>
          </div>
          <AppBadge variant="success">Terlindungi</AppBadge>
        </div>
        <p className="text-xs text-neutral-500 mb-3">Password akun Anda aktif dan terlindungi.</p>
        {isDone && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 mb-3">
            <CheckCircle2 className="h-4 w-4" /> Password berhasil diubah.
          </div>
        )}
        {!showChangeForm ? (
          <button onClick={() => setShowChangeForm(true)} className="rounded-lg text-sm font-medium text-amber-600 hover:text-amber-700">
            Ubah Password →
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
              </div>
            )}
            {[
              { label: "Password Saat Ini", key: "currentPassword", icon: Key, autoComplete: "current-password" },
              { label: "Password Baru", key: "newPassword", icon: Lock, placeholder: "Minimal 6 karakter", autoComplete: "new-password", minLength: 6 },
              { label: "Konfirmasi Password", key: "confirm", icon: Lock, placeholder: "Ulangi password baru", autoComplete: "new-password", minLength: 6 },
            ].map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{f.label}</label>
                <div className="relative">
                  <f.icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input type="password" value={form[f.key as keyof typeof form]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={(f as any).placeholder} autoComplete={(f as any).autoComplete}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" required />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button type="submit" disabled={isSubmitting}
                className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition", isSubmitting ? "cursor-not-allowed bg-neutral-300 text-neutral-500" : "bg-amber-600 text-white hover:bg-amber-700")}>
                {isSubmitting ? <><Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />Mengubah...</> : "Simpan Password"}
              </button>
              <button type="button" onClick={() => setShowChangeForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700">
                Batal
              </button>
            </div>
          </form>
        )}
      </AppCard>

      {/* Two-Factor Authentication */}
      <AppCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Two-Factor Authentication</h3>
          </div>
          <AppBadge variant="warning">Coming Soon</AppBadge>
        </div>
        <p className="text-xs text-neutral-500 mb-3">Lapisan keamanan tambahan menggunakan kode OTP.</p>
        <button onClick={() => toast.info("Fitur 2FA akan hadir di rilis berikutnya.")}
          className="rounded-lg text-sm font-medium text-blue-600 opacity-50 cursor-not-allowed">
          Aktifkan 2FA →
        </button>
      </AppCard>

      {/* Login Activity */}
      <AppCard>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-green-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Aktivitas Login</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-neutral-500">Browser</span><span className="font-medium text-neutral-900 dark:text-neutral-50">Chrome Windows</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">IP Address</span><span className="font-medium text-neutral-900 dark:text-neutral-50">192.168.xxx.xxx</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Login Terakhir</span><span className="font-medium text-neutral-900 dark:text-neutral-50">Hari ini</span></div>
        </div>
      </AppCard>

      {/* Security Recommendations */}
      <AppCard>
        <div className="flex items-center gap-2 mb-3">
          <Shuffle className="h-5 w-5 text-purple-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Rekomendasi Keamanan</h3>
        </div>
        <div className="space-y-2">
          {RECOMMENDATIONS.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <AppBadge variant={r.done ? "success" : "warning"}>{r.done ? "✓" : "!"}</AppBadge>
              <span className="text-neutral-600 dark:text-neutral-400">{r.text}</span>
            </div>
          ))}
        </div>
      </AppCard>
    </div>
  );
}
