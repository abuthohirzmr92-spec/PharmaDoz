"use client";

import { useState, useMemo } from "react";
import {
  Pencil,
  ToggleLeft,
  ToggleRight,
  Search,
  Pill,
} from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  unit: string;
  barcode: string | null;
  defaultPrice: number;
  defaultSellingPrice: number;
  description: string | null;
  requiresPrescription: boolean;
  minStock: number;
  totalStock: number;
  isActive: boolean;
}

export interface ProductTableProps {
  products: ProductRow[];
  onEdit: (product: ProductRow) => void;
  onToggleActive: (product: ProductRow) => void;
}

/* ------------------------------------------------------------------ */
/*  Sort state                                                         */
/* ------------------------------------------------------------------ */

type SortKey = "name" | "category" | "unit" | "defaultSellingPrice" | "totalStock" | "isActive";
type SortDir = "asc" | "desc";

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ProductTable({ products, onEdit, onToggleActive }: ProductTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...products];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "unit":
          cmp = a.unit.localeCompare(b.unit);
          break;
        case "defaultSellingPrice":
          cmp = a.defaultSellingPrice - b.defaultSellingPrice;
          break;
        case "totalStock":
          cmp = a.totalStock - b.totalStock;
          break;
        case "isActive":
          cmp = Number(a.isActive) - Number(b.isActive);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [products, sortKey, sortDir]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return (
      <span className="ml-1 text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
    );
  };

  const thClass =
    "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300";
  const thClassRight = `${thClass} text-right`;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
            <th className={thClass} style={{ width: "28%" }} onClick={() => handleSort("name")}>
              Nama Produk<SortIcon column="name" />
            </th>
            <th
              className="hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300"
              style={{ width: "16%" }}
              onClick={() => handleSort("category")}
            >
              Kategori<SortIcon column="category" />
            </th>
            <th
              className="hidden sm:table-cell px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300"
              style={{ width: "11%" }}
              onClick={() => handleSort("unit")}
            >
              Satuan<SortIcon column="unit" />
            </th>
            <th
              className={thClassRight}
              style={{ width: "15%" }}
              onClick={() => handleSort("defaultSellingPrice")}
            >
              Harga Jual<SortIcon column="defaultSellingPrice" />
            </th>
            <th
              className={thClassRight}
              style={{ width: "10%" }}
              onClick={() => handleSort("totalStock")}
            >
              Stok<SortIcon column="totalStock" />
            </th>
            <th
              className={thClass}
              style={{ width: "10%" }}
              onClick={() => handleSort("isActive")}
            >
              Status<SortIcon column="isActive" />
            </th>
            <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500" style={{ width: "10%" }}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-sm text-neutral-400"
              >
                <Pill className="mx-auto mb-2 h-6 w-6 opacity-40" />
                Produk tidak ditemukan
              </td>
            </tr>
          ) : (
            sorted.map((product) => {
              const isLowStock =
                product.totalStock <= product.minStock && product.totalStock > 0;
              const isOutOfStock = product.totalStock === 0;

              return (
                <tr
                  key={product.id}
                  className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  {/* Name */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                        {product.name}
                      </span>
                      {product.requiresPrescription && (
                        <span className="shrink-0 rounded bg-red-50 px-1 py-0.5 text-[9px] font-semibold text-red-600 dark:bg-red-950/30">
                          R
                        </span>
                      )}
                    </div>
                    {product.barcode && (
                      <p className="mt-0.5 text-[10px] font-mono text-neutral-400 truncate">
                        {product.barcode}
                      </p>
                    )}
                  </td>

                  {/* Category */}
                  <td className="hidden sm:table-cell px-3 py-2.5">
                    <span className="text-xs text-neutral-500">{product.category}</span>
                  </td>

                  {/* Unit */}
                  <td className="hidden sm:table-cell px-3 py-2.5">
                    <span className="text-xs text-neutral-500">{product.unit}</span>
                  </td>

                  {/* Harga Jual */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-sm tabular-nums text-neutral-900 dark:text-neutral-50">
                      Rp {product.defaultSellingPrice.toLocaleString("id-ID")}
                    </span>
                  </td>

                  {/* Stock */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        isOutOfStock
                          ? "text-red-500"
                          : isLowStock
                            ? "text-amber-600"
                            : "text-neutral-900 dark:text-neutral-50",
                      )}
                    >
                      {product.totalStock}
                    </span>
                    {isLowStock && (
                      <span className="ml-1 text-[10px] text-amber-500 font-medium">
                        MIN
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="ml-1 text-[10px] text-red-500 font-medium">
                        HABIS
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5">
                    {product.isActive ? (
                      <span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        Nonaktif
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(product)}
                        className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-400 transition-colors"
                        title="Edit produk"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onToggleActive(product)}
                        className={cn(
                          "rounded p-1.5 transition-colors",
                          product.isActive
                            ? "text-neutral-400 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
                            : "text-neutral-400 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400",
                        )}
                        title={product.isActive ? "Nonaktifkan" : "Aktifkan"}
                      >
                        {product.isActive ? (
                          <ToggleRight className="h-3.5 w-3.5" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5" />
                        )}
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
  );
}
