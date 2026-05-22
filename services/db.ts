/**
 * services/db.ts
 * Titan Stack — Database Compatibility Layer
 *
 * This file re-exports the WatermelonDB database and collections from
 * `db/index.ts`. It preserves the `getDatabase()` API that the rest of
 * the service layer relied on, making the migration incremental — existing
 * service files that called `getDatabase()` now receive the WatermelonDB
 * `database` instance through this shim.
 *
 * Services should migrate to import directly from `../db` over time,
 * but this shim ensures zero breaking changes immediately.
 */

export {
  database,
  productsCollection,
  customersCollection,
  salesCollection,
  repairTicketsCollection,
  usersCollection,
  getDatabaseStats,
} from '../db';

export type { default as Product } from '../db/models/Product';
export type { default as Customer } from '../db/models/Customer';
export type { default as Sale } from '../db/models/Sale';
export type { default as RepairTicket } from '../db/models/RepairTicket';
export type { default as User } from '../db/models/User';

// Legacy type aliases — preserve compatibility with existing service code
export type ProductDoc = InstanceType<typeof import('../db/models/Product').default>;
export type SaleDoc    = InstanceType<typeof import('../db/models/Sale').default>;
export type CustomerDoc = InstanceType<typeof import('../db/models/Customer').default>;

/**
 * @deprecated Use `database` from `../db` directly.
 * Kept for backwards compatibility with services that call `await getDatabase()`.
 * Returns the WatermelonDB database singleton wrapped in a Promise.
 */
export const getDatabase = async () => {
  const { database } = await import('../db');
  return database;
};
