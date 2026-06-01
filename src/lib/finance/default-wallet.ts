import { walletRepo } from "@/lib/repository-instances";
import type { WalletType } from "@/types";

/**
 * Resolve a default wallet for automatic transaction attachment.
 *
 * Priority:
 *   1. First active cash-type wallet in the given branch
 *   2. First active cash-type wallet in the tenant
 *   3. First active wallet of any type in the tenant
 *   4. null (no wallet — transaction will skip wallet recording)
 *
 * Used by POS sales when no explicit wallet is selected during payment.
 */
export async function getDefaultWallet(
  branchId?: string | null,
  preferredType?: WalletType,
): Promise<string | null> {
  const wallets = await walletRepo.getWallets({ includeArchived: false });

  if (!wallets.length) return null;

  const active = wallets.filter((w) => w.isActive);
  if (!active.length) return null;

  const targetType = preferredType ?? "cash";

  // 1. Branch + type match
  if (branchId) {
    const branchWallet = active.find(
      (w) => w.branchId === branchId && w.type === targetType,
    );
    if (branchWallet) return branchWallet.id;
  }

  // 2. Any branch, type match
  const typeMatch = active.find((w) => w.type === targetType);
  if (typeMatch) return typeMatch.id;

  // 3. First active wallet of any type
  return active[0]?.id ?? null;
}

/**
 * Resolve a wallet for supplier payment.
 * Priority: bank-type first, then cash, then any.
 */
export async function getDefaultPaymentWallet(branchId?: string | null): Promise<string | null> {
  return getDefaultWallet(branchId, "bank") ?? getDefaultWallet(branchId, "cash");
}
