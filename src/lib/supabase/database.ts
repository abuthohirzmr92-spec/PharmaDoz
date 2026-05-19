// ---------------------------------------------------------------------------
// Manually-defined Database type matching our migration schema.
// When Supabase CLI is connected, replace with: supabase gen types typescript
// ---------------------------------------------------------------------------

// ─── Row Types ──────────────────────────────────────────────────────────────

interface PharmacyRow {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  opening_time: string | null;
  closing_time: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface UserRow {
  id: string;
  supabase_uid: string | null;
  email: string;
  display_name: string;
  role_id: string;
  cabang_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface PermissionRow {
  id: string;
  key: string;
  description: string | null;
  module: string | null;
  created_at: string;
}

interface RolePermissionRow {
  id: string;
  role_id: string;
  permission_id: string;
}

interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  barcode: string | null;
  description: string | null;
  image_url: string | null;
  requires_prescription: boolean;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ProductCategoryRow {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ProductBatchRow {
  id: string;
  product_id: string;
  batch_number: string;
  expired_date: string;
  quantity: number;
  unit_price: number;
  selling_price: number;
  received_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface PurchaseInvoiceRow {
  id: string;
  invoice_number: string;
  supplier_id: string;
  purchase_date: string;
  due_date: string | null;
  status: string;
  total_amount: number;
  paid_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface PurchaseItemRow {
  id: string;
  invoice_id: string;
  product_id: string;
  batch_number: string;
  expired_date: string;
  quantity: number;
  unit_price: number;
  selling_price: number;
  subtotal: number;
  created_at: string;
}

interface StockMovementRow {
  id: string;
  timestamp: string;
  movement_type: string;
  product_id: string;
  batch_id: string | null;
  qty_before: number;
  qty_change: number;
  qty_after: number;
  reference_number: string | null;
  note: string | null;
  user_id: string | null;
  created_at: string;
}

interface StockOpnameRow {
  id: string;
  opname_date: string;
  status: string;
  conducted_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface StockOpnameItemRow {
  id: string;
  opname_id: string;
  product_id: string;
  batch_id: string | null;
  system_qty: number;
  physical_qty: number;
  difference: number;
  note: string | null;
  created_at: string;
}

interface TransactionRow {
  id: string;
  pharmacy_id: string;
  invoice_number: string;
  cashier_name: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface TransactionItemRow {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

interface TransactionPaymentRow {
  id: string;
  transaction_id: string;
  amount: number;
  method: string;
  ref: string | null;
  created_at: string;
}

interface AppSettingRow {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Insert Types (auto-generated / default fields made optional) ──────────

interface PharmacyInsert {
  id?: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface UserInsert {
  id?: string;
  supabase_uid?: string | null;
  email: string;
  display_name: string;
  role_id: string;
  cabang_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface RoleInsert {
  id?: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface PermissionInsert {
  id?: string;
  key: string;
  description?: string | null;
  module?: string | null;
  created_at?: string;
}

interface RolePermissionInsert {
  id?: string;
  role_id: string;
  permission_id: string;
}

interface ProductInsert {
  id?: string;
  category_id: string;
  name: string;
  barcode?: string | null;
  description?: string | null;
  image_url?: string | null;
  requires_prescription?: boolean;
  min_stock?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface ProductCategoryInsert {
  id?: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface ProductBatchInsert {
  id?: string;
  product_id: string;
  batch_number: string;
  expired_date: string;
  quantity?: number;
  unit_price?: number;
  selling_price?: number;
  received_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface SupplierInsert {
  id?: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface PurchaseInvoiceInsert {
  id?: string;
  invoice_number: string;
  supplier_id: string;
  purchase_date?: string;
  due_date?: string | null;
  status?: string;
  total_amount?: number;
  paid_amount?: number;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface PurchaseItemInsert {
  id?: string;
  invoice_id: string;
  product_id: string;
  batch_number: string;
  expired_date: string;
  quantity: number;
  unit_price: number;
  selling_price: number;
  created_at?: string;
}

interface StockMovementInsert {
  id?: string;
  timestamp?: string;
  movement_type: string;
  product_id: string;
  batch_id?: string | null;
  qty_before: number;
  qty_change: number;
  qty_after: number;
  reference_number?: string | null;
  note?: string | null;
  user_id?: string | null;
  created_at?: string;
}

interface StockOpnameInsert {
  id?: string;
  opname_date?: string;
  status?: string;
  conducted_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface StockOpnameItemInsert {
  id?: string;
  opname_id: string;
  product_id: string;
  batch_id?: string | null;
  system_qty?: number;
  physical_qty?: number;
  note?: string | null;
  created_at?: string;
}

interface TransactionInsert {
  id?: string;
  pharmacy_id: string;
  invoice_number: string;
  cashier_name: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  created_at?: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

interface TransactionItemInsert {
  id?: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at?: string;
}

interface TransactionPaymentInsert {
  id?: string;
  transaction_id: string;
  amount: number;
  method: string;
  ref?: string | null;
  created_at?: string;
}

interface AppSettingInsert {
  id?: string;
  key: string;
  value: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Update Types (all fields optional) ────────────────────────────────────

interface PharmacyUpdate {
  id?: string;
  name?: string;
  code?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface UserUpdate {
  id?: string;
  supabase_uid?: string | null;
  email?: string;
  display_name?: string;
  role_id?: string;
  cabang_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface RoleUpdate {
  id?: string;
  name?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface PermissionUpdate {
  id?: string;
  key?: string;
  description?: string | null;
  module?: string | null;
  created_at?: string;
}

interface RolePermissionUpdate {
  id?: string;
  role_id?: string;
  permission_id?: string;
}

interface ProductUpdate {
  id?: string;
  category_id?: string;
  name?: string;
  barcode?: string | null;
  description?: string | null;
  image_url?: string | null;
  requires_prescription?: boolean;
  min_stock?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface ProductCategoryUpdate {
  id?: string;
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface ProductBatchUpdate {
  id?: string;
  product_id?: string;
  batch_number?: string;
  expired_date?: string;
  quantity?: number;
  unit_price?: number;
  selling_price?: number;
  received_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface SupplierUpdate {
  id?: string;
  name?: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface PurchaseInvoiceUpdate {
  id?: string;
  invoice_number?: string;
  supplier_id?: string;
  purchase_date?: string;
  due_date?: string | null;
  status?: string;
  total_amount?: number;
  paid_amount?: number;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface PurchaseItemUpdate {
  id?: string;
  invoice_id?: string;
  product_id?: string;
  batch_number?: string;
  expired_date?: string;
  quantity?: number;
  unit_price?: number;
  selling_price?: number;
  created_at?: string;
}

interface StockMovementUpdate {
  id?: string;
  timestamp?: string;
  movement_type?: string;
  product_id?: string;
  batch_id?: string | null;
  qty_before?: number;
  qty_change?: number;
  qty_after?: number;
  reference_number?: string | null;
  note?: string | null;
  user_id?: string | null;
  created_at?: string;
}

interface StockOpnameUpdate {
  id?: string;
  opname_date?: string;
  status?: string;
  conducted_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface StockOpnameItemUpdate {
  id?: string;
  opname_id?: string;
  product_id?: string;
  batch_id?: string | null;
  system_qty?: number;
  physical_qty?: number;
  note?: string | null;
  created_at?: string;
}

interface TransactionUpdate {
  id?: string;
  pharmacy_id?: string;
  invoice_number?: string;
  cashier_name?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  created_at?: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

interface TransactionItemUpdate {
  id?: string;
  transaction_id?: string;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
  created_at?: string;
}

interface TransactionPaymentUpdate {
  id?: string;
  transaction_id?: string;
  amount?: number;
  method?: string;
  ref?: string | null;
  created_at?: string;
}

interface AppSettingUpdate {
  id?: string;
  key?: string;
  value?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Database type ─────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      pharmacies: { Row: PharmacyRow; Insert: PharmacyInsert; Update: PharmacyUpdate };
      users: { Row: UserRow; Insert: UserInsert; Update: UserUpdate };
      roles: { Row: RoleRow; Insert: RoleInsert; Update: RoleUpdate };
      permissions: { Row: PermissionRow; Insert: PermissionInsert; Update: PermissionUpdate };
      role_permissions: { Row: RolePermissionRow; Insert: RolePermissionInsert; Update: RolePermissionUpdate };
      products: { Row: ProductRow; Insert: ProductInsert; Update: ProductUpdate };
      product_categories: { Row: ProductCategoryRow; Insert: ProductCategoryInsert; Update: ProductCategoryUpdate };
      product_batches: { Row: ProductBatchRow; Insert: ProductBatchInsert; Update: ProductBatchUpdate };
      suppliers: { Row: SupplierRow; Insert: SupplierInsert; Update: SupplierUpdate };
      purchase_invoices: { Row: PurchaseInvoiceRow; Insert: PurchaseInvoiceInsert; Update: PurchaseInvoiceUpdate };
      purchase_items: { Row: PurchaseItemRow; Insert: PurchaseItemInsert; Update: PurchaseItemUpdate };
      stock_movements: { Row: StockMovementRow; Insert: StockMovementInsert; Update: StockMovementUpdate };
      stock_opname: { Row: StockOpnameRow; Insert: StockOpnameInsert; Update: StockOpnameUpdate };
      stock_opname_items: { Row: StockOpnameItemRow; Insert: StockOpnameItemInsert; Update: StockOpnameItemUpdate };
      transactions: { Row: TransactionRow; Insert: TransactionInsert; Update: TransactionUpdate };
      transaction_items: { Row: TransactionItemRow; Insert: TransactionItemInsert; Update: TransactionItemUpdate };
      transaction_payments: { Row: TransactionPaymentRow; Insert: TransactionPaymentInsert; Update: TransactionPaymentUpdate };
      app_settings: { Row: AppSettingRow; Insert: AppSettingInsert; Update: AppSettingUpdate };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
