"use client";

// ---------------------------------------------------------------------------
// V2 Phase 1C Hardening — Multi Unit Editor (Presentation Only)
// ---------------------------------------------------------------------------
// Pure presentational component. Semua logic (state, validation, submit)
// tetap di product-form-modal.tsx. Component ini hanya merender UI.
// ---------------------------------------------------------------------------

export interface MultiUnitEditorProps {
  /** Nama satuan dasar (Level 1), e.g. "Tablet" — readonly, dari form.unit */
  baseUnit: string;

  /** Level 2 — nama unit */
  level2Name: string;
  /** Level 2 — isi (jumlah base unit) */
  level2Contains: number | "";

  /** Level 3 — nama unit */
  level3Name: string;
  /** Level 3 — isi (jumlah Level 2 unit) */
  level3Contains: number | "";

  /** Daftar error validasi dari parent */
  errors: string[];

  /** Daftar nama unit yang sudah ada (dari DB / demo list) untuk suggestions */
  unitSuggestions: string[];

  /** Callback saat Level 2 nama berubah (parent: set + setIsDirty) */
  onLevel2NameChange: (value: string) => void;
  /** Callback saat Level 2 contains berubah (parent: set + setIsDirty) */
  onLevel2ContainsChange: (value: number | "") => void;
  /** Callback saat Level 3 nama berubah (parent: set + setIsDirty) */
  onLevel3NameChange: (value: string) => void;
  /** Callback saat Level 3 contains berubah (parent: set + setIsDirty) */
  onLevel3ContainsChange: (value: number | "") => void;
}

export function MultiUnitEditor({
  baseUnit,
  level2Name,
  level2Contains,
  level3Name,
  level3Contains,
  errors,
  unitSuggestions,
  onLevel2NameChange,
  onLevel2ContainsChange,
  onLevel3NameChange,
  onLevel3ContainsChange,
}: MultiUnitEditorProps) {
  const showLevel3 = level2Name.trim().length > 0 || level3Name.trim().length > 0;

  return (
    <>
      {/* ── Level 2 (opsional) ── */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
        <p className="mb-2 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
          Level 2 (opsional)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
              Nama Unit
            </label>
            <input
              type="text"
              value={level2Name}
              onChange={(e) => onLevel2NameChange(e.target.value)}
              placeholder="contoh: Strip"
              className="w-full rounded border border-neutral-200 bg-white px-2.5 py-1.5 text-sm placeholder-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
              list="unit-suggestions"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
              1 {level2Name || "—"} berisi
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={level2Contains}
                onChange={(e) => {
                  const v = e.target.value;
                  onLevel2ContainsChange(v === "" ? "" : Math.max(0, Number(v)));
                }}
                placeholder="10"
                className="w-20 rounded border border-neutral-200 bg-white px-2.5 py-1.5 text-sm placeholder-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                {baseUnit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Level 3 (opsional, hanya muncul jika Level 2 diisi) ── */}
      {showLevel3 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
          <p className="mb-2 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
            Level 3 (opsional)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                Nama Unit
              </label>
              <input
                type="text"
                value={level3Name}
                onChange={(e) => onLevel3NameChange(e.target.value)}
                placeholder="contoh: Dus"
                className="w-full rounded border border-neutral-200 bg-white px-2.5 py-1.5 text-sm placeholder-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
                list="unit-suggestions"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                1 {level3Name || "—"} berisi
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={level3Contains}
                  onChange={(e) => {
                    const v = e.target.value;
                    onLevel3ContainsChange(v === "" ? "" : Math.max(0, Number(v)));
                  }}
                  placeholder="20"
                  className="w-20 rounded border border-neutral-200 bg-white px-2.5 py-1.5 text-sm placeholder-neutral-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                  {level2Name.trim() || "Level 2"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Validation errors ── */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/30">
          {errors.map((err, i) => (
            <p key={i} className="text-[10px] text-red-600 dark:text-red-400">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* ── Datalist suggestions ── */}
      <datalist id="unit-suggestions">
        {unitSuggestions.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
    </>
  );
}
