"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Pencil, Archive, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth-store";
import { useLocationMasterStore, type LocationInput } from "@/store/location-master-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProductLocationModal({ open, onClose }: Props) {
  const { locations, isLoading, loadLocations, addLocation, updateLocation, toggleActive, deleteLocation } = useLocationMasterStore();
  const tenantId = useAuthStore((s) => s.user?.tenantId ?? "");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => { if (open) loadLocations(); }, [open, loadLocations]);

  const resetForm = useCallback(() => {
    setEditingId(null); setFormCode(""); setFormName(""); setFormError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const input: LocationInput = { code: formCode.trim(), name: formName.trim() };
    if (!input.code || !input.name) { setFormError("Kode dan nama wajib diisi."); return; }

    // Check duplicates
    const dup = locations.find(l => l.id !== editingId && (l.code.toLowerCase() === input.code.toLowerCase() || l.name.toLowerCase() === input.name.toLowerCase()));
    if (dup) { setFormError("Kode atau nama sudah digunakan."); return; }

    if (editingId) {
      const ok = await updateLocation(editingId, input);
      if (ok) { toast.success("Lokasi diupdate."); resetForm(); } else { toast.error("Gagal update."); }
    } else {
      const loc = await addLocation(input, tenantId);
      if (loc) { toast.success("Lokasi ditambahkan."); resetForm(); } else { toast.error("Gagal menambah."); }
    }
  }, [formCode, formName, editingId, locations, tenantId, addLocation, updateLocation, resetForm]);

  const handleEdit = (id: string) => {
    const loc = locations.find(l => l.id === id);
    if (!loc) return;
    setEditingId(id); setFormCode(loc.code); setFormName(loc.name); setFormError("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-neutral-900 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Master Lokasi Rak</h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
        </div>

        {/* Add / Edit form */}
        <div className="border-b px-5 py-3 dark:border-neutral-800">
          <div className="flex gap-2">
            <input value={formCode} onChange={e => setFormCode(e.target.value)}
              placeholder="Kode (contoh: R01)" className="w-24 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800" />
            <input value={formName} onChange={e => setFormName(e.target.value)}
              placeholder="Nama (contoh: Rak 1)" className="flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800" />
            <button onClick={handleSubmit}
              className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 shrink-0">
              {editingId ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {editingId ? "Update" : "Tambah"}
            </button>
            {editingId && (
              <button onClick={resetForm} className="rounded-lg border px-3 py-1.5 text-xs text-neutral-500 dark:border-neutral-700">Batal</button>
            )}
          </div>
          {formError && <p className="mt-1 text-[10px] text-red-500">{formError}</p>}
        </div>

        {/* List */}
        <div className="p-3">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-neutral-400" /></div>
          ) : locations.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">Belum ada lokasi. Tambahkan lokasi pertama.</div>
          ) : (
            <div className="space-y-1">
              {locations.map((loc) => (
                <div key={loc.id} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  loc.isActive ? "bg-neutral-50 dark:bg-neutral-800/50" : "opacity-50")}>
                  <span className="w-12 text-xs font-mono text-neutral-500">{loc.code}</span>
                  <span className="flex-1 font-medium text-neutral-700 dark:text-neutral-300">{loc.name}</span>
                  {!loc.isActive && <span className="text-[10px] text-red-400">Nonaktif</span>}
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(loc.id)} className="rounded p-1 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => toggleActive(loc.id)} title={loc.isActive ? "Nonaktifkan" : "Aktifkan"}
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700">
                      {loc.isActive ? <Archive className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                    </button>
                    <button onClick={() => { if (confirm(`Hapus "${loc.name}"?`)) deleteLocation(loc.id); }}
                      className="rounded p-1 text-neutral-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30"><X className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
