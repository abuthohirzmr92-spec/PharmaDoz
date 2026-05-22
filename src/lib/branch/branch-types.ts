// ---------------------------------------------------------------------------
// Branch (pharmacy/cabang) type definitions
// Maps from the "pharmacies" DB table (snake_case) to camelCase application types
// ---------------------------------------------------------------------------

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isMain: boolean;
  isActive: boolean;
  openingTime: string | null;
  closingTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchContextValue {
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranch: (branch: Branch) => void;
  isLoading: boolean;
  error: string | null;
}
