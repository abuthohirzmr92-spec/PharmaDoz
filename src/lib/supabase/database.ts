// ---------------------------------------------------------------------------
// Comprehensive Database type covering ALL tables (existing + new SaaS tables).
// When Supabase CLI is connected, replace with: supabase gen types typescript
//
// Naming: all columns are snake_case (DB convention). Application layer
// converts to camelCase via repository layer.
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

// ============================================================================
// TENANTS & AUTH
// ============================================================================

// --- tenants (NEW) ---
export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: Json;
  is_active: boolean;
  package_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TenantInsert {
  id?: string;
  name: string;
  slug: string;
  domain?: string | null;
  settings?: Json;
  is_active?: boolean;
  package_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface TenantUpdate {
  id?: string;
  name?: string;
  slug?: string;
  domain?: string | null;
  settings?: Json;
  is_active?: boolean;
  package_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// --- profiles (NEW) ---
export interface ProfileRow {
  id: string;
  tenant_id: string | null;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id?: string;
  tenant_id?: string | null;
  display_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  tenant_id?: string | null;
  display_name?: string;
  avatar_url?: string | null;
  phone?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// --- tenant_users (NEW) ---
export interface TenantUserRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface TenantUserInsert {
  id?: string;
  tenant_id: string;
  user_id: string;
  role: string;
  is_active?: boolean;
  invited_at?: string | null;
  joined_at?: string | null;
  created_at?: string;
}

export interface TenantUserUpdate {
  id?: string;
  tenant_id?: string;
  user_id?: string;
  role?: string;
  is_active?: boolean;
  invited_at?: string | null;
  joined_at?: string | null;
  created_at?: string;
}

// --- roles ---
export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleInsert {
  id?: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoleUpdate {
  id?: string;
  name?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

// --- permissions ---
export interface PermissionRow {
  id: string;
  key: string;
  description: string | null;
  module: string | null;
  created_at: string;
}

export interface PermissionInsert {
  id?: string;
  key: string;
  description?: string | null;
  module?: string | null;
  created_at?: string;
}

export interface PermissionUpdate {
  id?: string;
  key?: string;
  description?: string | null;
  module?: string | null;
  created_at?: string;
}

// --- role_permissions ---
export interface RolePermissionRow {
  id: string;
  role_id: string;
  permission_id: string;
}

export interface RolePermissionInsert {
  id?: string;
  role_id: string;
  permission_id: string;
}

export interface RolePermissionUpdate {
  id?: string;
  role_id?: string;
  permission_id?: string;
}

// ============================================================================
// PHARMACY / BRANCH (tenant-scoped)
// ============================================================================

// --- pharmacies (tenant branch, now with tenant_id) ---
export interface PharmacyRow {
  id: string;
  tenant_id: string | null;
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

export interface PharmacyInsert {
  id?: string;
  tenant_id?: string | null;
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

export interface PharmacyUpdate {
  id?: string;
  tenant_id?: string | null;
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

// --- users (now with tenant_id) ---
export interface UserRow {
  id: string;
  supabase_uid: string | null;
  email: string;
  display_name: string;
  role_id: string;
  tenant_id: string | null;
  cabang_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UserInsert {
  id?: string;
  supabase_uid?: string | null;
  email: string;
  display_name: string;
  role_id: string;
  tenant_id?: string | null;
  cabang_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface UserUpdate {
  id?: string;
  supabase_uid?: string | null;
  email?: string;
  display_name?: string;
  role_id?: string;
  tenant_id?: string | null;
  cabang_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// ============================================================================
// PRODUCT MASTER
// ============================================================================

// --- product_categories (now with tenant_id) ---
export interface ProductCategoryRow {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductCategoryInsert {
  id?: string;
  tenant_id?: string | null;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ProductCategoryUpdate {
  id?: string;
  tenant_id?: string | null;
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// --- product_units (reference data) ---
export interface ProductUnitRow {
  id: string;
  code: string;
  name: string;
}

export interface ProductUnitInsert {
  id?: string;
  code: string;
  name: string;
}

export interface ProductUnitUpdate {
  id?: string;
  code?: string;
  name?: string;
}

// --- products (now with tenant_id + unit/pricing columns) ---
export interface ProductRow {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  barcode: string | null;
  description: string | null;
  image_url: string | null;
  unit: string;
  default_price: number;
  default_selling_price: number;
  requires_prescription: boolean;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductInsert {
  id?: string;
  tenant_id?: string;
  category_id: string;
  name: string;
  barcode?: string | null;
  description?: string | null;
  image_url?: string | null;
  unit?: string;
  default_price?: number;
  default_selling_price?: number;
  requires_prescription?: boolean;
  min_stock?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ProductUpdate {
  id?: string;
  tenant_id?: string;
  category_id?: string;
  name?: string;
  barcode?: string | null;
  description?: string | null;
  image_url?: string | null;
  unit?: string;
  default_price?: number;
  default_selling_price?: number;
  requires_prescription?: boolean;
  min_stock?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// ============================================================================
// INVENTORY
// ============================================================================

// --- product_batches (now with tenant_id) ---
export interface ProductBatchRow {
  id: string;
  tenant_id: string;
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

export interface ProductBatchInsert {
  id?: string;
  tenant_id?: string;
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

export interface ProductBatchUpdate {
  id?: string;
  tenant_id?: string;
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

// --- suppliers (now with tenant_id) ---
export interface SupplierRow {
  id: string;
  tenant_id: string;
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

export interface SupplierInsert {
  id?: string;
  tenant_id?: string;
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

export interface SupplierUpdate {
  id?: string;
  tenant_id?: string;
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

// --- supplier_debts (now with tenant_id) ---
export interface SupplierDebtRow {
  id: string;
  tenant_id: string;
  supplier_id: string;
  invoice_number: string | null;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SupplierDebtInsert {
  id?: string;
  tenant_id?: string;
  supplier_id: string;
  invoice_number?: string | null;
  amount: number;
  paid_amount?: number;
  status?: string;
  due_date?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface SupplierDebtUpdate {
  id?: string;
  tenant_id?: string;
  supplier_id?: string;
  invoice_number?: string | null;
  amount?: number;
  paid_amount?: number;
  status?: string;
  due_date?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// --- purchase_invoices (now with tenant_id) ---
export interface PurchaseInvoiceRow {
  id: string;
  tenant_id: string;
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

export interface PurchaseInvoiceInsert {
  id?: string;
  tenant_id?: string;
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

export interface PurchaseInvoiceUpdate {
  id?: string;
  tenant_id?: string;
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

// --- purchase_items (now with tenant_id) ---
export interface PurchaseItemRow {
  id: string;
  tenant_id: string;
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

export interface PurchaseItemInsert {
  id?: string;
  tenant_id?: string;
  invoice_id: string;
  product_id: string;
  batch_number: string;
  expired_date: string;
  quantity: number;
  unit_price: number;
  selling_price: number;
  created_at?: string;
}

export interface PurchaseItemUpdate {
  id?: string;
  tenant_id?: string;
  invoice_id?: string;
  product_id?: string;
  batch_number?: string;
  expired_date?: string;
  quantity?: number;
  unit_price?: number;
  selling_price?: number;
  created_at?: string;
}

// --- stock_movements (now with tenant_id) ---
export interface StockMovementRow {
  id: string;
  tenant_id: string;
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

export interface StockMovementInsert {
  id?: string;
  tenant_id?: string;
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

export interface StockMovementUpdate {
  id?: string;
  tenant_id?: string;
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

// --- stock_opname (now with tenant_id) ---
export interface StockOpnameRow {
  id: string;
  tenant_id: string;
  opname_date: string;
  status: string;
  conducted_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockOpnameInsert {
  id?: string;
  tenant_id?: string;
  opname_date?: string;
  status?: string;
  conducted_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StockOpnameUpdate {
  id?: string;
  tenant_id?: string;
  opname_date?: string;
  status?: string;
  conducted_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// --- stock_opname_items (now with tenant_id) ---
export interface StockOpnameItemRow {
  id: string;
  tenant_id: string;
  opname_id: string;
  product_id: string;
  batch_id: string | null;
  system_qty: number;
  physical_qty: number;
  difference: number;
  note: string | null;
  created_at: string;
}

export interface StockOpnameItemInsert {
  id?: string;
  tenant_id?: string;
  opname_id: string;
  product_id: string;
  batch_id?: string | null;
  system_qty?: number;
  physical_qty?: number;
  note?: string | null;
  created_at?: string;
}

export interface StockOpnameItemUpdate {
  id?: string;
  tenant_id?: string;
  opname_id?: string;
  product_id?: string;
  batch_id?: string | null;
  system_qty?: number;
  physical_qty?: number;
  note?: string | null;
  created_at?: string;
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

// --- transactions (now with tenant_id) ---
export interface TransactionRow {
  id: string;
  tenant_id: string;
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

export interface TransactionInsert {
  id?: string;
  tenant_id?: string;
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

export interface TransactionUpdate {
  id?: string;
  tenant_id?: string;
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

// --- transaction_items (now with tenant_id) ---
export interface TransactionItemRow {
  id: string;
  tenant_id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface TransactionItemInsert {
  id?: string;
  tenant_id?: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at?: string;
}

export interface TransactionItemUpdate {
  id?: string;
  tenant_id?: string;
  transaction_id?: string;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
  created_at?: string;
}

// --- transaction_payments (now with tenant_id) ---
export interface TransactionPaymentRow {
  id: string;
  tenant_id: string;
  transaction_id: string;
  amount: number;
  method: string;
  ref: string | null;
  created_at: string;
}

export interface TransactionPaymentInsert {
  id?: string;
  tenant_id?: string;
  transaction_id: string;
  amount: number;
  method: string;
  ref?: string | null;
  created_at?: string;
}

export interface TransactionPaymentUpdate {
  id?: string;
  tenant_id?: string;
  transaction_id?: string;
  amount?: number;
  method?: string;
  ref?: string | null;
  created_at?: string;
}

// ============================================================================
// STORE EXPANSION (platform-level)
// ============================================================================

// --- store_expansion_requests ---
export interface StoreExpansionRequestRow {
  id: string;
  owner_id: string;
  pharmacy_name: string;
  pharmacy_code: string | null;
  address: string | null;
  phone: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreExpansionRequestInsert {
  id?: string;
  owner_id: string;
  pharmacy_name: string;
  pharmacy_code?: string | null;
  address?: string | null;
  phone?: string | null;
  status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StoreExpansionRequestUpdate {
  id?: string;
  owner_id?: string;
  pharmacy_name?: string;
  pharmacy_code?: string | null;
  address?: string | null;
  phone?: string | null;
  status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// TENANT PACKAGES & QUOTAS
// ============================================================================

// --- tenant_packages ---
export interface TenantPackageRow {
  id: string;
  name: string;
  label: string;
  max_users: number;
  max_branches: number;
  max_products: number;
  monthly_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantPackageInsert {
  id?: string;
  name: string;
  label: string;
  max_users?: number;
  max_branches?: number;
  max_products?: number;
  monthly_price?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TenantPackageUpdate {
  id?: string;
  name?: string;
  label?: string;
  max_users?: number;
  max_branches?: number;
  max_products?: number;
  monthly_price?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// --- tenant_quotas (now with tenant_id) ---
export interface TenantQuotaRow {
  id: string;
  tenant_id: string;
  pharmacy_id: string | null;
  package_id: string;
  current_users: number;
  current_branches: number;
  is_active: boolean;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantQuotaInsert {
  id?: string;
  tenant_id?: string;
  pharmacy_id?: string | null;
  package_id: string;
  current_users?: number;
  current_branches?: number;
  is_active?: boolean;
  started_at?: string;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TenantQuotaUpdate {
  id?: string;
  tenant_id?: string;
  pharmacy_id?: string | null;
  package_id?: string;
  current_users?: number;
  current_branches?: number;
  is_active?: boolean;
  started_at?: string;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// APP SETTINGS (system-wide)
// ============================================================================

// --- app_settings ---
export interface AppSettingRow {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettingInsert {
  id?: string;
  key: string;
  value: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppSettingUpdate {
  id?: string;
  key?: string;
  value?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// SUBSCRIPTIONS & PAYMENTS (NEW)
// ============================================================================

// --- subscriptions (NEW) ---
export interface SubscriptionRow {
  id: string;
  tenant_id: string;
  package_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInsert {
  id?: string;
  tenant_id: string;
  package_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string | null;
  canceled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionUpdate {
  id?: string;
  tenant_id?: string;
  package_id?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string | null;
  canceled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// --- payments (NEW) ---
export interface PaymentRow {
  id: string;
  subscription_id: string | null;
  tenant_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PaymentInsert {
  id?: string;
  subscription_id?: string | null;
  tenant_id: string;
  amount: number;
  currency?: string;
  status: string;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at?: string;
}

export interface PaymentUpdate {
  id?: string;
  subscription_id?: string | null;
  tenant_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at?: string;
}

// ============================================================================
// AUDIT & ACTIVITY LOGS (NEW)
// ============================================================================

// --- activity_logs (NEW) ---
export interface ActivityLogRow {
  id: string;
  tenant_id: string | null;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: string;
}

export interface ActivityLogInsert {
  id?: string;
  tenant_id?: string | null;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  metadata?: Json;
  ip_address?: string | null;
  created_at?: string;
}

export interface ActivityLogUpdate {
  id?: string;
  tenant_id?: string | null;
  actor_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string | null;
  metadata?: Json;
  ip_address?: string | null;
  created_at?: string;
}

// ============================================================================
// SYNC & OFFLINE (NEW)
// ============================================================================

// --- sync_queue (NEW) ---
export interface SyncQueueRow {
  id: string;
  tenant_id: string;
  business_day: string;
  entry_type: string;
  payload: Json;
  idempotency_key: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface SyncQueueInsert {
  id?: string;
  tenant_id: string;
  business_day: string;
  entry_type: string;
  payload: Json;
  idempotency_key: string;
  status?: string;
  attempts?: number;
  last_error?: string | null;
  created_at?: string;
  synced_at?: string | null;
}

export interface SyncQueueUpdate {
  id?: string;
  tenant_id?: string;
  business_day?: string;
  entry_type?: string;
  payload?: Json;
  idempotency_key?: string;
  status?: string;
  attempts?: number;
  last_error?: string | null;
  created_at?: string;
  synced_at?: string | null;
}

// --- offline_sessions (NEW) ---
export interface OfflineSessionRow {
  id: string;
  tenant_id: string;
  device_id: string | null;
  started_at: string;
  last_heartbeat: string;
  ended_at: string | null;
  transaction_count: number;
}

export interface OfflineSessionInsert {
  id?: string;
  tenant_id: string;
  device_id?: string | null;
  started_at?: string;
  last_heartbeat?: string;
  ended_at?: string | null;
  transaction_count?: number;
}

export interface OfflineSessionUpdate {
  id?: string;
  tenant_id?: string;
  device_id?: string | null;
  started_at?: string;
  last_heartbeat?: string;
  ended_at?: string | null;
  transaction_count?: number;
}

// ============================================================================
// DATABASE INTERFACE
// ============================================================================

export interface Database {
  public: {
    Tables: {
      tenants: { Row: TenantRow; Insert: TenantInsert; Update: TenantUpdate };
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate };
      tenant_users: { Row: TenantUserRow; Insert: TenantUserInsert; Update: TenantUserUpdate };
      roles: { Row: RoleRow; Insert: RoleInsert; Update: RoleUpdate };
      permissions: { Row: PermissionRow; Insert: PermissionInsert; Update: PermissionUpdate };
      role_permissions: { Row: RolePermissionRow; Insert: RolePermissionInsert; Update: RolePermissionUpdate };
      pharmacies: { Row: PharmacyRow; Insert: PharmacyInsert; Update: PharmacyUpdate };
      users: { Row: UserRow; Insert: UserInsert; Update: UserUpdate };
      product_categories: { Row: ProductCategoryRow; Insert: ProductCategoryInsert; Update: ProductCategoryUpdate };
      product_units: { Row: ProductUnitRow; Insert: ProductUnitInsert; Update: ProductUnitUpdate };
      products: { Row: ProductRow; Insert: ProductInsert; Update: ProductUpdate };
      product_batches: { Row: ProductBatchRow; Insert: ProductBatchInsert; Update: ProductBatchUpdate };
      suppliers: { Row: SupplierRow; Insert: SupplierInsert; Update: SupplierUpdate };
      supplier_debts: { Row: SupplierDebtRow; Insert: SupplierDebtInsert; Update: SupplierDebtUpdate };
      purchase_invoices: { Row: PurchaseInvoiceRow; Insert: PurchaseInvoiceInsert; Update: PurchaseInvoiceUpdate };
      purchase_items: { Row: PurchaseItemRow; Insert: PurchaseItemInsert; Update: PurchaseItemUpdate };
      stock_movements: { Row: StockMovementRow; Insert: StockMovementInsert; Update: StockMovementUpdate };
      stock_opname: { Row: StockOpnameRow; Insert: StockOpnameInsert; Update: StockOpnameUpdate };
      stock_opname_items: { Row: StockOpnameItemRow; Insert: StockOpnameItemInsert; Update: StockOpnameItemUpdate };
      transactions: { Row: TransactionRow; Insert: TransactionInsert; Update: TransactionUpdate };
      transaction_items: { Row: TransactionItemRow; Insert: TransactionItemInsert; Update: TransactionItemUpdate };
      transaction_payments: { Row: TransactionPaymentRow; Insert: TransactionPaymentInsert; Update: TransactionPaymentUpdate };
      store_expansion_requests: { Row: StoreExpansionRequestRow; Insert: StoreExpansionRequestInsert; Update: StoreExpansionRequestUpdate };
      tenant_packages: { Row: TenantPackageRow; Insert: TenantPackageInsert; Update: TenantPackageUpdate };
      tenant_quotas: { Row: TenantQuotaRow; Insert: TenantQuotaInsert; Update: TenantQuotaUpdate };
      app_settings: { Row: AppSettingRow; Insert: AppSettingInsert; Update: AppSettingUpdate };
      subscriptions: { Row: SubscriptionRow; Insert: SubscriptionInsert; Update: SubscriptionUpdate };
      payments: { Row: PaymentRow; Insert: PaymentInsert; Update: PaymentUpdate };
      activity_logs: { Row: ActivityLogRow; Insert: ActivityLogInsert; Update: ActivityLogUpdate };
      sync_queue: { Row: SyncQueueRow; Insert: SyncQueueInsert; Update: SyncQueueUpdate };
      offline_sessions: { Row: OfflineSessionRow; Insert: OfflineSessionInsert; Update: OfflineSessionUpdate };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
