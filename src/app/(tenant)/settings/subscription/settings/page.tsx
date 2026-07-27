"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { WidgetShell } from "@/components/subscription/widget-shell";
import { useAsync } from "@/components/subscription/use-async";
import { subscriptionRepo } from "@/lib/repository-instances";

interface SettingsForm {
  billingContact: string;
  billingEmail: string;
  companyName: string;
  taxId: string;
  address: string;
  autoRenew: boolean;
}

const PLACEHOLDER: SettingsForm = { billingContact: "", billingEmail: "", companyName: "", taxId: "", address: "", autoRenew: false };

export default function SubscriptionSettingsPage() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);

  const { data, loading, error } = useAsync(async () => {
    if (!tenantId) return { form: PLACEHOLDER };
    const sub = await subscriptionRepo.getCurrent(tenantId);
    const stored = sub ? { billingContact: "", billingEmail: "", companyName: "", taxId: "", address: "", autoRenew: sub.autoRenew } : PLACEHOLDER;
    return { form: stored };
  }, [tenantId]);

  const [form, setForm] = useState<SettingsForm>(data?.form ?? PLACEHOLDER);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const update = (k: keyof SettingsForm, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      if (!supabase) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db: any = supabase;

      // Read current settings, merge billing fields, write back.
      const { data: current } = await db.from("tenants").select("settings").eq("id", tenantId).single();
      const existing = (current?.settings ?? {}) as Record<string, unknown>;
      const billing = (existing.billing_preferences ?? {}) as Record<string, unknown>;

      const merged = { ...existing, billing_preferences: { ...billing, contact: form.billingContact, email: form.billingEmail, company: form.companyName, tax_id: form.taxId, address: form.address } };
      await db.from("tenants").update({ settings: merged, updated_at: new Date().toISOString() }).eq("id", tenantId);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <WidgetShell title="Pengaturan Penagihan" loading={loading} error={error} isEmpty={!data}>
      <div className="space-y-4">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Kontak Penagihan</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Nama kontak" value={form.billingContact} onChange={(v) => update("billingContact", v)} />
            <InputField label="Email penagihan" value={form.billingEmail} onChange={(v) => update("billingEmail", v)} />
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Perusahaan & Pajak</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Nama perusahaan" value={form.companyName} onChange={(v) => update("companyName", v)} />
            <InputField label="NPWP / Tax ID" value={form.taxId} onChange={(v) => update("taxId", v)} />
          </div>
          <div className="mt-3"><InputField label="Alamat" value={form.address} onChange={(v) => update("address", v)} /></div>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Perpanjangan Otomatis</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.autoRenew} onChange={(e) => update("autoRenew", e.target.checked)} className="rounded" />
            Perpanjang langganan secara otomatis saat jatuh tempo
          </label>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Preferensi Notifikasi</h3>
          <div className="space-y-1.5 text-sm">
            {[{ label: "Email", enabled: true, disabled: false }, { label: "WhatsApp", enabled: false, disabled: true }, { label: "Push Notification", enabled: false, disabled: true }].map((ch) => (
              <label key={ch.label} className="flex items-center gap-2 opacity-70">
                <input type="checkbox" defaultChecked={ch.enabled} disabled={ch.disabled} className="rounded" />
                <span className="text-neutral-600 dark:text-neutral-400">{ch.label}{ch.disabled ? " (mendatang)" : ""}</span>
              </label>
            ))}
          </div>
        </section>
        <button type="button" onClick={save} disabled={saving}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? "Menyimpan..." : saved ? "Tersimpan ✓" : "Simpan"}
        </button>
      </div>
    </WidgetShell>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50" />
    </div>
  );
}
