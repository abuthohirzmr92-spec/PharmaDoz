// ---------------------------------------------------------------------------
// Stock Transfer Type Definitions
// ---------------------------------------------------------------------------

export type TransferStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "in_transit"
  | "received";

export interface StockTransfer {
  id: string;
  fromPharmacyId: string;
  fromPharmacyName: string;
  toPharmacyId: string;
  toPharmacyName: string;
  productId: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferInput {
  fromPharmacyId: string;
  toPharmacyId: string;
  productId: string;
  batchId?: string;
  quantity: number;
  note?: string;
}

export interface TransferFilters {
  fromPharmacyId?: string;
  toPharmacyId?: string;
  status?: TransferStatus;
}
