"use client";

import { create } from "zustand";
import { useCashierStore, type CartItem } from "./cashier-store";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface HoldCart {
  id: string;
  ref: string;
  cart: CartItem[];
  customerName: string;
  createdAt: string; // ISO
  total: number;
  itemCount: number;
}

interface HoldCartState {
  heldCarts: HoldCart[];
  isHoldListOpen: boolean;

  holdCart: (customerName?: string) => boolean;
  restoreHeldCart: (id: string) => boolean;
  removeHeldCart: (id: string) => void;
  openHoldList: () => void;
  closeHoldList: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function generateRef(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `HLD-${date}-${time}`;
}

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */

export const useHoldCartStore = create<HoldCartState>()((set, get) => ({
  heldCarts: [],
  isHoldListOpen: false,

  holdCart: (customerName = "") => {
    const cashier = useCashierStore.getState();
    if (cashier.cart.length === 0) return false;

    const id = `hold-${Date.now()}`;
    const cart = cashier.cart.map((i) => ({ ...i }));
    const total = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    const entry: HoldCart = {
      id,
      ref: generateRef(),
      cart,
      customerName,
      createdAt: new Date().toISOString(),
      total,
      itemCount,
    };

    set({ heldCarts: [...get().heldCarts, entry] });
    cashier.resetCashier();
    return true;
  },

  restoreHeldCart: (id) => {
    const entry = get().heldCarts.find((h) => h.id === id);
    if (!entry) return false;

    const cashier = useCashierStore.getState();

    // If active cart has items, ask confirmation via consumer
    cashier.clearCart();
    cashier.setCurrentSale(
      `sale-${Date.now()}`,
      `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    );

    for (const item of entry.cart) {
      cashier.addToCart(item);
    }

    set({ heldCarts: get().heldCarts.filter((h) => h.id !== id) });
    return true;
  },

  removeHeldCart: (id) => {
    set({ heldCarts: get().heldCarts.filter((h) => h.id !== id) });
  },

  openHoldList: () => set({ isHoldListOpen: true }),
  closeHoldList: () => set({ isHoldListOpen: false }),
}));
