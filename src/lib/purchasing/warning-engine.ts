/**
 * P0.8E — Warning Engine
 *
 * Pure functions for generating and categorizing warnings on draft items.
 * Extensible: price, expiry, OCR, duplicate, low-confidence, etc.
 * NO state. NO side effects. NO set().
 */

import type { PurchaseDraftItem, DraftWarning } from "@/types/purchase-draft";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function warningId(itemId: string, code: string): string {
  return `warning-${itemId}-${code}`;
}

// ---------------------------------------------------------------------------
// Price Warnings
// ---------------------------------------------------------------------------

export function generatePriceWarnings(item: PurchaseDraftItem): DraftWarning[] {
  const warnings: DraftWarning[] = [];

  if (
    item.previousBuyPrice != null &&
    item.previousBuyPrice > 0 &&
    item.enteredBuyPrice > 0
  ) {
    const change = ((item.enteredBuyPrice - item.previousBuyPrice) / item.previousBuyPrice) * 100;

    if (change > 15) {
      warnings.push({
        id: warningId(item.id, "PRICE_INCREASE"),
        level: "warning",
        itemId: item.id,
        code: "PRICE_INCREASE",
        message: `Harga naik ${change.toFixed(0)}% dari pembelian terakhir (Rp ${item.previousBuyPrice.toLocaleString("id-ID")}).`,
      });
    } else if (change < -20) {
      warnings.push({
        id: warningId(item.id, "PRICE_DECREASE"),
        level: "info",
        itemId: item.id,
        code: "PRICE_DECREASE",
        message: `Harga turun ${Math.abs(change).toFixed(0)}% dari pembelian terakhir.`,
      });
    }
  }

  if (item.enteredBuyPrice <= 0) {
    warnings.push({
      id: warningId(item.id, "MISSING_PRICE"),
      level: "critical",
      itemId: item.id,
      code: "MISSING_PRICE",
      message: "Harga beli belum diisi.",
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Expiry Warnings
// ---------------------------------------------------------------------------

export function generateExpiryWarnings(
  item: PurchaseDraftItem,
  today: Date = new Date(),
): DraftWarning[] {
  const warnings: DraftWarning[] = [];

  if (!item.expiredDate) {
    warnings.push({
      id: warningId(item.id, "MISSING_EXPIRED"),
      level: "critical",
      itemId: item.id,
      code: "MISSING_EXPIRED",
      message: "Tanggal kadaluarsa wajib diisi.",
    });
    return warnings;
  }

  const expDate = new Date(item.expiredDate);
  if (isNaN(expDate.getTime())) {
    warnings.push({
      id: warningId(item.id, "INVALID_DATE"),
      level: "critical",
      itemId: item.id,
      code: "INVALID_DATE",
      message: `Format tanggal tidak valid: "${item.expiredDate}".`,
    });
    return warnings;
  }

  if (expDate <= today) {
    warnings.push({
      id: warningId(item.id, "EXPIRED_PAST"),
      level: "critical",
      itemId: item.id,
      code: "EXPIRED_PAST",
      message: "Tanggal kadaluarsa sudah lewat.",
    });
    return warnings;
  }

  const daysUntilExpiry = Math.ceil(
    (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntilExpiry < 90) {
    warnings.push({
      id: warningId(item.id, "EXPIRED_NEAR"),
      level: "warning",
      itemId: item.id,
      code: "EXPIRED_NEAR",
      message: `Expired dalam ${daysUntilExpiry} hari.`,
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Match Warnings
// ---------------------------------------------------------------------------

export function generateMatchWarnings(item: PurchaseDraftItem): DraftWarning[] {
  const warnings: DraftWarning[] = [];

  if (!item.matchedProductId || item.matchMethod === "unmatched") {
    warnings.push({
      id: warningId(item.id, "NO_MATCH"),
      level: "critical",
      itemId: item.id,
      code: "NO_MATCH",
      message: `Produk "${item.rawProductName}" belum dicocokkan.`,
    });
    return warnings;
  }

  if (item.matchConfidence > 0 && item.matchConfidence < 70) {
    warnings.push({
      id: warningId(item.id, "LOW_CONFIDENCE"),
      level: "warning",
      itemId: item.id,
      code: "LOW_CONFIDENCE",
      message: `Match confidence rendah: ${item.matchConfidence}%.`,
      detail: `Matched via ${item.matchMethod}`,
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Combine All Warnings
// ---------------------------------------------------------------------------

export function generateWarnings(
  item: PurchaseDraftItem,
  today: Date = new Date(),
): DraftWarning[] {
  return [
    ...generateMatchWarnings(item),
    ...generatePriceWarnings(item),
    ...generateExpiryWarnings(item, today),
  ];
}

// ---------------------------------------------------------------------------
// Categorization + Counting
// ---------------------------------------------------------------------------

export function categorizeWarnings(
  warnings: DraftWarning[],
): { info: DraftWarning[]; warning: DraftWarning[]; critical: DraftWarning[] } {
  return {
    info: warnings.filter((w) => w.level === "info"),
    warning: warnings.filter((w) => w.level === "warning"),
    critical: warnings.filter((w) => w.level === "critical"),
  };
}

export function countWarnings(warnings: DraftWarning[]): {
  info: number;
  warning: number;
  critical: number;
} {
  const counts = { info: 0, warning: 0, critical: 0 };
  for (const w of warnings) {
    counts[w.level]++;
  }
  return counts;
}

export function hasCriticalWarnings(warnings: DraftWarning[]): boolean {
  return warnings.some((w) => w.level === "critical" && !w.resolved);
}

// ---------------------------------------------------------------------------
// Warning Resolution — auto-resolve when user action fixes the trigger
// ---------------------------------------------------------------------------

/**
 * Auto-resolve warnings based on current item state.
 * Called whenever item fields change (match, price edit, date fix).
 * Returns a new warnings array with resolved flags set.
 */
export function resolveWarnings(
  warnings: DraftWarning[],
  item: PurchaseDraftItem,
): DraftWarning[] {
  const now = new Date().toISOString();
  return warnings.map((w) => {
    if (w.resolved) return w; // already resolved

    let resolved = false;

    switch (w.code) {
      case "NO_MATCH":
        // Resolved: product has been matched
        resolved = !!item.matchedProductId;
        break;
      case "LOW_CONFIDENCE":
        // Resolved: user explicitly matched or confidence improved
        resolved = item.matchConfidence >= 90 || item.matchMethod === "exact_name";
        break;
      case "MISSING_PRICE":
        // Resolved: price has been filled
        resolved = item.enteredBuyPrice > 0;
        break;
      case "MISSING_EXPIRED":
        // Resolved: expired date has been filled
        resolved = !!item.expiredDate;
        break;
      case "INVALID_DATE":
      case "EXPIRED_PAST":
        // Resolved: date has been corrected to a valid future date
        if (item.expiredDate) {
          const d = new Date(item.expiredDate);
          resolved = !isNaN(d.getTime()) && d > new Date();
        }
        break;
    }

    return resolved ? { ...w, resolved: true, resolvedAt: now } : w;
  });
}

/**
 * Get only active (non-resolved) warnings.
 */
export function getActiveWarnings(warnings: DraftWarning[]): DraftWarning[] {
  return warnings.filter((w) => !w.resolved);
}
