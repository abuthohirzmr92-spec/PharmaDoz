/* ------------------------------------------------------------------ */
/*  Transaction Types — completed sales archive                       */
/* ------------------------------------------------------------------ */

export type PaymentMethod = "cash" | "debit" | "credit" | "qris" | "transfer";

export interface SalePayment {
  amount: number;
  method: PaymentMethod;
  ref?: string;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  quantity: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  items: TransactionItem[];
  payments: SalePayment[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cashierName: string;
  createdAt: string; // ISO
  pharmacyId?: string;
  cashierId?: string;
  status?: "completed" | "pending";
  batchAllocations?: BatchAllocation[];
}
