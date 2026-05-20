/* ------------------------------------------------------------------ */
/*  Inventory Demo Data & FEFO Helpers                                 */
/* ------------------------------------------------------------------ */

import type {
  Supplier,
  ProductBatch,
  PurchaseInvoice,
  StockMovement,
  StockOpname,
  InventoryProduct,
  DashboardSummary,
} from "@/types/inventory";

/* ================================================================== */
/*  Suppliers (3)                                                      */
/* ================================================================== */

export const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: "sup-001",
    tenantId: "demo-tenant",
    name: "PT. Bina Medika Sejahtera",
    contactPerson: "Hendra Kusuma",
    phone: "021-5551234",
    email: "hendra@binamedika.co.id",
    address: "Jl. Industri No. 45, Jakarta Utara",
    isActive: true,
  },
  {
    id: "sup-002",
    tenantId: "demo-tenant",
    name: "PT. Farma Global Mandiri",
    contactPerson: "Rina Agustina",
    phone: "021-5555678",
    email: "rina@farmaglobal.co.id",
    address: "Jl. Raya Bogor Km 28, Jakarta Timur",
    isActive: true,
  },
  {
    id: "sup-003",
    tenantId: "demo-tenant",
    name: "CV. Herbal Nusantara",
    contactPerson: "Budi Santoso",
    phone: "0271-5559012",
    email: "budi@herbalnusantara.co.id",
    address: "Jl. Slamet Riyadi No. 88, Solo",
    isActive: true,
  },
];

/* ================================================================== */
/*  Product Batches                                                    */
/* ================================================================== */

export const DEMO_BATCHES: ProductBatch[] = [
  /* ---- Paracetamol 500mg (demo-001) ---- */
  {
    id: "bat-001a",
    tenantId: "demo-tenant",
    productId: "demo-001",
    productName: "Paracetamol 500mg",
    batchNumber: "PAR-2025-001",
    expiredDate: "2025-08-31",
    quantity: 0,
    unitPrice: 7500,
    sellingPrice: 15000,
    createdAt: "2025-06-15T08:00:00Z",
  },
  {
    id: "bat-001b",
    tenantId: "demo-tenant",
    productId: "demo-001",
    productName: "Paracetamol 500mg",
    batchNumber: "PAR-2026-001",
    expiredDate: "2027-12-31",
    quantity: 60,
    unitPrice: 8000,
    sellingPrice: 15000,
    createdAt: "2026-01-20T09:30:00Z",
  },
  {
    id: "bat-001c",
    tenantId: "demo-tenant",
    productId: "demo-001",
    productName: "Paracetamol 500mg",
    batchNumber: "PAR-2026-002",
    expiredDate: "2026-06-30",
    quantity: 40,
    unitPrice: 7800,
    sellingPrice: 15000,
    createdAt: "2026-05-10T10:00:00Z",
  },

  /* ---- Amoxicillin 500mg (demo-002) ---- */
  {
    id: "bat-002a",
    tenantId: "demo-tenant",
    productId: "demo-002",
    productName: "Amoxicillin 500mg",
    batchNumber: "AMX-2025-001",
    expiredDate: "2027-03-15",
    quantity: 15,
    unitPrice: 14000,
    sellingPrice: 25000,
    createdAt: "2025-09-10T08:00:00Z",
  },
  {
    id: "bat-002b",
    tenantId: "demo-tenant",
    productId: "demo-002",
    productName: "Amoxicillin 500mg",
    batchNumber: "AMX-2026-001",
    expiredDate: "2027-06-30",
    quantity: 30,
    unitPrice: 15000,
    sellingPrice: 25000,
    createdAt: "2026-05-05T11:00:00Z",
  },
  {
    id: "bat-002c",
    tenantId: "demo-tenant",
    productId: "demo-002",
    productName: "Amoxicillin 500mg",
    batchNumber: "AMX-2026-002",
    expiredDate: "2026-03-31",
    quantity: 5,
    unitPrice: 14500,
    sellingPrice: 25000,
    createdAt: "2025-10-01T07:30:00Z",
  },

  /* ---- Vitamin C 1000mg (demo-003) ---- */
  {
    id: "bat-003a",
    tenantId: "demo-tenant",
    productId: "demo-003",
    productName: "Vitamin C 1000mg",
    batchNumber: "VTC-2026-001",
    expiredDate: "2027-09-30",
    quantity: 50,
    unitPrice: 20000,
    sellingPrice: 35000,
    createdAt: "2026-02-14T09:00:00Z",
  },
  {
    id: "bat-003b",
    tenantId: "demo-tenant",
    productId: "demo-003",
    productName: "Vitamin C 1000mg",
    batchNumber: "VTC-2026-002",
    expiredDate: "2027-12-15",
    quantity: 25,
    unitPrice: 21000,
    sellingPrice: 35000,
    createdAt: "2026-04-28T13:00:00Z",
  },

  /* ---- Antasida Tablet (demo-004) ---- */
  {
    id: "bat-004a",
    tenantId: "demo-tenant",
    productId: "demo-004",
    productName: "Antasida Tablet",
    batchNumber: "ANT-2025-001",
    expiredDate: "2025-11-30",
    quantity: 0,
    unitPrice: 5500,
    sellingPrice: 12000,
    createdAt: "2025-05-20T08:00:00Z",
  },
  {
    id: "bat-004b",
    tenantId: "demo-tenant",
    productId: "demo-004",
    productName: "Antasida Tablet",
    batchNumber: "ANT-2026-001",
    expiredDate: "2026-08-31",
    quantity: 35,
    unitPrice: 6000,
    sellingPrice: 12000,
    createdAt: "2026-01-10T09:00:00Z",
  },
  {
    id: "bat-004c",
    tenantId: "demo-tenant",
    productId: "demo-004",
    productName: "Antasida Tablet",
    batchNumber: "ANT-2026-002",
    expiredDate: "2027-05-31",
    quantity: 25,
    unitPrice: 6500,
    sellingPrice: 12000,
    createdAt: "2026-05-10T10:15:00Z",
  },

  /* ---- Ibuprofen 400mg (demo-005) ---- */
  {
    id: "bat-005a",
    tenantId: "demo-tenant",
    productId: "demo-005",
    productName: "Ibuprofen 400mg",
    batchNumber: "IBU-2026-001",
    expiredDate: "2027-03-31",
    quantity: 45,
    unitPrice: 10000,
    sellingPrice: 18000,
    createdAt: "2026-04-15T08:30:00Z",
  },
  {
    id: "bat-005b",
    tenantId: "demo-tenant",
    productId: "demo-005",
    productName: "Ibuprofen 400mg",
    batchNumber: "IBU-2026-002",
    expiredDate: "2027-09-30",
    quantity: 35,
    unitPrice: 10500,
    sellingPrice: 18000,
    createdAt: "2026-05-10T10:30:00Z",
  },

  /* ---- Cetirizine 10mg (demo-006) ---- */
  {
    id: "bat-006a",
    tenantId: "demo-tenant",
    productId: "demo-006",
    productName: "Cetirizine 10mg",
    batchNumber: "CET-2025-001",
    expiredDate: "2026-07-15",
    quantity: 30,
    unitPrice: 11000,
    sellingPrice: 22000,
    createdAt: "2025-11-20T08:00:00Z",
  },
  {
    id: "bat-006b",
    tenantId: "demo-tenant",
    productId: "demo-006",
    productName: "Cetirizine 10mg",
    batchNumber: "CET-2026-001",
    expiredDate: "2027-11-30",
    quantity: 60,
    unitPrice: 12000,
    sellingPrice: 22000,
    createdAt: "2026-02-28T09:00:00Z",
  },

  /* ---- Omeprazole 20mg (demo-007) ---- */
  {
    id: "bat-007a",
    tenantId: "demo-tenant",
    productId: "demo-007",
    productName: "Omeprazole 20mg",
    batchNumber: "OME-2025-001",
    expiredDate: "2026-04-30",
    quantity: 3,
    unitPrice: 15500,
    sellingPrice: 28000,
    createdAt: "2025-08-15T08:00:00Z",
  },
  {
    id: "bat-007b",
    tenantId: "demo-tenant",
    productId: "demo-007",
    productName: "Omeprazole 20mg",
    batchNumber: "OME-2026-001",
    expiredDate: "2027-01-31",
    quantity: 25,
    unitPrice: 16000,
    sellingPrice: 28000,
    createdAt: "2026-03-20T10:00:00Z",
  },
  {
    id: "bat-007c",
    tenantId: "demo-tenant",
    productId: "demo-007",
    productName: "Omeprazole 20mg",
    batchNumber: "OME-2026-002",
    expiredDate: "2027-08-31",
    quantity: 17,
    unitPrice: 17000,
    sellingPrice: 28000,
    createdAt: "2026-05-05T11:30:00Z",
  },

  /* ---- Salbutamol Inhaler (demo-008) ---- */
  {
    id: "bat-008a",
    tenantId: "demo-tenant",
    productId: "demo-008",
    productName: "Salbutamol Inhaler",
    batchNumber: "SAL-2025-001",
    expiredDate: "2026-02-28",
    quantity: 2,
    unitPrice: 34000,
    sellingPrice: 55000,
    createdAt: "2025-07-10T08:00:00Z",
  },
  {
    id: "bat-008b",
    tenantId: "demo-tenant",
    productId: "demo-008",
    productName: "Salbutamol Inhaler",
    batchNumber: "SAL-2026-001",
    expiredDate: "2026-07-31",
    quantity: 15,
    unitPrice: 35000,
    sellingPrice: 55000,
    createdAt: "2026-03-20T10:00:00Z",
  },
  {
    id: "bat-008c",
    tenantId: "demo-tenant",
    productId: "demo-008",
    productName: "Salbutamol Inhaler",
    batchNumber: "SAL-2026-002",
    expiredDate: "2027-04-30",
    quantity: 13,
    unitPrice: 36000,
    sellingPrice: 55000,
    createdAt: "2026-05-05T11:00:00Z",
  },

  /* ---- Multivitamin Tablet (demo-009) ---- */
  {
    id: "bat-009a",
    tenantId: "demo-tenant",
    productId: "demo-009",
    productName: "Multivitamin Tablet",
    batchNumber: "MLT-2026-001",
    expiredDate: "2027-08-31",
    quantity: 40,
    unitPrice: 25000,
    sellingPrice: 42000,
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "bat-009b",
    tenantId: "demo-tenant",
    productId: "demo-009",
    productName: "Multivitamin Tablet",
    batchNumber: "MLT-2026-002",
    expiredDate: "2027-05-15",
    quantity: 25,
    unitPrice: 24000,
    sellingPrice: 42000,
    createdAt: "2026-04-28T13:30:00Z",
  },

  /* ---- Minyak Kayu Putih (demo-010) ---- */
  {
    id: "bat-010a",
    tenantId: "demo-tenant",
    productId: "demo-010",
    productName: "Minyak Kayu Putih",
    batchNumber: "MKP-2025-001",
    expiredDate: "2025-12-31",
    quantity: 0,
    unitPrice: 10000,
    sellingPrice: 20000,
    createdAt: "2025-03-20T08:00:00Z",
  },
  {
    id: "bat-010b",
    tenantId: "demo-tenant",
    productId: "demo-010",
    productName: "Minyak Kayu Putih",
    batchNumber: "MKP-2026-001",
    expiredDate: "2028-06-30",
    quantity: 25,
    unitPrice: 11000,
    sellingPrice: 20000,
    createdAt: "2026-01-08T09:00:00Z",
  },
  {
    id: "bat-010c",
    tenantId: "demo-tenant",
    productId: "demo-010",
    productName: "Minyak Kayu Putih",
    batchNumber: "MKP-2026-002",
    expiredDate: "2028-01-31",
    quantity: 15,
    unitPrice: 10500,
    sellingPrice: 20000,
    createdAt: "2026-04-28T14:00:00Z",
  },
];

/* ================================================================== */
/*  Purchase Invoices (5)                                              */
/* ================================================================== */

const INV_001: PurchaseInvoice = {
  id: "inv-001",
  tenantId: "demo-tenant",
  invoiceNumber: "INV-2026-001",
  supplierId: "sup-001",
  supplierName: "PT. Bina Medika Sejahtera",
  purchaseDate: "2026-05-10",
  dueDate: "2026-06-10",
  status: "unpaid",
  totalAmount: 1_047_000,
  paidAmount: 0,
  items: [
    {
      id: "inv-001-i1",
      tenantId: "demo-tenant",
      productId: "demo-001",
      productName: "Paracetamol 500mg",
      batchNumber: "PAR-2026-002",
      expiredDate: "2026-06-30",
      quantity: 50,
      unitPrice: 7800,
      sellingPrice: 15000,
    },
    {
      id: "inv-001-i2",
      tenantId: "demo-tenant",
      productId: "demo-004",
      productName: "Antasida Tablet",
      batchNumber: "ANT-2026-002",
      expiredDate: "2027-05-31",
      quantity: 30,
      unitPrice: 6500,
      sellingPrice: 12000,
    },
    {
      id: "inv-001-i3",
      tenantId: "demo-tenant",
      productId: "demo-005",
      productName: "Ibuprofen 400mg",
      batchNumber: "IBU-2026-002",
      expiredDate: "2027-09-30",
      quantity: 40,
      unitPrice: 10500,
      sellingPrice: 18000,
    },
  ],
};

const INV_002: PurchaseInvoice = {
  id: "inv-002",
  tenantId: "demo-tenant",
  invoiceNumber: "INV-2026-002",
  supplierId: "sup-002",
  supplierName: "PT. Farma Global Mandiri",
  purchaseDate: "2026-05-05",
  dueDate: "2026-06-05",
  status: "partial",
  totalAmount: 1_398_000,
  paidAmount: 700_000,
  items: [
    {
      id: "inv-002-i1",
      tenantId: "demo-tenant",
      productId: "demo-002",
      productName: "Amoxicillin 500mg",
      batchNumber: "AMX-2026-001",
      expiredDate: "2027-06-30",
      quantity: 40,
      unitPrice: 15000,
      sellingPrice: 25000,
    },
    {
      id: "inv-002-i2",
      tenantId: "demo-tenant",
      productId: "demo-007",
      productName: "Omeprazole 20mg",
      batchNumber: "OME-2026-002",
      expiredDate: "2027-08-31",
      quantity: 20,
      unitPrice: 17000,
      sellingPrice: 28000,
    },
    {
      id: "inv-002-i3",
      tenantId: "demo-tenant",
      productId: "demo-008",
      productName: "Salbutamol Inhaler",
      batchNumber: "SAL-2026-002",
      expiredDate: "2027-04-30",
      quantity: 15,
      unitPrice: 36000,
      sellingPrice: 55000,
    },
  ],
};

const INV_003: PurchaseInvoice = {
  id: "inv-003",
  tenantId: "demo-tenant",
  invoiceNumber: "INV-2026-003",
  supplierId: "sup-003",
  supplierName: "CV. Herbal Nusantara",
  purchaseDate: "2026-04-28",
  dueDate: "2026-05-28",
  status: "paid",
  totalAmount: 1_807_500,
  paidAmount: 1_807_500,
  items: [
    {
      id: "inv-003-i1",
      tenantId: "demo-tenant",
      productId: "demo-003",
      productName: "Vitamin C 1000mg",
      batchNumber: "VTC-2026-002",
      expiredDate: "2027-12-15",
      quantity: 30,
      unitPrice: 21000,
      sellingPrice: 35000,
    },
    {
      id: "inv-003-i2",
      tenantId: "demo-tenant",
      productId: "demo-009",
      productName: "Multivitamin Tablet",
      batchNumber: "MLT-2026-002",
      expiredDate: "2027-05-15",
      quantity: 30,
      unitPrice: 24000,
      sellingPrice: 42000,
    },
    {
      id: "inv-003-i3",
      tenantId: "demo-tenant",
      productId: "demo-010",
      productName: "Minyak Kayu Putih",
      batchNumber: "MKP-2026-002",
      expiredDate: "2028-01-31",
      quantity: 20,
      unitPrice: 10500,
      sellingPrice: 20000,
    },
  ],
};

const INV_004: PurchaseInvoice = {
  id: "inv-004",
  tenantId: "demo-tenant",
  invoiceNumber: "INV-2026-004",
  supplierId: "sup-001",
  supplierName: "PT. Bina Medika Sejahtera",
  purchaseDate: "2026-04-15",
  dueDate: "2026-05-15",
  status: "paid",
  totalAmount: 780_000,
  paidAmount: 780_000,
  items: [
    {
      id: "inv-004-i1",
      tenantId: "demo-tenant",
      productId: "demo-006",
      productName: "Cetirizine 10mg",
      batchNumber: "CET-2025-001",
      expiredDate: "2026-07-15",
      quantity: 35,
      unitPrice: 11000,
      sellingPrice: 22000,
    },
    {
      id: "inv-004-i2",
      tenantId: "demo-tenant",
      productId: "demo-005",
      productName: "Ibuprofen 400mg",
      batchNumber: "IBU-2026-001",
      expiredDate: "2027-03-31",
      quantity: 50,
      unitPrice: 10000,
      sellingPrice: 18000,
    },
  ],
};

const INV_005: PurchaseInvoice = {
  id: "inv-005",
  tenantId: "demo-tenant",
  invoiceNumber: "INV-2026-005",
  supplierId: "sup-002",
  supplierName: "PT. Farma Global Mandiri",
  purchaseDate: "2026-03-20",
  dueDate: "2026-04-20",
  status: "unpaid",
  totalAmount: 1_325_000,
  paidAmount: 0,
  items: [
    {
      id: "inv-005-i1",
      tenantId: "demo-tenant",
      productId: "demo-007",
      productName: "Omeprazole 20mg",
      batchNumber: "OME-2026-001",
      expiredDate: "2027-01-31",
      quantity: 30,
      unitPrice: 16000,
      sellingPrice: 28000,
    },
    {
      id: "inv-005-i2",
      tenantId: "demo-tenant",
      productId: "demo-008",
      productName: "Salbutamol Inhaler",
      batchNumber: "SAL-2026-001",
      expiredDate: "2026-07-31",
      quantity: 20,
      unitPrice: 35000,
      sellingPrice: 55000,
    },
  ],
};

export const DEMO_PURCHASE_INVOICES: PurchaseInvoice[] = [
  INV_001,
  INV_002,
  INV_003,
  INV_004,
  INV_005,
];

/* ================================================================== */
/*  Stock Movements (audit trail from purchases)                       */
/* ================================================================== */

function buildPurchaseMovements(invoice: PurchaseInvoice): StockMovement[] {
  return invoice.items.map((item) => {
    const batch = DEMO_BATCHES.find(
      (b) =>
        b.productId === item.productId && b.batchNumber === item.batchNumber,
    );
    const qtyAfter = batch?.quantity ?? item.quantity;
    const qtyBefore = qtyAfter - item.quantity;
    return {
      id: `mov-${item.id}`,
      tenantId: "demo-tenant",
      timestamp: `${invoice.purchaseDate}T10:00:00Z`,
      type: "purchase" as const,
      productId: item.productId,
      productName: item.productName,
      batchId: batch?.id ?? "",
      batchNumber: item.batchNumber,
      qtyBefore,
      qtyChange: item.quantity,
      qtyAfter,
      referenceNumber: invoice.invoiceNumber,
      note: `Pembelian dari ${invoice.supplierName}`,
      userId: "user-demo",
      userName: "Admin Demo",
    };
  });
}

export const DEMO_STOCK_MOVEMENTS: StockMovement[] = [
  ...buildPurchaseMovements(INV_001),
  ...buildPurchaseMovements(INV_002),
  ...buildPurchaseMovements(INV_003),
  ...buildPurchaseMovements(INV_004),
  ...buildPurchaseMovements(INV_005),

  // Expired write-offs
  {
    id: "mov-exp-001",
    tenantId: "demo-tenant",
    timestamp: "2026-05-01T08:00:00Z",
    type: "expired",
    productId: "demo-007",
    productName: "Omeprazole 20mg",
    batchId: "bat-007a",
    batchNumber: "OME-2025-001",
    qtyBefore: 5,
    qtyChange: -2,
    qtyAfter: 3,
    referenceNumber: "EXP-2026-05",
    note: "Penghapusan stok kadaluarsa batch OME-2025-001",
    userId: "user-demo",
    userName: "Admin Demo",
  },
  {
    id: "mov-exp-002",
    tenantId: "demo-tenant",
    timestamp: "2026-03-01T08:00:00Z",
    type: "expired",
    productId: "demo-008",
    productName: "Salbutamol Inhaler",
    batchId: "bat-008a",
    batchNumber: "SAL-2025-001",
    qtyBefore: 4,
    qtyChange: -2,
    qtyAfter: 2,
    referenceNumber: "EXP-2026-03",
    note: "Penghapusan stok kadaluarsa batch SAL-2025-001",
    userId: "user-demo",
    userName: "Admin Demo",
  },

  // Stock adjustment
  {
    id: "mov-adj-001",
    tenantId: "demo-tenant",
    timestamp: "2026-05-15T09:00:00Z",
    type: "adjustment",
    productId: "demo-001",
    productName: "Paracetamol 500mg",
    batchId: "bat-001b",
    batchNumber: "PAR-2026-001",
    qtyBefore: 55,
    qtyChange: 5,
    qtyAfter: 60,
    referenceNumber: "ADJ-2026-001",
    note: "Koreksi stok setelah mini opname — fisik lebih 5 dari sistem",
    userId: "user-demo",
    userName: "Admin Demo",
  },
];

/* ================================================================== */
/*  Stock Opname                                                       */
/* ================================================================== */

export const DEMO_STOCK_OPNAME: StockOpname = {
  id: "opn-001",
  tenantId: "demo-tenant",
  date: "2026-05-15",
  status: "confirmed",
  conductedBy: "Admin Demo",
  notes: "Opname rutin bulanan — fokus obat bebas dan vitamin",
  items: [
    {
      tenantId: "demo-tenant",
      productId: "demo-001",
      productName: "Paracetamol 500mg",
      batchId: "bat-001b",
      batchNumber: "PAR-2026-001",
      systemQty: 55,
      physicalQty: 60,
      difference: 5,
      note: "Lebih 5 — adjustment dibuat",
    },
    {
      tenantId: "demo-tenant",
      productId: "demo-004",
      productName: "Antasida Tablet",
      batchId: "bat-004b",
      batchNumber: "ANT-2026-001",
      systemQty: 36,
      physicalQty: 35,
      difference: -1,
      note: "Kurang 1 — kemungkinan rusak",
    },
    {
      tenantId: "demo-tenant",
      productId: "demo-009",
      productName: "Multivitamin Tablet",
      batchId: "bat-009a",
      batchNumber: "MLT-2026-001",
      systemQty: 40,
      physicalQty: 40,
      difference: 0,
      note: "Sesuai",
    },
    {
      tenantId: "demo-tenant",
      productId: "demo-010",
      productName: "Minyak Kayu Putih",
      batchId: "bat-010b",
      batchNumber: "MKP-2026-001",
      systemQty: 25,
      physicalQty: 25,
      difference: 0,
      note: "Sesuai",
    },
  ],
};

/* ================================================================== */
/*  FEFO Helpers                                                       */
/* ================================================================== */

/** Days until expiry. Negative = already expired. */
export function getDaysUntilExpiry(expiredDate: string): number {
  const now = new Date();
  const exp = new Date(expiredDate);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Batches with stock > 0, sorted FEFO (earliest expiry first). */
export function getFefoBatches(
  batches: ProductBatch[],
  productId?: string,
): ProductBatch[] {
  let result = batches.filter((b) => b.quantity > 0);
  if (productId) result = result.filter((b) => b.productId === productId);
  return result.sort(
    (a, b) =>
      new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime(),
  );
}

/** FEFO allocation: which batches to draw from for `neededQty`. */
export interface FefoAllocation {
  batchId: string;
  batchNumber: string;
  take: number;
  remainingAfter: number;
}

export function allocateFefo(
  batches: ProductBatch[],
  productId: string,
  neededQty: number,
): FefoAllocation[] {
  const fefo = getFefoBatches(batches, productId);
  const allocations: FefoAllocation[] = [];
  let remaining = neededQty;

  for (const batch of fefo) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      take,
      remainingAfter: batch.quantity - take,
    });
    remaining -= take;
  }

  return allocations;
}

/** Apply FEFO allocations to batches, returning new array with decremented quantities. */
export function applySaleDeduction(
  batches: ProductBatch[],
  allocations: FefoAllocation[]
): ProductBatch[] {
  return batches.map((batch) => {
    const alloc = allocations.find((a) => a.batchId === batch.id);
    if (!alloc) return batch;
    return { ...batch, quantity: Math.max(0, batch.quantity - alloc.take) };
  });
}

/** Batches expiring within `daysThreshold` days. */
export function getNearExpiryBatches(
  batches: ProductBatch[],
  daysThreshold = 90,
): ProductBatch[] {
  return batches
    .filter((b) => {
      const days = getDaysUntilExpiry(b.expiredDate);
      return days >= 0 && days <= daysThreshold && b.quantity > 0;
    })
    .sort(
      (a, b) =>
        new Date(a.expiredDate).getTime() - new Date(b.expiredDate).getTime(),
    );
}

/** Batches already expired (expiredDate < today). */
export function getExpiredBatches(batches: ProductBatch[]): ProductBatch[] {
  return batches.filter(
    (b) => getDaysUntilExpiry(b.expiredDate) < 0 && b.quantity > 0,
  );
}

/* ================================================================== */
/*  Computed Views                                                     */
/* ================================================================== */

/** Build InventoryProduct records from demo data. */
export function buildInventoryProducts(
  batches: ProductBatch[],
): InventoryProduct[] {
  const grouped = new Map<string, ProductBatch[]>();
  for (const b of batches) {
    const arr = grouped.get(b.productId) || [];
    arr.push(b);
    grouped.set(b.productId, arr);
  }

  // Category lookup from demo products
  const catMap: Record<string, string> = {
    "demo-001": "Obat Bebas",
    "demo-002": "Antibiotik",
    "demo-003": "Vitamin",
    "demo-004": "Obat Bebas",
    "demo-005": "Obat Bebas",
    "demo-006": "Obat Bebas",
    "demo-007": "Obat Keras",
    "demo-008": "Obat Keras",
    "demo-009": "Vitamin",
    "demo-010": "Lainnya",
  };

  // Unit mapping derived from product names
  const unitMap: Record<string, string> = {
    "demo-001": "Tablet",
    "demo-002": "Tablet",
    "demo-003": "Tablet",
    "demo-004": "Tablet",
    "demo-005": "Tablet",
    "demo-006": "Tablet",
    "demo-007": "Tablet",
    "demo-008": "Inhaler",
    "demo-009": "Tablet",
    "demo-010": "Botol",
  };

  const rxSet = new Set(["demo-002", "demo-007", "demo-008"]);

  return Array.from(grouped.entries()).map(([productId, productBatches]) => {
    const totalStock = productBatches.reduce((s, b) => s + b.quantity, 0);
    const first = productBatches[0];

    // Compute default prices as averages across all batches for this product
    const batchCount = productBatches.length;
    const avgUnitPrice =
      productBatches.reduce((s, b) => s + b.unitPrice, 0) / batchCount;
    const avgSellingPrice =
      productBatches.reduce((s, b) => s + b.sellingPrice, 0) / batchCount;

    return {
      id: productId,
      tenantId: "demo-tenant",
      name: first?.productName ?? "",
      category: catMap[productId] ?? "Lainnya",
      barcode: null,
      unit: unitMap[productId] ?? "Unit",
      defaultPrice: Math.round(avgUnitPrice),
      defaultSellingPrice: Math.round(avgSellingPrice),
      minStock: 10,
      totalStock,
      batches: productBatches,
      requiresPrescription: rxSet.has(productId),
      isActive: true,
    };
  });
}

/** Build dashboard summary from demo data. */
export function buildDashboardSummary(
  batches: ProductBatch[],
  invoices: PurchaseInvoice[],
  movements: StockMovement[],
): DashboardSummary {
  const products = buildInventoryProducts(batches);
  const totalStockValue = batches.reduce(
    (sum, b) => sum + b.quantity * b.sellingPrice,
    0,
  );
  const lowStockCount = products.filter(
    (p) => p.totalStock <= p.minStock,
  ).length;
  const nearExpiryCount = getNearExpiryBatches(batches, 90).length;
  const expiredCount = getExpiredBatches(batches).length;
  const totalPurchaseValue = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const movementToday = movements.filter(
    (m) => now - new Date(m.timestamp).getTime() < oneDay,
  ).length;

  return {
    totalProducts: products.length,
    totalStockValue,
    lowStockCount,
    nearExpiryCount,
    expiredCount,
    totalPurchaseValue,
    movementToday,
  };
}
