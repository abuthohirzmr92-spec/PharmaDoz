import { BaseRepository, mapRow, mapRows } from "./base";
import type {
  Supplier,
  PurchaseInvoice,
  PurchaseItem,
  PurchaseStatus,
} from "@/types/inventory";

export class SupplierRepository extends BaseRepository {
  /* ------------------------------------------------------------------ */
  /*  Suppliers                                                          */
  /* ------------------------------------------------------------------ */

  async getSuppliers(): Promise<Supplier[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("suppliers")
      .select("*")
      .is("deleted_at", null)
      .eq("is_active", true);
    query = this.withTenantScope(query);

    const { data, error } = await query;

    if (error) return this.handleError(error, "getSuppliers");

    return mapRows<Supplier>(data || []);
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("suppliers")
      .select("*")
      .is("deleted_at", null)
      .eq("id", id);
    query = this.withTenantScope(query);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getSupplierById");
    }

    return mapRow<Supplier>(data as Record<string, unknown>);
  }

  async createSupplier(data: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<Supplier> {
    if (!this.isConnected) throw new Error("Not connected");

    const insertData: Record<string, unknown> = {
      name: data.name,
      contact_person: data.contactPerson ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
    };
    if (this.getTenantId()) {
      insertData["tenant_id"] = this.getTenantId();
    }

    const { data: row, error } = await this.client
      .from("suppliers")
      .insert(insertData)
      .select()
      .single();

    if (error) return this.handleError(error, "createSupplier");

    return mapRow<Supplier>(row as Record<string, unknown>);
  }

  async updateSupplier(
    id: string,
    data: Partial<{
      name: string;
      contactPerson: string;
      phone: string;
      email: string;
      address: string;
      isActive: boolean;
    }>,
  ): Promise<Supplier> {
    if (!this.isConnected) throw new Error("Not connected");

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData["name"] = data.name;
    if (data.contactPerson !== undefined)
      updateData["contact_person"] = data.contactPerson;
    if (data.phone !== undefined) updateData["phone"] = data.phone;
    if (data.email !== undefined) updateData["email"] = data.email;
    if (data.address !== undefined) updateData["address"] = data.address;
    if (data.isActive !== undefined) updateData["is_active"] = data.isActive;

    let query = this.client
      .from("suppliers")
      .update(updateData)
      .eq("id", id)
      .select();
    query = this.withTenantScope(query);

    const { data: row, error } = await query.single();

    if (error) return this.handleError(error, "updateSupplier");

    return mapRow<Supplier>(row as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  Purchase Invoices                                                  */
  /* ------------------------------------------------------------------ */

  async getPurchaseInvoices(filters?: {
    supplierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PurchaseInvoice[]> {
    if (!this.isConnected) return [];

    let query = this.client
      .from("purchase_invoices")
      .select(`*, supplier:supplier_id(name)`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    query = this.withTenantScope(query);
    query = this.withBranchScope(query);

    if (filters?.supplierId)
      query = query.eq("supplier_id", filters.supplierId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.dateFrom)
      query = query.gte("purchase_date", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("purchase_date", filters.dateTo);

    const { data, error } = await query;
    if (error) return this.handleError(error, "getPurchaseInvoices");

    const result: PurchaseInvoice[] = [];
    for (const inv of data || []) {
      const { data: itemsData, error: itemsError } = await this.client
        .from("purchase_items")
        .select(`*, product:product_id(name)`)
        .eq("invoice_id", inv.id);

      if (itemsError)
        return this.handleError(itemsError, "getPurchaseInvoices");

      result.push({
        id: inv.id,
        tenantId: this.pharmacyId ?? "",
        invoiceNumber: inv.invoice_number,
        supplierId: inv.supplier_id,
        supplierName: ((inv as any).supplier?.name as string) ?? "",
        purchaseDate: inv.purchase_date,
        dueDate: inv.due_date ?? undefined,
        status: inv.status as PurchaseStatus,
        totalAmount: inv.total_amount,
        paidAmount: inv.paid_amount,
        items: (itemsData || []).map(
          (item: Record<string, unknown>) =>
            ({
              id: (item as any).id,
              tenantId: this.pharmacyId ?? "",
              productId: (item as any).product_id,
              productName: ((item as any).product?.name as string) ?? "",
              batchNumber: (item as any).batch_number,
              expiredDate: (item as any).expired_date,
              quantity: (item as any).quantity,
              unitPrice: (item as any).unit_price,
              sellingPrice: (item as any).selling_price,
            }) as PurchaseItem,
        ),
      });
    }

    return result;
  }

  async getPurchaseInvoiceById(id: string): Promise<PurchaseInvoice | null> {
    if (!this.isConnected) return null;

    let query = this.client
      .from("purchase_invoices")
      .select(`*, supplier:supplier_id(name)`)
      .is("deleted_at", null)
      .eq("id", id);
    query = this.withTenantScope(query);
    query = this.withBranchScope(query);

    const { data: inv, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return this.handleError(error, "getPurchaseInvoiceById");
    }

    const { data: itemsData, error: itemsError } = await this.client
      .from("purchase_items")
      .select(`*, product:product_id(name)`)
      .eq("invoice_id", inv.id);

    if (itemsError)
      return this.handleError(itemsError, "getPurchaseInvoiceById");

    return {
      id: inv.id,
      tenantId: this.pharmacyId ?? "",
      invoiceNumber: inv.invoice_number,
      supplierId: inv.supplier_id,
      supplierName: ((inv as any).supplier?.name as string) ?? "",
      purchaseDate: inv.purchase_date,
      dueDate: inv.due_date ?? undefined,
      status: inv.status as PurchaseStatus,
      totalAmount: inv.total_amount,
      paidAmount: inv.paid_amount,
      items: (itemsData || []).map(
        (item: Record<string, unknown>) =>
          ({
            id: (item as any).id,
            productId: (item as any).product_id,
            productName: ((item as any).product?.name as string) ?? "",
            batchNumber: (item as any).batch_number,
            expiredDate: (item as any).expired_date,
            quantity: (item as any).quantity,
            unitPrice: (item as any).unit_price,
            sellingPrice: (item as any).selling_price,
          }) as PurchaseItem,
      ),
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Payment                                                            */
  /* ------------------------------------------------------------------ */

  async updatePurchaseInvoicePayment(
    id: string,
    paidAmount: number,
    walletId?: string,
  ): Promise<PurchaseInvoice> {
    if (!this.isConnected) throw new Error("Not connected");

    // Fetch current invoice to determine new status
    let fetchQuery = this.client
      .from("purchase_invoices")
      .select("total_amount, paid_amount, wallet_id, invoice_number")
      .eq("id", id);
    fetchQuery = this.withTenantScope(fetchQuery);
    fetchQuery = this.withBranchScope(fetchQuery);

    const { data: current, error: fetchError } = await fetchQuery.single();

    if (fetchError) return this.handleError(fetchError, "updatePayment");

    const row = current as any;
    const totalAmount = row.total_amount as number;
    const previousPaid = row.paid_amount as number;
    const currentWalletId = walletId ?? row.wallet_id;

    let newStatus: string;
    if (paidAmount >= totalAmount) newStatus = "paid";
    else if (paidAmount > 0) newStatus = "partial";
    else newStatus = "unpaid";

    let updateQuery = this.client
      .from("purchase_invoices")
      .update({
        paid_amount: paidAmount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`*, supplier:supplier_id(name)`);
    updateQuery = this.withTenantScope(updateQuery);
    updateQuery = this.withBranchScope(updateQuery);

    const { data: updated, error } = await updateQuery.single();

    if (error) return this.handleError(error, "updatePayment");

    // If a wallet is assigned, record the payment as a debit
    if (currentWalletId && paidAmount > previousPaid) {
      const incrementAmount = paidAmount - previousPaid;
      try {
        const { walletRepo } = await import("@/lib/repository-instances");
        walletRepo.setTenantContext(this["tenantContext"], this["branchId"]);
        await walletRepo.recordTransaction(currentWalletId, {
          type: "debit",
          amount: incrementAmount,
          sourceType: "purchase",
          sourceId: id,
          description: `Pembayaran supplier ${row.invoice_number ?? id}`,
        });
      } catch (walletErr) {
        console.warn("[SupplierRepo] Failed to record wallet transaction:", walletErr);
      }
    }

    const inv = updated as any;
    return {
      id: inv.id,
      tenantId: this.pharmacyId ?? "",
      invoiceNumber: inv.invoice_number,
      supplierId: inv.supplier_id,
      supplierName: inv.supplier?.name ?? "",
      purchaseDate: inv.purchase_date,
      dueDate: inv.due_date ?? undefined,
      status: inv.status,
      totalAmount: inv.total_amount,
      paidAmount: inv.paid_amount,
      items: [], // Payment update doesn't reload items
    };
  }

  async createPurchaseInvoice(data: {
    invoiceNumber: string;
    supplierId: string;
    supplierName?: string;
    purchaseDate?: string;
    dueDate?: string;
    status?: PurchaseStatus;
    totalAmount?: number;
    paidAmount?: number;
    walletId?: string;
    items: {
      productId: string;
      productName?: string;
      batchNumber: string;
      expiredDate: string;
      quantity: number;
      unitPrice: number;
      sellingPrice: number;
    }[];
  }): Promise<PurchaseInvoice> {
    if (!this.isConnected) throw new Error("Not connected");

    // Insert invoice
    const invoiceInsert: Record<string, unknown> = {
      invoice_number: data.invoiceNumber,
      supplier_id: data.supplierId,
      purchase_date:
        data.purchaseDate ?? new Date().toISOString().split("T")[0] ?? "",
      due_date: data.dueDate ?? null,
      status: data.status ?? "unpaid",
      total_amount: data.totalAmount ?? 0,
      paid_amount: data.paidAmount ?? 0,
    };
    if (this.getTenantId()) {
      invoiceInsert["tenant_id"] = this.getTenantId();
    }
    if (data.walletId) {
      invoiceInsert["wallet_id"] = data.walletId;
    }
    if (this.branchId) {
      invoiceInsert["pharmacy_id"] = this.branchId;
    }

    const { data: inv, error: invError } = await this.client
      .from("purchase_invoices")
      .insert(invoiceInsert)
      .select(`*, supplier:supplier_id(name)`)
      .single();

    if (invError) return this.handleError(invError, "createPurchaseInvoice");

    // Insert items
    let insertedItems: Record<string, unknown>[] = [];
    if (data.items.length > 0) {
      const { data: items, error: itemError } = await this.client
        .from("purchase_items")
        .insert(
          data.items.map((item) => {
            const row: Record<string, unknown> = {
              invoice_id: inv.id,
              product_id: item.productId,
              batch_number: item.batchNumber,
              expired_date: item.expiredDate,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              selling_price: item.sellingPrice,
            };
            if (this.getTenantId()) {
              row["tenant_id"] = this.getTenantId();
            }
            return row;
          }),
        )
        .select(`*, product:product_id(name)`);

      if (itemError)
        return this.handleError(itemError, "createPurchaseInvoice");

      insertedItems = (items || []) as unknown as Record<string, unknown>[];
    }

    return {
      id: inv.id,
      tenantId: this.pharmacyId ?? "",
      invoiceNumber: inv.invoice_number,
      supplierId: inv.supplier_id,
      supplierName:
        data.supplierName ??
        ((inv as any).supplier?.name as string) ??
        "",
      purchaseDate: inv.purchase_date,
      dueDate: inv.due_date ?? undefined,
      status: inv.status as PurchaseStatus,
      totalAmount: inv.total_amount,
      paidAmount: inv.paid_amount,
      items: insertedItems.map(
        (item: Record<string, unknown>) =>
          ({
            id: (item as any).id,
            productId: (item as any).product_id,
            productName:
              ((item as any).product?.name as string) ??
              data.items.find((i) => i.productId === (item as any).product_id)
                ?.productName ??
              "",
            batchNumber: (item as any).batch_number,
            expiredDate: (item as any).expired_date,
            quantity: (item as any).quantity,
            unitPrice: (item as any).unit_price,
            sellingPrice: (item as any).selling_price,
          }) as PurchaseItem,
      ),
    };
  }
}
