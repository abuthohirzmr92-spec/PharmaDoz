import { ProductRepository } from "./repositories/product";
import { SupplierRepository } from "./repositories/supplier";
import { InventoryRepository } from "./repositories/inventory";
import { TransactionRepository } from "./repositories/transaction";
import { AuthRepository } from "./repositories/auth";
import { SuperAdminRepository } from "./repositories/super-admin";
import { WalletRepository } from "./repositories/wallet";
import { PackageRepository } from "./repositories/package";
import { CapitalRepository } from "./repositories/capital";
import { SalesReturnRepository } from "./repositories/sales-return";
import { ActivityLogRepository } from "./repositories/activity-log";
import { StorageAreaRepository } from "./repositories/storage-area";
import { SettingsRepository } from "./repositories/subscription-settings";
import { ServiceCatalogRepository } from "./repositories/service-catalog";
import { QuotaRepository } from "./repositories/quota";
import { SubscriptionRepository } from "./repositories/subscription";
import { TrialRequestRepository } from "./repositories/trial-request";
import { AddonRepository } from "./repositories/addon";
import { PromotionRepository } from "./repositories/promotion";
import { ReminderRepository } from "./repositories/reminder";
import { IntegrationRegistryRepository } from "./repositories/integration-registry";
import { SchedulerRunRepository } from "./repositories/scheduler-run";
import { InvoiceRepository } from "./repositories/invoice";
import { PaymentRepository } from "./repositories/payment";

export const storageAreaRepo = new StorageAreaRepository();
export const productRepo = new ProductRepository();
export const supplierRepo = new SupplierRepository();
export const inventoryRepo = new InventoryRepository();
export const transactionRepo = new TransactionRepository();
export const authRepo = new AuthRepository();
export const superAdminRepo = new SuperAdminRepository();
export const walletRepo = new WalletRepository();
export const packageRepo = new PackageRepository();
export const capitalRepo = new CapitalRepository();
export const salesReturnRepo = new SalesReturnRepository();
export const activityLogRepo = new ActivityLogRepository();

// --- SLE (Subscription Lifecycle Engine) — Batch 2A repositories ---
export const settingsRepo = new SettingsRepository();
export const serviceCatalogRepo = new ServiceCatalogRepository();
export const quotaRepo = new QuotaRepository();
export const subscriptionRepo = new SubscriptionRepository();
export const trialRequestRepo = new TrialRequestRepository();
export const addonRepo = new AddonRepository();
export const promotionRepo = new PromotionRepository();
export const reminderRepo = new ReminderRepository();
export const integrationRegistryRepo = new IntegrationRegistryRepository();
export const schedulerRunRepo = new SchedulerRunRepository();
export const invoiceRepo = new InvoiceRepository();
export const paymentRepo = new PaymentRepository();

// ---------------------------------------------------------------------------
// Privileged / injected repository set. Fresh instances bound to a specific
// client (e.g. service-role for cron) — obtained via the Server Client Factory.
// Does NOT mutate the anon singletons above. No shared mutable global client.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSleRepositories(client: any) {
  return {
    settings: new SettingsRepository(client),
    subscription: new SubscriptionRepository(client),
    reminder: new ReminderRepository(client),
    schedulerRun: new SchedulerRunRepository(client),
    invoice: new InvoiceRepository(client),
    payment: new PaymentRepository(client),
  };
}
