"use client";

import { useState } from "react";
import { Lock, Key, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { isSupabaseConnected } from "@/lib/supabase/client";

export default function SecurityPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError("Password baru tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isSupabaseConnected()) {
        setError("Database tidak terhubung.");
        setIsSubmitting(false);
        return;
      }

      const { supabase } = await import("@/lib/supabase/client");
      if (!supabase) throw new Error("Not connected");

      // Step 1: Verify current password by signing in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Session tidak valid.");

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: form.currentPassword,
      });

      if (signInErr) {
        setError("Password saat ini salah.");
        setIsSubmitting(false);
        return;
      }

      // Step 2: Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: form.newPassword,
      });

      if (updateErr) throw updateErr;

      setIsDone(true);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password berhasil diubah.");
      setTimeout(() => setIsDone(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Keamanan</h2>
          <p className="text-xs text-neutral-500">Ubah password akun Anda</p>
        </div>
      </div>

      {isDone ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Password Berhasil Diubah</p>
            <p className="text-xs text-green-600 dark:text-green-400">Gunakan password baru saat login berikutnya.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleChangePassword} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Password Saat Ini
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Password Baru
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Ulangi password baru"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              isSubmitting
                ? "cursor-not-allowed bg-neutral-300 text-neutral-500"
                : "bg-amber-600 text-white hover:bg-amber-700",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Mengubah...
              </>
            ) : (
              "Ubah Password"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
