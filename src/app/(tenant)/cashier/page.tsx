"use client";

/* ------------------------------------------------------------------ */
/*  Imports                                                           */
/* ------------------------------------------------------------------ */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useCashierStore, type PaymentMethod } from "@/store/cashier-store";
import { useHoldCartStore } from "@/store/hold-cart-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useDemoCashier, type DemoProduct } from "@/hooks/use-demo-cashier";
import { useCashierHotkeys, HOTKEY_HINTS } from "@/hooks/use-cashier-hotkeys";
import { TransactionStatus } from "@/components/cashier/transaction-status";
import { PaymentModal } from "@/components/cashier/payment-modal";
import { ReceiptPreview } from "@/components/cashier/receipt-preview";
import { HoldCartDialog } from "@/components/cashier/hold-cart-dialog";
import { HoldCartList } from "@/components/cashier/hold-cart-list";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Trash2,
  Banknote,
  Pause,
  RotateCcw,
  Package,
  Hash,
  Keyboard,
  Clock,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function getPaymentMethodLabel(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    cash: "Tunai",
    debit: "Debit",
    credit: "Kredit",
    qris: "QRIS",
    transfer: "Transfer",
  };
  return map[method];
}

function isNearExpiry(dateStr: string): boolean {
  const diffDays =
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays <= 90;
}

/* Sentinel: Agent B's components (payment-modal, receipt-preview) are
 * imported statically from stubs above. Once Agent B delivers the real
 * implementations, update the imports at the top of this file. */

/* ------------------------------------------------------------------ */
/*  Page Component                                                    */
/* ------------------------------------------------------------------ */

export default function CashierPage() {
  /* ---- preload inventory for checkout ---- */
  const loadInventory = useInventoryStore((s) => s.loadDemoData);
  useEffect(() => { console.log("[VERIFY] Cashier mounted — calling loadInventory()"); loadInventory(); }, []);

  /* ---- store ---- */
  const {
    cart,
    currentSaleId,
    invoiceNumber,
    payments,
    isPaymentModalOpen,
    isReceiptOpen,
    searchQuery,
    updateCartQuantity,
    removeFromCart,
    setSearchQuery,
    openPaymentModal,
    closePaymentModal,
    closeReceipt,
    resetCashier,
  } = useCashierStore();

  const {
    isHoldListOpen,
    openHoldList,
    closeHoldList,
  } = useHoldCartStore();
  const heldCartCount = useHoldCartStore((s) => s.heldCarts.length);

  /* ---- demo mode ---- */
  const {
    demoProducts,
    startDemoSale,
    addDemoProductToCart,
    refreshProducts,
  } = useDemoCashier();

  // Refresh product stock + inventory after checkout completes
  const handleCloseReceipt = useCallback(() => {
    closeReceipt();
    refreshProducts();
    loadInventory();
  }, [closeReceipt, refreshProducts, loadInventory]);

  /* ---- local UI state ---- */
  const [mobileView, setMobileView] = useState<"products" | "cart">("products");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHoldCartDialogOpen, setHoldCartDialogOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const refocusSearch = useCallback(() => {
    setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  /* ---- computed values ---- */
  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [cart],
  );
  const cartItemCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart],
  );
  const paymentTotal = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );
  const remainingAmount = cartTotal - paymentTotal;

  const transactionStatus = useMemo(() => {
    if (!currentSaleId && cart.length === 0) return "draft" as const;
    if (payments.length > 0 && remainingAmount <= 0) return "paid" as const;
    if (payments.length > 0) return "waiting_payment" as const;
    return "draft" as const;
  }, [currentSaleId, cart.length, payments.length, remainingAmount]);

  const filteredByCategory = useMemo(() => {
    if (!categoryFilter) return demoProducts;
    return demoProducts.filter((p) => p.category === categoryFilter);
  }, [demoProducts, categoryFilter]);

  const allCategories = useMemo(
    () => [...new Set(demoProducts.map((p) => p.category))],
    [demoProducts],
  );

  /* ---- handlers ---- */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setSelectedIndex(0);
    },
    [setSearchQuery],
  );

  const handleCategorySelect = useCallback((cat: string | null) => {
    setCategoryFilter(cat);
    setSelectedIndex(0);
  }, []);

  const handleSearchFocus = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const handleOpenPayment = useCallback(() => {
    if (cart.length === 0) return;
    if (!currentSaleId) {
      startDemoSale();
    }
    openPaymentModal();
  }, [cart.length, currentSaleId, startDemoSale, openPaymentModal]);

  const handleHoldCart = useCallback(() => {
    if (cart.length === 0) return;
    setHoldCartDialogOpen(true);
  }, [cart.length]);

  const handleResetCart = useCallback(() => {
    if (cart.length === 0 && !currentSaleId) return;
    resetCashier();
    refocusSearch();
  }, [cart.length, currentSaleId, resetCashier, refocusSearch]);

  const handleOpenHoldList = useCallback(() => {
    if (isPaymentModalOpen) closePaymentModal();
    if (isReceiptOpen) closeReceipt();
    openHoldList();
  }, [isPaymentModalOpen, isReceiptOpen, closePaymentModal, closeReceipt, openHoldList]);

  const handleEscape = useCallback(() => {
    if (isPaymentModalOpen) {
      closePaymentModal();
      refocusSearch();
      return;
    }
    if (isReceiptOpen) {
      closeReceipt();
      refocusSearch();
      return;
    }
    if (searchQuery) {
      setSearchQuery("");
      setSelectedIndex(0);
      searchRef.current?.blur();
      return;
    }
  }, [isPaymentModalOpen, isReceiptOpen, searchQuery, closePaymentModal, closeReceipt, setSearchQuery, refocusSearch]);

  const handleReset = useCallback(() => {
    if (cart.length === 0 && !currentSaleId) return;
    resetCashier();
    refocusSearch();
  }, [cart.length, currentSaleId, resetCashier, refocusSearch]);

  const handleDemoProductClick = useCallback(
    (product: DemoProduct) => {
      if (!currentSaleId) {
        startDemoSale();
      }
      addDemoProductToCart(product);
    },
    [currentSaleId, startDemoSale, addDemoProductToCart],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (filteredByCategory.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredByCategory.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredByCategory.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          const product = filteredByCategory[selectedIndex];
          if (product) {
            const inCart = cart.find((c) => c.productId === product.productId);
            if ((inCart?.quantity ?? 0) < product.stockAvailable) {
              handleDemoProductClick(product);
              setSearchQuery("");
              setSelectedIndex(0);
            }
          }
          break;
      }
    },
    [filteredByCategory, selectedIndex, cart, handleDemoProductClick, setSearchQuery],
  );

  /* ---- keyboard shortcuts ---- */
  useCashierHotkeys({
    onSearchFocus: handleSearchFocus,
    onOpenPayment: handleOpenPayment,
    onHoldCart: handleHoldCart,
    onEscape: handleEscape,
    onResetCart: handleResetCart,
    onOpenHoldList: handleOpenHoldList,
  });

  /* ---- render ---- */
  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* ============================================================ */}
      {/*  TOP BAR                                                     */}
      {/* ============================================================ */}
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:px-4">
        {/* Left: invoice info */}
        <div className="flex items-center gap-3">
          {currentSaleId || cart.length > 0 ? (
            <>
              <Hash className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {invoiceNumber ?? "—"}
              </span>
              <TransactionStatus status={transactionStatus} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-neutral-400" />
              <span className="text-sm text-neutral-500">
                Transaksi Baru
              </span>
            </div>
          )}

          {/* Cart badge (mobile) */}
          {cartItemCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white md:hidden">
              {cartItemCount}
            </span>
          )}
        </div>

        {/* Right: keyboard hints + cart total */}
        <div className="flex items-center gap-2">
          {/* Desktop: shortcut badges */}
          <div className="hidden items-center gap-1 md:flex">
            {HOTKEY_HINTS.map((hint) => (
              <kbd
                key={hint.key}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
              >
                {hint.key}
                <span className="text-neutral-400 dark:text-neutral-500">
                  {hint.label}
                </span>
              </kbd>
            ))}
          </div>

          {/* Mobile: hold list + keyboard toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={handleOpenHoldList}
              className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              aria-label="Transaksi ditahan"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Pintasan keyboard"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>

          {/* Desktop cart total */}
          {cartItemCount > 0 && (
            <span className="hidden text-sm font-bold text-brand-600 md:inline">
              {formatCurrency(cartTotal)}
            </span>
          )}
        </div>
      </header>

      {/* Mobile shortcut panel — clickable buttons for tablet */}
      {showShortcuts && (
        <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 bg-neutral-50 px-2 py-2 md:hidden dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => { handleSearchFocus(); setShowShortcuts(false); }}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <Search className="h-3 w-3" />
            Cari
          </button>
          <button
            onClick={() => { handleOpenPayment(); setShowShortcuts(false); }}
            disabled={cart.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <Banknote className="h-3 w-3" />
            Bayar
          </button>
          <button
            onClick={() => { handleHoldCart(); setShowShortcuts(false); }}
            disabled={cart.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <Pause className="h-3 w-3" />
            Tahan
          </button>
          <button
            onClick={() => { handleOpenHoldList(); setShowShortcuts(false); }}
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 active:bg-amber-200 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            <Clock className="h-3 w-3" />
            Hold
          </button>
          <button
            onClick={() => { handleEscape(); setShowShortcuts(false); }}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <X className="h-3 w-3" />
            Tutup
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  MOBILE VIEW TOGGLE                                          */}
      {/* ============================================================ */}
      <div className="flex border-b border-neutral-200 md:hidden dark:border-neutral-800">
        <button
          onClick={() => setMobileView("products")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
            mobileView === "products"
              ? "border-b-2 border-brand-600 text-brand-600"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
          )}
        >
          <Package className="h-4 w-4" />
          Produk
        </button>
        <button
          onClick={() => setMobileView("cart")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
            mobileView === "cart"
              ? "border-b-2 border-brand-600 text-brand-600"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Keranjang
          {cartItemCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/*  CONTENT AREA                                                */}
      {/* ============================================================ */}
      <div className="flex flex-1 overflow-hidden">
        {/* -------------------------------------------------------- */}
        {/*  LEFT PANEL — Product area                               */}
        {/* -------------------------------------------------------- */}
        <div
          className={cn(
            "flex flex-1 flex-col overflow-hidden",
            "md:flex",
            mobileView === "cart" && "hidden md:flex",
          )}
        >
          {/* Search bar */}
          <div className="shrink-0 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800 sm:px-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Cari produk… Enter tambah (F2)"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder-neutral-500 dark:focus:border-brand-500 dark:focus:ring-brand-900"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setSelectedIndex(0); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchQuery && filteredByCategory.length > 0 && (
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-neutral-500">
                <span>
                  {filteredByCategory.length} produk ditemukan
                </span>
                <span className="text-neutral-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded bg-neutral-200 px-1 py-px text-[10px] dark:bg-neutral-700">↑↓</kbd>
                  {" "}navigasi
                </span>
                <span className="text-neutral-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded bg-neutral-200 px-1 py-px text-[10px] dark:bg-neutral-700">↵</kbd>
                  {" "}tambah
                </span>
                <span className="text-neutral-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded bg-neutral-200 px-1 py-px text-[10px] dark:bg-neutral-700">Esc</kbd>
                  {" "}batal
                </span>
              </div>
            )}
          </div>

          {/* Category filters */}
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-neutral-200 px-3 py-2 dark:border-neutral-800 sm:px-4">
            <button
              onClick={() => handleCategorySelect(null)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                categoryFilter === null
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
              )}
            >
              Semua
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-brand-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product table */}
          <div className="flex-1 overflow-y-auto">
            {filteredByCategory.length > 0 ? (
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
                    <th className="w-[34%] py-1.5 pl-3 pr-1 text-left sm:pl-4">Produk</th>
                    <th className="w-[14%] hidden py-1.5 px-1 text-left sm:table-cell">Kategori</th>
                    <th className="w-[15%] py-1.5 px-1 text-right">Harga</th>
                    <th className="w-[8%] py-1.5 px-1 text-center">Stok</th>
                    <th className="w-[14%] hidden py-1.5 px-1 text-center md:table-cell">Exp</th>
                    <th className="w-[48px] py-1.5 pl-1 pr-3 text-center sm:pr-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredByCategory.map((product, index) => {
                    const inCart = cart.find(
                      (c) => c.productId === product.productId,
                    );
                    const qtyInCart = inCart?.quantity ?? 0;
                    const canAdd = qtyInCart < product.stockAvailable;
                    const nearExpiry = isNearExpiry(product.expiredDate);
                    const isSelected = index === selectedIndex && searchQuery.length > 0;

                    return (
                      <tr
                        key={product.productId}
                        onClick={() => canAdd && handleDemoProductClick(product)}
                        className={cn(
                          "transition-colors",
                          canAdd &&
                            "cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-950/20",
                          !canAdd && "cursor-not-allowed opacity-50",
                          qtyInCart > 0 &&
                            "bg-brand-50/30 dark:bg-brand-950/10",
                          isSelected &&
                            "bg-brand-100/60 ring-1 ring-inset ring-brand-300 dark:bg-brand-900/30 dark:ring-brand-700",
                        )}
                      >
                        {/* Product name */}
                        <td className="py-1 pl-3 pr-1 sm:pl-4">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {qtyInCart > 0 && (
                              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                                {qtyInCart}
                              </span>
                            )}
                            <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                              {product.productName}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="hidden py-1 px-1 sm:table-cell">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {product.category}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-1 px-1 text-right">
                          <span className="text-sm font-semibold text-neutral-900 tabular-nums dark:text-neutral-50">
                            {formatCurrency(product.unitPrice)}
                          </span>
                        </td>

                        {/* Stock */}
                        <td className="py-1 px-1 text-center">
                          {product.stockAvailable === 0 ? (
                            <span className="inline-block rounded-full bg-danger/10 px-1.5 py-0.5 text-[11px] font-medium text-danger">
                              Habis
                            </span>
                          ) : product.stockAvailable <= 10 ? (
                            <span className="inline-block rounded-full bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning tabular-nums">
                              {product.stockAvailable}
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success tabular-nums">
                              {product.stockAvailable}
                            </span>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="hidden py-1 px-1 text-center md:table-cell">
                          <div className="inline-flex items-center gap-1">
                            {nearExpiry ? (
                              <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />
                            ) : (
                              <Clock className="h-3 w-3 shrink-0 text-neutral-400" />
                            )}
                            <span
                              className={cn(
                                "text-[11px] tabular-nums",
                                nearExpiry
                                  ? "font-medium text-warning"
                                  : "text-neutral-500",
                              )}
                            >
                              {new Date(
                                product.expiredDate,
                              ).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Quick add */}
                        <td className="py-1 pl-1 pr-3 text-center sm:pr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canAdd) handleDemoProductClick(product);
                            }}
                            disabled={!canAdd}
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                              canAdd
                                ? "text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
                                : "cursor-not-allowed text-neutral-300 dark:text-neutral-600",
                            )}
                            aria-label={`Tambah ${product.productName}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <EmptyState
                  icon={<Search className="h-8 w-8" />}
                  title={
                    searchQuery
                      ? "Produk tidak ditemukan"
                      : "Tidak ada produk"
                  }
                  description={
                    searchQuery
                      ? `Tidak ada produk yang cocok dengan "${searchQuery}"`
                      : "Produk akan muncul setelah sistem terhubung"
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  RIGHT PANEL — Cart area                                 */}
        {/* -------------------------------------------------------- */}
        <aside
          className={cn(
            "flex w-full flex-col border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
            "md:w-80 md:flex lg:w-96",
            mobileView === "products" && "hidden md:flex",
          )}
        >
          {/* Cart header */}
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800 sm:px-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Keranjang
            </h2>
            {cartItemCount > 0 && (
              <span className="text-xs text-neutral-400">
                {cartItemCount} item
              </span>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4"
                  >
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {item.productName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatCurrency(item.unitPrice)} / pcs
                      </p>
                      {item.batchNumber && (
                        <p className="text-[10px] text-neutral-400">
                          Batch: {item.batchNumber}
                        </p>
                      )}
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateCartQuantity(
                            item.productId,
                            item.quantity - 1,
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                        aria-label="Kurangi"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="flex h-7 min-w-8 items-center justify-center text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateCartQuantity(
                            item.productId,
                            item.quantity + 1,
                          )
                        }
                        disabled={
                          item.quantity >= item.stockAvailable
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-neutral-700 dark:hover:bg-neutral-800"
                        aria-label="Tambah"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="min-w-[56px] text-right sm:min-w-[72px]">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {formatCurrency(
                          item.quantity * item.unitPrice,
                        )}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-300 hover:bg-red-50 hover:text-danger dark:text-neutral-600 dark:hover:bg-red-950/30"
                      aria-label="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                <EmptyState
                  icon={<ShoppingCart className="h-8 w-8" />}
                  title="Keranjang Kosong"
                  description="Pilih produk dari daftar untuk memulai transaksi"
                />
                {heldCartCount > 0 && (
                  <button
                    onClick={handleOpenHoldList}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                  >
                    <Clock className="h-4 w-4" />
                    Lihat {heldCartCount} Transaksi Ditahan
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cart footer — total + actions */}
          {cart.length > 0 && (
            <div className="shrink-0 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800 sm:px-4">
              {/* Total */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Total
                </span>
                <span className="text-xl font-bold text-brand-600">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              {/* Existing payments summary */}
              {payments.length > 0 && (
                <div className="mb-3 space-y-1 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
                  <p className="text-xs font-medium text-neutral-500">
                    Pembayaran
                  </p>
                  {payments.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {getPaymentMethodLabel(p.method)}
                      </span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-50">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))}
                  {remainingAmount > 0 && (
                    <div className="flex items-center justify-between border-t border-neutral-200 pt-1 text-sm dark:border-neutral-700">
                      <span className="text-neutral-500">Sisa</span>
                      <span className="font-medium text-warning">
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                  )}
                  {remainingAmount <= 0 && (
                    <div className="flex items-center justify-between border-t border-neutral-200 pt-1 text-sm dark:border-neutral-700">
                      <span className="text-success">Lunas</span>
                      <span className="font-medium text-success">
                        {formatCurrency(paymentTotal)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleOpenPayment}
                  disabled={cart.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
                >
                  <Banknote className="h-4 w-4" />
                  Bayar
                  <span className="ml-auto text-[10px] opacity-70">F5</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleHoldCart}
                    disabled={cart.length === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Tahan
                  </button>
                  <button
                    onClick={handleOpenHoldList}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      heldCartCount > 0
                        ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                        : "border-neutral-300 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800",
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Daftar Tahan
                    {heldCartCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                        {heldCartCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={cart.length === 0 && !currentSaleId}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-red-50 hover:text-danger disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-red-950/30 dark:hover:text-danger"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ============================================================ */}
      {/*  MODALS                                                      */}
      {/* ============================================================ */}

      <PaymentModal
        open={isPaymentModalOpen}
        onClose={() => {
          closePaymentModal();
          refocusSearch();
        }}
        cartTotal={cartTotal}
      />

      <ReceiptPreview
        open={isReceiptOpen}
        onClose={() => {
          handleCloseReceipt();
          // Refresh stock from latest batch quantities
          loadInventory();
          refocusSearch();
        }}
        invoiceNumber={invoiceNumber}
      />

      <HoldCartDialog
        open={isHoldCartDialogOpen}
        onClose={() => {
          setHoldCartDialogOpen(false);
          refocusSearch();
        }}
        cartItemCount={cartItemCount}
      />

      <HoldCartList
        open={isHoldListOpen}
        onClose={() => {
          closeHoldList();
          refocusSearch();
        }}
      />
    </div>
  );
}
