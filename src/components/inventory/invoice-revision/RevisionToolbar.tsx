// =================================================================
// RevisionToolbar V3.2.1
// 🔒 ARCHITECTURE LOCKED
// Responsibility: toolbar actions (add, reset, expand, collapse)
// =================================================================

"use client";

// ─── Props ───

interface RevisionToolbarProps {
  onAddItem: () => void;
  onReset: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  canEdit: boolean;
}

// ─── Component ───

export function RevisionToolbar({
  onAddItem,
  onReset,
  onExpandAll,
  onCollapseAll,
  canEdit,
}: RevisionToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b px-4 py-2">
      <button
        onClick={onAddItem}
        disabled={!canEdit}
        className="rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40"
      >
        + Tambah Item
      </button>
      <button
        onClick={onExpandAll}
        className="rounded-lg border px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
      >
        Expand All
      </button>
      <button
        onClick={onCollapseAll}
        className="rounded-lg border px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
      >
        Collapse All
      </button>
      <div className="flex-1" />
      <button
        onClick={onReset}
        disabled={!canEdit}
        className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40"
      >
        Reset Perubahan
      </button>
    </div>
  );
}
