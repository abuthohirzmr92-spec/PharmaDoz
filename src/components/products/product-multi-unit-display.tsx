"use client";

// ---------------------------------------------------------------------------
// V2 Phase 1D — Product Multi Unit Display (Presentation Only)
// ---------------------------------------------------------------------------
// Pure presentational component. Read-only display of unit structure.
// NO useEffect, NO state, NO API calls, NO mutation, NO stock calculation.
// ---------------------------------------------------------------------------

import type { UnitLevel } from "@/types/unit";

/** Arrow separator untuk chain display */
const ARROW = <span className="mx-1 text-neutral-300">→</span>;

export interface ProductMultiUnitDisplayProps {
  /** Nama satuan dasar (Level 1), e.g. "Tablet" */
  baseUnit: string;
  /** Unit levels Level 2 & 3 */
  unitLevels?: UnitLevel[];
}

/**
 * Format the chain display: "Tablet → Strip → Dus"
 */
function formatChain(baseUnit: string, unitLevels: UnitLevel[]): string {
  const sorted = [...unitLevels].sort((a, b) => a.level - b.level);
  return [baseUnit, ...sorted.map((ul) => ul.unitName)].join(" → ");
}

/**
 * Inline badge untuk Multi Unit chain (collapsed view).
 * Menampilkan "Tablet → Strip" atau "—" jika tidak ada level.
 */
export function MultiUnitBadge({ baseUnit, unitLevels }: ProductMultiUnitDisplayProps) {
  const levels = unitLevels ?? [];

  if (levels.length === 0) {
    return <span className="text-xs text-neutral-400">—</span>;
  }

  const chain = formatChain(baseUnit, levels);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-950/30 dark:text-brand-400">
      {chain}
    </span>
  );
}

/**
 * Expanded detail untuk Multi Unit.
 * Menampilkan semua level dengan contains.
 *
 * Contoh:
 *   Satuan Dasar: Tablet
 *   Kemasan Menengah: Strip = 10 Tablet
 *   Kemasan Besar: Dus = 20 Strip
 */
export function MultiUnitDetail({ baseUnit, unitLevels }: ProductMultiUnitDisplayProps) {
  const levels = unitLevels ?? [];
  const sorted = [...levels].sort((a, b) => a.level - b.level);

  const parentName = (idx: number): string =>
    idx === 0 ? baseUnit : sorted[idx - 1]?.unitName ?? "Level " + idx;

  const levelLabel = (lvl: number): string => {
    switch (lvl) {
      case 2: return "Kemasan Menengah";
      case 3: return "Kemasan Besar";
      default: return `Level ${lvl}`;
    }
  };

  return (
    <div className="space-y-1 py-1">
      {/* Satuan Dasar */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-neutral-400 w-28 shrink-0">Satuan Dasar</span>
        <span className="font-medium text-neutral-700 dark:text-neutral-200">
          {baseUnit}
        </span>
      </div>

      {/* Kemasan Menengah & Besar */}
      {sorted.map((ul, idx) => (
        <div key={ul.level} className="flex items-center gap-2 text-[11px]">
          <span className="text-neutral-400 w-28 shrink-0">
            {levelLabel(ul.level)}
          </span>
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            {ul.unitName} = {ul.contains} {parentName(idx)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Tree display untuk Multi Unit hierarchy.
 * Menampilkan struktur bertingkat dengan indentasi visual.
 *
 * Contoh dengan 2 level:
 *   Tablet
 *   └── Strip (10 Tablet)
 *
 * Contoh dengan 3 level:
 *   Tablet
 *   └── Strip (10 Tablet)
 *       └── Dus (20 Strip)
 */
export function MultiUnitTree({ baseUnit, unitLevels }: ProductMultiUnitDisplayProps) {
  const levels = unitLevels ?? [];
  const sorted = [...levels].sort((a, b) => a.level - b.level);

  if (levels.length === 0) {
    return (
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
        {baseUnit}
      </div>
    );
  }

  const parentOf = (idx: number): string =>
    idx === 0 ? baseUnit : sorted[idx - 1]?.unitName ?? "?";

  return (
    <div className="font-mono text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
      {/* Root — Satuan Dasar */}
      <div>{baseUnit}</div>

      {/* Children — dengan indentasi bertingkat */}
      {sorted.map((ul, idx) => {
        const indent = "    ".repeat(idx + 1);
        return (
          <div key={ul.level}>
            <span>{indent}└── </span>
            <span className="font-medium">{ul.unitName}</span>
            <span className="text-neutral-400">
              {" "}({ul.contains} {parentOf(idx)})
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Combined component: badge di collapsed, detail di expanded.
 * Digunakan langsung oleh product table.
 */
export function ProductMultiUnitDisplay({
  baseUnit,
  unitLevels,
  expanded,
}: ProductMultiUnitDisplayProps & { expanded: boolean }) {
  if (expanded) {
    return <MultiUnitDetail baseUnit={baseUnit} unitLevels={unitLevels} />;
  }
  return <MultiUnitBadge baseUnit={baseUnit} unitLevels={unitLevels} />;
}
