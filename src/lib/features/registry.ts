// ---------------------------------------------------------------------------
// Feature Flag Registry — Centralized feature key definitions
// ---------------------------------------------------------------------------
// All feature keys used across the platform are defined here.
// Package-level defaults are in migration 033 (package_features table).
// Per-tenant overrides are stored in tenants.settings JSONB.
// ---------------------------------------------------------------------------

export const FEATURE_FLAGS = {
  /** Multi-wallet, cashflow tracking, transfers (financial module) */
  FINANCIAL_WALLET: "financial_wallet",
  /** Cashflow dashboard with charts and analytics */
  CASHFLOW_DASHBOARD: "cashflow_dashboard",
  /** AI-powered diagnostics and recommendations */
  AI_DIAGNOSTICS: "ai_diagnostics",
  /** Automated maintenance mode scheduling */
  MAINTENANCE_AUTOMATION: "maintenance_automation",
  /** Advanced reporting (profit/loss, purchase analysis) */
  ADVANCED_REPORTING: "advanced_reporting",
  /** Cross-branch stock transfers */
  STOCK_TRANSFER: "stock_transfer",
  /** Analytics dashboard widgets (sales trends, top products) */
  DASHBOARD_ANALYTICS: "dashboard_analytics",
  /** White-label branding (custom logo, colors) */
  WHITE_LABEL: "white_label",
  /** External API access for integrations */
  API_ACCESS: "api_access",
  /** Priority customer support channel */
  PRIORITY_SUPPORT: "priority_support",
  /** Financial insight dashboard — capital, profit, ROI */
  FINANCIAL_INSIGHT: "financial_insight",
  /** Profit allocation — tutup buku, cadangan, pemilik, operasional */
  PROFIT_ALLOCATION: "profit_allocation",
  /** Excel-based product master import (bulk create/update) */
  PRODUCT_IMPORT_EXCEL: "product_import_excel",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/** Human-readable labels for UI display */
export const FEATURE_LABELS: Record<FeatureFlagKey, string> = {
  financial_wallet: "Dompet Keuangan",
  cashflow_dashboard: "Dashboard Cashflow",
  ai_diagnostics: "AI Diagnostics",
  maintenance_automation: "Maintenance Otomatis",
  advanced_reporting: "Laporan Lanjutan",
  stock_transfer: "Transfer Stok",
  dashboard_analytics: "Dashboard Analytics",
  white_label: "White Label",
  api_access: "Akses API",
  priority_support: "Support Prioritas",
  financial_insight: "Insight Bisnis",
  profit_allocation: "Alokasi Profit",
  product_import_excel: "Import Produk Excel",
};

/** Feature descriptions for tooltips */
export const FEATURE_DESCRIPTIONS: Record<FeatureFlagKey, string> = {
  financial_wallet: "Kelola dompet kas, rekening bank, dan dompet digital. Lacak semua aliran uang masuk dan keluar.",
  cashflow_dashboard: "Dashboard arus kas dengan grafik mingguan/bulanan dan analisis pemasukan vs pengeluaran.",
  ai_diagnostics: "Diagnostik AI untuk mendeteksi masalah, memberikan rekomendasi, dan optimasi performa.",
  maintenance_automation: "Jadwalkan mode maintenance otomatis di luar jam operasional.",
  advanced_reporting: "Laporan laba rugi, analisis pembelian, margin keuntungan, dan ekspor PDF/Excel.",
  stock_transfer: "Transfer stok antar cabang dengan workflow approval dan pelacakan.",
  dashboard_analytics: "Widget analitik: tren penjualan 7/30 hari, produk terlaris, metrik performa.",
  white_label: "Kustomisasi branding: logo, warna, dan nama tampilan sesuai brand tenant.",
  api_access: "Akses API eksternal untuk integrasi dengan sistem lain (ERP, akuntansi, dll).",
  priority_support: "Saluran support prioritas dengan waktu respon lebih cepat.",
  financial_insight: "Dashboard modal usaha, profit kotor, ROI, dan performa cabang — tanpa akuntansi penuh.",
  profit_allocation: "Alokasi profit bersih ke cadangan, pemilik, dan operasional dengan tutup buku bulanan.",
  product_import_excel: "Import data produk massal dari file Excel (buat baru dan update stok/harga).",
};

/** All feature keys as an array for iteration */
export const ALL_FEATURE_KEYS: FeatureFlagKey[] = Object.values(FEATURE_FLAGS);
