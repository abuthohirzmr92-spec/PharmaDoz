/* ------------------------------------------------------------------ */
/*  Cashier store unit tests                                          */
/*  Run with: npx vitest run (or jest)                                */
/* ------------------------------------------------------------------ */

import { describe, it, expect, beforeEach } from "vitest";
import { useCashierStore, type CartItem, type PaymentMethod } from "@/store/cashier-store";

/* ---- helpers ---- */

const dummyItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: "prod-1",
  productName: "Paracetamol 500mg",
  quantity: 1,
  unitPrice: 15000,
  baseQuantity: 1,
  baseUnitPrice: 15000,
  stockAvailable: 100,
  ...overrides,
});

const dummyPayment = (overrides: Partial<{ amount: number; method: PaymentMethod; ref?: string }> = {}) => ({
  amount: 15000,
  method: "cash" as PaymentMethod,
  ...overrides,
});

/* ---- Reset store before each test ---- */

beforeEach(() => {
  const { resetCashier } = useCashierStore.getState();
  resetCashier();
});

/* ---- Tests ---- */

describe("CashierStore", () => {
  /* ---------------------------------------------------------------- */
  /*  addToCart                                                        */
  /* ---------------------------------------------------------------- */

  it("adds an item to the cart", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem());

    const { cart } = useCashierStore.getState();
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({
      productId: "prod-1",
      quantity: 1,
    });
  });

  it("rejects duplicate product — cart is single source of transaction editing", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "dup", quantity: 2 }));
    store.addToCart(dummyItem({ productId: "dup", quantity: 3 }));

    const { cart } = useCashierStore.getState();
    // Duplicate is ignored — quantity stays at original add value
    expect(cart).toHaveLength(1);
    expect(cart[0]?.quantity).toBe(2);
  });

  it("rejects duplicate product — second add is no-op", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "cap", quantity: 80, stockAvailable: 100 }));
    store.addToCart(dummyItem({ productId: "cap", quantity: 50, stockAvailable: 100 }));

    const { cart } = useCashierStore.getState();
    // Duplicate ignored — original quantity preserved
    expect(cart).toHaveLength(1);
    expect(cart[0]?.quantity).toBe(80);
  });

  it("rejects adding item with quantity exceeding stockAvailable", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ quantity: 999, stockAvailable: 50 }));

    const { cart } = useCashierStore.getState();
    expect(cart).toHaveLength(0);
  });

  /* ---------------------------------------------------------------- */
  /*  updateCartQuantity                                               */
  /* ---------------------------------------------------------------- */

  it("updates item quantity", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "qty-test", quantity: 1 }));
    store.updateCartQuantity("qty-test", 5);

    const { cart } = useCashierStore.getState();
    expect(cart[0]?.quantity).toBe(5);
  });

  it("removes item when quantity is set to 0", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "rm-me", quantity: 1 }));
    store.updateCartQuantity("rm-me", 0);

    const { cart } = useCashierStore.getState();
    expect(cart).toHaveLength(0);
  });

  it("removes item when quantity is set to negative", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "neg", quantity: 1 }));
    store.updateCartQuantity("neg", -1);

    const { cart } = useCashierStore.getState();
    expect(cart).toHaveLength(0);
  });

  /* ---------------------------------------------------------------- */
  /*  removeFromCart                                                   */
  /* ---------------------------------------------------------------- */

  it("removes an item from the cart by productId", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "a" }));
    store.addToCart(dummyItem({ productId: "b" }));
    store.removeFromCart("a");

    const { cart } = useCashierStore.getState();
    expect(cart).toHaveLength(1);
    expect(cart[0]?.productId).toBe("b");
  });

  /* ---------------------------------------------------------------- */
  /*  clearCart                                                        */
  /* ---------------------------------------------------------------- */

  it("empties the cart", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "x" }));
    store.addToCart(dummyItem({ productId: "y" }));
    store.clearCart();

    const { cart } = useCashierStore.getState();
    expect(cart).toHaveLength(0);
  });

  it("removes payments when clearing cart", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "p1", quantity: 1, unitPrice: 50000, stockAvailable: 10 }));
    store.addPayment(dummyPayment({ amount: 50000 }));
    store.clearCart();

    const { cart, payments } = useCashierStore.getState();
    expect(cart).toHaveLength(0);
    expect(payments).toHaveLength(0);
  });

  /* ---------------------------------------------------------------- */
  /*  Cart total calculation                                           */
  /* ---------------------------------------------------------------- */

  it("calculates cart total correctly", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "a", quantity: 2, unitPrice: 10000 }));
    store.addToCart(dummyItem({ productId: "b", quantity: 3, unitPrice: 5000 }));

    const { cart } = useCashierStore.getState();
    const total = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    expect(total).toBe(35000); // 2*10000 + 3*5000
  });

  /* ---------------------------------------------------------------- */
  /*  addPayment                                                       */
  /* ---------------------------------------------------------------- */

  it("adds a payment", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "pay-test", quantity: 1, unitPrice: 50000 }));
    store.addPayment(dummyPayment({ amount: 30000 }));

    const { payments } = useCashierStore.getState();
    expect(payments).toHaveLength(1);
    expect(payments[0]?.amount).toBe(30000);
  });

  it("rejects overpayment beyond cart total", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "overpay", quantity: 1, unitPrice: 10000 }));
    store.addPayment(dummyPayment({ amount: 15000 })); // 15000 > 10000

    const { payments } = useCashierStore.getState();
    expect(payments).toHaveLength(0);
  });

  it("accepts payment exactly equal to cart total", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "exact", quantity: 1, unitPrice: 25000 }));
    store.addPayment(dummyPayment({ amount: 25000 }));

    const { payments } = useCashierStore.getState();
    expect(payments).toHaveLength(1);
  });

  it("accepts partial payment and rejects exceeding remaining", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "partial", quantity: 1, unitPrice: 50000 }));
    store.addPayment(dummyPayment({ amount: 20000 })); // OK
    store.addPayment(dummyPayment({ amount: 20000 })); // OK (40000 total)
    store.addPayment(dummyPayment({ amount: 20000 })); // REJECT (60000 > 50000)

    const { payments } = useCashierStore.getState();
    expect(payments).toHaveLength(2);
  });

  /* ---------------------------------------------------------------- */
  /*  removePayment                                                    */
  /* ---------------------------------------------------------------- */

  it("removes a payment by index", () => {
    const store = useCashierStore.getState();
    store.addToCart(dummyItem({ productId: "rp", quantity: 1, unitPrice: 100000 }));
    store.addPayment(dummyPayment({ amount: 50000 }));
    store.addPayment(dummyPayment({ amount: 50000 }));
    store.removePayment(0);

    const { payments } = useCashierStore.getState();
    expect(payments).toHaveLength(1);
    expect(payments[0]?.amount).toBe(50000);
  });

  /* ---------------------------------------------------------------- */
  /*  setCurrentSale                                                   */
  /* ---------------------------------------------------------------- */

  it("sets the current sale ID and invoice number", () => {
    const store = useCashierStore.getState();
    store.setCurrentSale("sale-123", "INV-001");

    const { currentSaleId, invoiceNumber } = useCashierStore.getState();
    expect(currentSaleId).toBe("sale-123");
    expect(invoiceNumber).toBe("INV-001");
  });

  /* ---------------------------------------------------------------- */
  /*  UI state toggles                                                 */
  /* ---------------------------------------------------------------- */

  it("opens and closes payment modal", () => {
    const store = useCashierStore.getState();
    expect(useCashierStore.getState().isPaymentModalOpen).toBe(false);
    store.openPaymentModal();
    expect(useCashierStore.getState().isPaymentModalOpen).toBe(true);
    store.closePaymentModal();
    expect(useCashierStore.getState().isPaymentModalOpen).toBe(false);
  });

  it("opens and closes receipt", () => {
    const store = useCashierStore.getState();
    store.openReceipt();
    expect(useCashierStore.getState().isReceiptOpen).toBe(true);
    store.closeReceipt();
    expect(useCashierStore.getState().isReceiptOpen).toBe(false);
  });

  it("toggles submitting state", () => {
    const store = useCashierStore.getState();
    store.setSubmitting(true);
    expect(useCashierStore.getState().isSubmitting).toBe(true);
    store.setSubmitting(false);
    expect(useCashierStore.getState().isSubmitting).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /*  setSearchQuery                                                   */
  /* ---------------------------------------------------------------- */

  it("updates search query", () => {
    const store = useCashierStore.getState();
    store.setSearchQuery("paracetamol");
    expect(useCashierStore.getState().searchQuery).toBe("paracetamol");
  });

  /* ---------------------------------------------------------------- */
  /*  resetCashier                                                     */
  /* ---------------------------------------------------------------- */

  it("resets all state to initial values", () => {
    const store = useCashierStore.getState();
    // Set various states
    store.addToCart(dummyItem({ productId: "r1" }));
    store.setCurrentSale("sale-r", "INV-R");
    store.setSearchQuery("test");
    store.openPaymentModal();
    store.openReceipt();
    store.setSubmitting(true);

    // Reset
    store.resetCashier();

    const state = useCashierStore.getState();
    expect(state.cart).toHaveLength(0);
    expect(state.currentSaleId).toBeNull();
    expect(state.invoiceNumber).toBeNull();
    expect(state.payments).toHaveLength(0);
    expect(state.isPaymentModalOpen).toBe(false);
    expect(state.isReceiptOpen).toBe(false);
    expect(state.isSubmitting).toBe(false);
    expect(state.searchQuery).toBe("");
  });
});
