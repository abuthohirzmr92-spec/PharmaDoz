/* ------------------------------------------------------------------ */
/*  Demo Transaction Generator                                        */
/* ------------------------------------------------------------------ */

import type { Transaction, TransactionItem, SalePayment } from "@/types/transaction";
import type { PaymentMethod } from "@/types/transaction";

/* ---- Product catalogue (mirrors DEMO_PRODUCTS) ---- */
const PRODUCTS: { id: string; name: string; price: number }[] = [
  { id: "demo-001", name: "Paracetamol 500mg", price: 15000 },
  { id: "demo-002", name: "Amoxicillin 500mg", price: 25000 },
  { id: "demo-003", name: "Vitamin C 1000mg", price: 35000 },
  { id: "demo-004", name: "Antasida Tablet", price: 12000 },
  { id: "demo-005", name: "Ibuprofen 400mg", price: 18000 },
  { id: "demo-006", name: "Cetirizine 10mg", price: 22000 },
  { id: "demo-007", name: "Omeprazole 20mg", price: 28000 },
  { id: "demo-008", name: "Salbutamol Inhaler", price: 55000 },
  { id: "demo-009", name: "Multivitamin Tablet", price: 42000 },
  { id: "demo-010", name: "Minyak Kayu Putih", price: 20000 },
];

const CASHIERS = ["Apoteker Joko", "Apoteker Sari", "Admin Demo"];
const METHODS: PaymentMethod[] = ["cash", "cash", "cash", "debit", "qris"]; // weighted toward cash
const TAX_RATE = 0.11; // PPN 11%

/* ---- Seeded random ---- */
let seed = 42;
function pseudo(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(pseudo() * arr.length)]!;
}

function intBetween(min: number, max: number): number {
  return Math.floor(pseudo() * (max - min + 1)) + min;
}

/* ---- Generate ---- */
export function generateDemoTransactions(days = 90): Transaction[] {
  seed = 42; // deterministic
  const transactions: Transaction[] = [];
  const now = new Date();
  let seq = 1;

  // Produce ~2-3 transactions per day on average
  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const txCount = intBetween(1, 4); // 1-4 per day
    for (let t = 0; t < txCount; t++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(intBetween(8, 21), intBetween(0, 59), 0, 0);

      const dateStr = date.toISOString().slice(0, 10);
      const invoiceNumber = `INV-${dateStr.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`;
      seq++;

      // 1-5 line items per transaction
      const itemCount = intBetween(1, 5);
      const usedProducts = new Set<string>();
      const items: TransactionItem[] = [];

      for (let i = 0; i < itemCount; i++) {
        let product;
        do {
          product = pick(PRODUCTS);
        } while (usedProducts.has(product!.id) && usedProducts.size < PRODUCTS.length);
        if (!product || usedProducts.has(product.id)) continue;
        usedProducts.add(product.id);

        const quantity = intBetween(1, 4);
        items.push({
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice: product.price,
          subtotal: quantity * product.price,
        });
      }

      if (items.length === 0) continue;

      const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
      const discount = pseudo() > 0.7 ? Math.round(subtotal * pseudo() * 0.1 / 500) * 500 : 0;
      const afterDiscount = subtotal - discount;
      const tax = Math.round(afterDiscount * TAX_RATE);
      const total = afterDiscount + tax;

      // 1-2 payments
      const paymentCount = intBetween(1, 2);
      const payments: SalePayment[] = [];
      let remaining = total;

      for (let p = 0; p < paymentCount && remaining > 0; p++) {
        const method = pick(METHODS);
        const amount = p === paymentCount - 1 ? remaining : intBetween(Math.ceil(remaining * 0.3), remaining);
        const safeAmount = Math.min(amount, remaining);
        payments.push({ amount: safeAmount, method, ref: method === "qris" ? `QR-${dateStr}` : undefined });
        remaining -= safeAmount;
      }

      const cashierName = pick(CASHIERS);

      transactions.push({
        id: `txn-${dateStr}-${String(t).padStart(2, "0")}`,
        invoiceNumber,
        items,
        payments,
        subtotal,
        discount,
        tax,
        total,
        cashierName,
        createdAt: date.toISOString(),
      });
    }
  }

  // Sort newest first
  return transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
