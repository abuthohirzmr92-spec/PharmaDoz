"use client";

import { useState } from "react";
import {
  Pill,
  Package,
  Plus,
  Pencil,
  X,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";


/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const DEMO_CATEGORIES: CategoryRow[] = [
  {
    id: "cat-1",
    name: "Obat Bebas",
    description: "Obat yang dapat dibeli tanpa resep dokter",
    productCount: 24,
    createdAt: "2025-01-15",
  },
  {
    id: "cat-2",
    name: "Obat Keras",
    description: "Obat dengan tanda lingkaran merah (K) — memerlukan resep dokter",
    productCount: 18,
    createdAt: "2025-01-15",
  },
  {
    id: "cat-3",
    name: "Alat Kesehatan",
    description: "Alat kesehatan seperti termometer, tensimeter, masker",
    productCount: 12,
    createdAt: "2025-02-10",
  },
  {
    id: "cat-4",
    name: "Suplemen",
    description: "Vitamin, mineral, dan suplemen makanan",
    productCount: 31,
    createdAt: "2025-03-01",
  },
  {
    id: "cat-5",
    name: "Kosmetik",
    description: "Produk kosmetik dan perawatan tubuh",
    productCount: 9,
    createdAt: "2025-03-20",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function CategoryTable() {
  const [categories, setCategories] = useState<CategoryRow[]>(DEMO_CATEGORIES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    const entry: CategoryRow = {
      id: `cat-${Date.now()}`,
      name: newCategory.name.trim(),
      description: newCategory.description.trim() || null,
      productCount: 0,
      createdAt: new Date().toISOString().split("T")[0]!,
    };
    setCategories((prev) => [...prev, entry]);
    setNewCategory({ name: "", description: "" });
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setNewCategory({ name: "", description: "" });
    setShowAddForm(false);
  };

  const emptyRows = categories.length === 0 && !showAddForm;

  return (
    <div className="space-y-3">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Kategori Produk
          </h3>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Kategori
          </button>
        )}
      </div>

      {/* Inline add form */}
      {showAddForm && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
          <div className="mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand-600" />
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
              Kategori Baru
            </span>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nama kategori"
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            />
            <input
              type="text"
              placeholder="Deskripsi (opsional)"
              value={newCategory.description}
              onChange={(e) =>
                setNewCategory((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAddCategory}
              disabled={!newCategory.name.trim()}
              className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Simpan
            </button>
            <button
              onClick={handleCancelAdd}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <th className="w-[6%] px-3 py-2.5" />
              <th className="w-[28%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Kategori
              </th>
              <th className="w-[38%] hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Deskripsi
              </th>
              <th className="w-[14%] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Produk
              </th>
              <th className="w-[14%] px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {emptyRows ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-neutral-400"
                >
                  <Package className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Belum ada kategori
                </td>
              </tr>
            ) : (
              categories.map((cat) => {
                const isExpanded = expandedId === cat.id;
                return (
                  <tr
                    key={cat.id}
                    className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : cat.id)
                        }
                        className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Pill className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                          {cat.name}
                        </span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2.5">
                      <span className="text-xs text-neutral-500 truncate block">
                        {cat.description || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm tabular-nums text-neutral-800 dark:text-neutral-200">
                        {cat.productCount}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center">
                        <button
                          className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-400 transition-colors"
                          title="Edit kategori"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded detail */}
      {expandedId && (
        <CategoryDetailPanel
          category={categories.find((c) => c.id === expandedId) ?? null}
          onClose={() => setExpandedId(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */

function CategoryDetailPanel({
  category,
  onClose,
}: {
  category: CategoryRow | null;
  onClose: () => void;
}) {
  if (!category) return null;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Detail Kategori
        </h4>
        <button
          onClick={onClose}
          className="text-[10px] text-neutral-400 hover:text-neutral-600"
        >
          Tutup
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
            Nama
          </span>
          <span className="text-neutral-800 dark:text-neutral-200">
            {category.name}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
            Produk
          </span>
          <span className="text-neutral-800 dark:text-neutral-200 tabular-nums">
            {category.productCount}
          </span>
        </div>
        <div className="col-span-2">
          <span className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
            Deskripsi
          </span>
          <span className="text-neutral-600 dark:text-neutral-400">
            {category.description || "—"}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
            Dibuat
          </span>
          <span className="text-neutral-600 dark:text-neutral-400 tabular-nums">
            {new Date(category.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
