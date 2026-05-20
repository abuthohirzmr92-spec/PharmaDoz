import { z } from "zod";

// ---------------------------------------------------------------------------
// Reusable field validators
// ---------------------------------------------------------------------------

/** UUID v4 string */
const uuidField = z.string().uuid();

/** ISO 8601 datetime string */
const isoDatetime = z.string();

/** Date-only string (YYYY-MM-DD) */
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date format YYYY-MM-DD");

/** Optional URL-like string */
const urlLike = z.string().url().optional().nullable();

/** Non-negative number (including zero) */
const nonNegative = z.number().min(0);

/** Positive number (greater than zero) */
const positiveNumber = z.number().positive();

// ---------------------------------------------------------------------------
// Enum helpers
// ---------------------------------------------------------------------------

export const movementTypeEnum = z.enum([
  "purchase", "sale", "refund", "expired", "opname", "adjustment",
]);

export const paymentMethodEnum = z.enum(["cash", "debit", "credit", "qris", "transfer"]);

export const purchaseStatusEnum = z.enum(["paid", "partial", "unpaid"]);

export const opnameStatusEnum = z.enum(["draft", "confirmed", "adjusted"]);

export const syncEntryTypeEnum = z.enum([
  "transaction", "stock_movement", "stock_opname", "purchase_invoice", "product", "batch",
]);

export const syncStatusEnum = z.enum(["pending", "syncing", "synced", "failed"]);

export const subscriptionStatusEnum = z.enum([
  "active", "trialing", "past_due", "canceled", "expired",
]);

export const paymentStatusEnum = z.enum(["pending", "success", "failed", "refunded"]);

export const appRoleEnum = z.enum([
  "super_admin", "tenant_owner", "admin", "pharmacist", "cashier", "staff",
]);

// ---------------------------------------------------------------------------
// TenantSchema
// ---------------------------------------------------------------------------

export const TenantSchema = z.object({
  id: uuidField,
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  domain: z.string().optional().nullable(),
  settings: z.record(z.unknown()).optional(),
  isActive: z.boolean(),
  packageId: uuidField.optional().nullable(),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  deletedAt: isoDatetime.optional().nullable(),
});

export const TenantSchema_strict = TenantSchema.strict();

// ---------------------------------------------------------------------------
// ProfileSchema
// ---------------------------------------------------------------------------

export const ProfileSchema = z.object({
  id: uuidField,
  tenantId: uuidField.optional().nullable(),
  displayName: z.string().min(2).max(200),
  avatarUrl: urlLike,
  phone: z.string().min(8).max(30).optional().nullable(),
  isActive: z.boolean(),
  lastLoginAt: isoDatetime.optional().nullable(),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
});

export const ProfileSchema_strict = ProfileSchema.strict();

// ---------------------------------------------------------------------------
// TenantUserSchema
// ---------------------------------------------------------------------------

export const TenantUserSchema = z.object({
  id: uuidField,
  tenantId: uuidField,
  userId: uuidField,
  role: appRoleEnum,
  isActive: z.boolean(),
  invitedAt: isoDatetime.optional().nullable(),
  joinedAt: isoDatetime.optional().nullable(),
});

export const TenantUserSchema_strict = TenantUserSchema.strict();

// ---------------------------------------------------------------------------
// ProductSchema
// ---------------------------------------------------------------------------

export const ProductSchema = z.object({
  id: uuidField,
  tenantId: uuidField,
  categoryId: uuidField.optional().nullable(),
  name: z.string().min(2).max(255),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string(),
  defaultPrice: nonNegative,
  defaultSellingPrice: nonNegative,
  minStock: nonNegative,
  isActive: z.boolean(),
  imageUrl: z.string().optional().nullable(),
  requiresPrescription: z.boolean().optional(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
});

export const ProductSchema_strict = ProductSchema.strict();

// ---------------------------------------------------------------------------
// ProductBatchSchema
// ---------------------------------------------------------------------------

export const ProductBatchSchema = z.object({
  id: uuidField,
  tenantId: uuidField,
  productId: uuidField,
  batchNumber: z.string(),
  expiredDate: dateString.or(isoDatetime),
  quantity: nonNegative,
  unitPrice: nonNegative,
  sellingPrice: nonNegative,
  receivedAt: isoDatetime.optional(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
});

export const ProductBatchSchema_strict = ProductBatchSchema.strict();

// ---------------------------------------------------------------------------
// TransactionItemSchema
// ---------------------------------------------------------------------------

export const TransactionItemSchema = z.object({
  productId: uuidField,
  productName: z.string(),
  quantity: positiveNumber,
  unitPrice: nonNegative,
  subtotal: nonNegative,
});

export const TransactionItemSchema_strict = TransactionItemSchema.strict();

// ---------------------------------------------------------------------------
// PaymentSchema
// ---------------------------------------------------------------------------

export const PaymentSchema = z.object({
  amount: positiveNumber,
  method: paymentMethodEnum,
  ref: z.string().optional().nullable(),
});

export const PaymentSchema_strict = PaymentSchema.strict();

// ---------------------------------------------------------------------------
// TransactionSchema
// ---------------------------------------------------------------------------

export const TransactionSchema = z.object({
  id: uuidField,
  tenantId: uuidField,
  invoiceNumber: z.string(),
  subtotal: nonNegative,
  discount: nonNegative,
  tax: nonNegative,
  total: nonNegative,
  cashierName: z.string(),
  status: z.string().optional(),
  items: z.array(TransactionItemSchema),
  payments: z.array(PaymentSchema),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional().nullable(),
});

export const TransactionSchema_strict = TransactionSchema.strict();

// ---------------------------------------------------------------------------
// SupplierSchema
// ---------------------------------------------------------------------------

export const SupplierSchema = z.object({
  id: uuidField,
  tenantId: uuidField,
  name: z.string().min(2).max(200),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
});

export const SupplierSchema_strict = SupplierSchema.strict();

// ---------------------------------------------------------------------------
// PurchaseInvoiceSchema
// ---------------------------------------------------------------------------

export const PurchaseInvoiceSchema = z.object({
  id: uuidField,
  tenantId: uuidField,
  supplierId: uuidField,
  invoiceNumber: z.string(),
  purchaseDate: z.string(),
  dueDate: z.string().optional(),
  status: purchaseStatusEnum,
  totalAmount: nonNegative,
  paidAmount: nonNegative,
  notes: z.string().optional().nullable(),
  createdBy: uuidField.optional().nullable(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
});

export const PurchaseInvoiceSchema_strict = PurchaseInvoiceSchema.strict();

// ---------------------------------------------------------------------------
// StockMovementSchema
// ---------------------------------------------------------------------------

export const StockMovementSchema = z.object({
  id: uuidField,
  tenantId: uuidField,
  productId: uuidField,
  batchId: uuidField.optional().nullable(),
  movementType: movementTypeEnum,
  qtyBefore: z.number(),
  qtyChange: z.number(),
  qtyAfter: z.number(),
  referenceNumber: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  userId: uuidField.optional().nullable(),
  createdAt: isoDatetime.optional(),
});

export const StockMovementSchema_strict = StockMovementSchema.strict();

// ---------------------------------------------------------------------------
// StockOpnameSchema
// ---------------------------------------------------------------------------

export const StockOpnameItemSchema = z.object({
  productId: uuidField,
  productName: z.string().optional(),
  batchId: uuidField.optional().nullable(),
  batchNumber: z.string().optional(),
  systemQty: z.number(),
  physicalQty: z.number(),
  difference: z.number().optional(),
  note: z.string().optional(),
});

export const StockOpnameSchema = z.object({
  id: uuidField,
  tenantId: uuidField,
  opnameDate: z.string(),
  status: opnameStatusEnum,
  conductedBy: z.string().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(StockOpnameItemSchema).optional(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
});

export const StockOpnameSchema_strict = StockOpnameSchema.strict();

export const StockOpnameItemSchema_strict = StockOpnameItemSchema.strict();

// ---------------------------------------------------------------------------
// ActivityLogSchema
// ---------------------------------------------------------------------------

export const ActivityLogSchema = z.object({
  id: uuidField.optional(),
  tenantId: uuidField.optional().nullable(),
  actorId: uuidField,
  action: z.string(),
  resourceType: z.string(),
  resourceId: uuidField.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional().nullable(),
  createdAt: isoDatetime.optional(),
});

export const ActivityLogSchema_strict = ActivityLogSchema.strict();

// ---------------------------------------------------------------------------
// SyncQueueEntrySchema
// ---------------------------------------------------------------------------

export const SyncQueueEntrySchema = z.object({
  id: uuidField.optional(),
  tenantId: uuidField,
  businessDay: dateString,
  entryType: syncEntryTypeEnum,
  payload: z.record(z.unknown()),
  idempotencyKey: z.string(),
  status: syncStatusEnum,
  attempts: z.number().int().min(0).optional(),
  lastError: z.string().optional().nullable(),
  createdAt: isoDatetime.optional(),
  syncedAt: isoDatetime.optional().nullable(),
});

export const SyncQueueEntrySchema_strict = SyncQueueEntrySchema.strict();

// ---------------------------------------------------------------------------
// SubscriptionSchema
// ---------------------------------------------------------------------------

export const SubscriptionSchema = z.object({
  id: uuidField.optional(),
  tenantId: uuidField,
  packageId: uuidField,
  status: subscriptionStatusEnum,
  currentPeriodStart: isoDatetime,
  currentPeriodEnd: isoDatetime,
  trialEnd: isoDatetime.optional().nullable(),
  canceledAt: isoDatetime.optional().nullable(),
  createdAt: isoDatetime.optional(),
  updatedAt: isoDatetime.optional(),
});

export const SubscriptionSchema_strict = SubscriptionSchema.strict();

// ---------------------------------------------------------------------------
// PaymentRecordSchema (subscription payments)
// ---------------------------------------------------------------------------

export const PaymentRecordSchema = z.object({
  id: uuidField.optional(),
  subscriptionId: uuidField.optional().nullable(),
  tenantId: uuidField,
  amount: positiveNumber,
  currency: z.string().length(3),
  status: paymentStatusEnum,
  paymentMethod: z.string().optional().nullable(),
  paidAt: isoDatetime.optional().nullable(),
  createdAt: isoDatetime.optional(),
});

export const PaymentRecordSchema_strict = PaymentRecordSchema.strict();

// ---------------------------------------------------------------------------
// Combined exports
// ---------------------------------------------------------------------------

export const schemas = {
  tenant: TenantSchema,
  profile: ProfileSchema,
  tenantUser: TenantUserSchema,
  product: ProductSchema,
  productBatch: ProductBatchSchema,
  transaction: TransactionSchema,
  transactionItem: TransactionItemSchema,
  payment: PaymentSchema,
  supplier: SupplierSchema,
  purchaseInvoice: PurchaseInvoiceSchema,
  stockMovement: StockMovementSchema,
  stockOpname: StockOpnameSchema,
  stockOpnameItem: StockOpnameItemSchema,
  activityLog: ActivityLogSchema,
  syncQueueEntry: SyncQueueEntrySchema,
  subscription: SubscriptionSchema,
  paymentRecord: PaymentRecordSchema,
} as const;

export const schemas_strict = {
  tenant: TenantSchema_strict,
  profile: ProfileSchema_strict,
  tenantUser: TenantUserSchema_strict,
  product: ProductSchema_strict,
  productBatch: ProductBatchSchema_strict,
  transaction: TransactionSchema_strict,
  transactionItem: TransactionItemSchema_strict,
  payment: PaymentSchema_strict,
  supplier: SupplierSchema_strict,
  purchaseInvoice: PurchaseInvoiceSchema_strict,
  stockMovement: StockMovementSchema_strict,
  stockOpname: StockOpnameSchema_strict,
  stockOpnameItem: StockOpnameItemSchema_strict,
  activityLog: ActivityLogSchema_strict,
  syncQueueEntry: SyncQueueEntrySchema_strict,
  subscription: SubscriptionSchema_strict,
  paymentRecord: PaymentRecordSchema_strict,
} as const;
