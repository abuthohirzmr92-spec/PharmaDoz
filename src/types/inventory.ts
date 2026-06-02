/* ------------------------------------------------------------------ */
/*  Inventory Type Definitions                                        */
/* ------------------------------------------------------------------ */

/** A single batch of a product — core FEFO unit */
export interface ProductBatch {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiredDate: string; // ISO 8601
  quantity: number;
  unitPrice: number; // purchase / cost price
  sellingPrice: number; // retail price
  createdAt: string; // ISO — when batch was received
}

/* ------------------------------------------------------------------ */
/*  Supplier                                                          */
/* ------------------------------------------------------------------ */

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Purchase                                                           */
/* ------------------------------------------------------------------ */

export type PurchaseStatus = "paid" | "partial" | "unpaid";

export interface PurchaseItem {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiredDate: string;
  quantity: number;
  unitPrice: number;
  sellingPrice: number;
}

export interface PurchaseInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  dueDate?: string;
  status: PurchaseStatus;
  totalAmount: number;
  paidAmount: number;
  items: PurchaseItem[];
}

/* ------------------------------------------------------------------ */
/*  Stock Movement (Audit Trail)                                       */
/* ------------------------------------------------------------------ */

export type MovementType =
  | "purchase"
  | "sale"
  | "refund"
  | "expired"
  | "opname"
  | "adjustment"
  | "transfer";

export interface StockMovement {
  id: string;
  tenantId: string;
  timestamp: string;
  type: MovementType;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  referenceNumber: string;
  note: string;
  userId: string;
  userName: string;
}

/* ------------------------------------------------------------------ */
/*  Stock Opname                                                       */
/* ------------------------------------------------------------------ */

export type OpnameStatus = "draft" | "confirmed" | "adjusted";

export interface StockOpnameItem {
  productId: string;
  tenantId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
  note: string;
}

export interface StockOpname {
  id: string;
  tenantId: string;
  date: string;
  status: OpnameStatus;
  conductedBy: string;
  items: StockOpnameItem[];
  notes: string;
}

/* ------------------------------------------------------------------ */
/*  Aggregated product view for inventory tables                       */
/* ------------------------------------------------------------------ */

export interface InventoryProduct {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  categoryId?: string;             // FK UUID — for edit forms
  description?: string | null;     // product description — for edit forms
  barcode: string | null;
  unit: string;                   // "Tablet", "Botol", "Strip", etc.
  defaultPrice: number;           // default purchase price (cost)
  defaultSellingPrice: number;    // default retail price
  minStock: number;
  totalStock: number;
  batches: ProductBatch[];
  requiresPrescription: boolean;
  isActive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Dashboard summary                                                  */
/* ------------------------------------------------------------------ */

export interface DashboardSummary {
  tenantId?: string;
  totalProducts: number;
  totalStockValue: number; // sum(qty * sellingPrice)
  lowStockCount: number; // totalStock <= minStock
  nearExpiryCount: number; // expired within 90 days
  expiredCount: number; // already expired
  totalPurchaseValue: number; // outstanding supplier debt
  movementToday: number; // movements in last 24h
}
