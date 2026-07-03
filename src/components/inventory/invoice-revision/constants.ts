// =================================================================
// Invoice Revision Drawer V3.2.1 — Constants
// 🔒 ARCHITECTURE LOCKED
// ALL magic numbers and defaults centralized here.
// =================================================================

import type { RevisionSessionState, WorkingItemState } from "./types";

// ─── Session States ───

export const SESSION_STATES: Record<string, RevisionSessionState> = {
  OPEN: "OPEN",
  EDITING: "EDITING",
  VALIDATING: "VALIDATING",
  READY: "READY",
  COMMITTING: "COMMITTING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

// ─── Working Item States ───

export const WORKING_ITEM_STATES: Record<string, WorkingItemState> = {
  UNCHANGED: "UNCHANGED",
  MODIFIED: "MODIFIED",
  NEW: "NEW",
  DELETED: "DELETED",
} as const;

// ─── Validation Limits ───

export const REASON_MIN_LENGTH = 20;
export const REASON_MAX_LENGTH = 500;
export const MAX_REVISION_ITEMS = 100;
export const MIN_QTY = 1;
export const MAX_QTY = 99_999;

// ─── Default Values ───

export const DEFAULT_EMPTY_ITEM = {
  productId: "",
  productName: "",
  quantity: 1,
  unitPrice: 0,
  sellingPrice: 0,
  batchNumber: "",
  expiredDate: "",
  storageAreaId: "",
  storageSlot: "",
};

// ─── Placeholder Text ───

export const PLACEHOLDER = {
  REASON: "Jelaskan alasan revisi...",
  PRODUCT_SEARCH: "Cari produk...",
  BATCH: "Nomor batch",
  SLOT: "Pilih slot...",
  AREA: "Pilih area...",
} as const;

// ─── Confirmation Messages ───

export const CONFIRMATION = {
  RESET: "Seluruh perubahan akan dibuang. Lanjutkan?",
  CANCEL: "Revisi yang belum disimpan akan hilang. Lanjutkan?",
  DELETE_ITEM: "Hapus item ini dari revisi?",
  SAVE_SUCCESS: "Revisi berhasil disimpan.",
  SAVE_FAILED: "Gagal menyimpan revisi.",
} as const;

// ─── Session Labels ───

export const SESSION_LABEL: Record<string, string> = {
  OPEN: "Siap",
  EDITING: "Mengedit",
  VALIDATING: "Memvalidasi",
  READY: "Siap Disimpan",
  COMMITTING: "Menyimpan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

// ─── Toolbar Labels ───

export const TOOLBAR_LABEL = {
  ADD_ITEM: "+ Tambah Item",
  RESET: "Reset Perubahan",
  EXPAND_ALL: "Expand All",
  COLLAPSE_ALL: "Collapse All",
  SAVE: "Simpan Revisi",
  CANCEL: "Batal",
} as const;

// ─── Toast Messages ───

export const TOAST = {
  ITEM_ADDED: "Item baru ditambahkan.",
  ITEM_DELETED: "Item ditandai untuk dihapus.",
  CHANGES_RESET: "Perubahan dikembalikan ke kondisi awal.",
  VALIDATION_FAILED: "Periksa kembali data revisi.",
} as const;
