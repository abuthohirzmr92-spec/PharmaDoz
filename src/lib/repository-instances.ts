import { ProductRepository } from "./repositories/product";
import { SupplierRepository } from "./repositories/supplier";
import { InventoryRepository } from "./repositories/inventory";
import { TransactionRepository } from "./repositories/transaction";
import { AuthRepository } from "./repositories/auth";

export const productRepo = new ProductRepository();
export const supplierRepo = new SupplierRepository();
export const inventoryRepo = new InventoryRepository();
export const transactionRepo = new TransactionRepository();
export const authRepo = new AuthRepository();
