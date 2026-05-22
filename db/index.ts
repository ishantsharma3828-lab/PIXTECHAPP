/**
 * db/index.ts
 * WatermelonDB — Database Singleton (Titan Stack)
 *
 * ADAPTER STRATEGY:
 * - Development / Vite web build → LokiJS adapter (in-memory + localStorage, no native deps)
 * - Production native (React Native / Electron w/ better-sqlite3) → SQLite adapter
 *
 * To switch to SQLite in production, swap the adapter block below and
 * install `@nozbe/watermelondb/native` as documented in the WatermelonDB docs.
 */

import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import { schema } from './schema';
import Product from './models/Product';
import Customer from './models/Customer';
import Sale from './models/Sale';
import RepairTicket from './models/RepairTicket';
import User from './models/User';

// ─── Adapter Configuration ─────────────────────────────────────────────────────
// LokiJS is the web-safe adapter. It requires no native bindings and works
// perfectly inside Vite / Electron's renderer process.
// Data is persisted to localStorage (or an in-memory store in SSR).
const adapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: false, // Synchronous writes — ensures data survives browser refresh.
                                   // Incremental mode defers writes and loses data on quick refresh.
  onSetUpError: (error: Error) => {
    console.error('[WatermelonDB] Fatal setup error. DB may need to be wiped.', error);
  },
});

// ─── Database Instance ──────────────────────────────────────────────────────────
export const database = new Database({
  adapter,
  modelClasses: [
    Product,
    Customer,
    Sale,
    RepairTicket,
    User,
  ],
});

// ─── Collection Accessors ───────────────────────────────────────────────────────
// Convenience exports so services don't need to import `database` and call
// `.get()` manually every time.
export const productsCollection = database.get<Product>('products');
export const customersCollection = database.get<Customer>('customers');
export const salesCollection = database.get<Sale>('sales');
export const repairTicketsCollection = database.get<RepairTicket>('repair_tickets');
export const usersCollection = database.get<User>('users');

export { Product, Customer, Sale, RepairTicket, User };

// ─── Diagnostic Helper ──────────────────────────────────────────────────────────
/** Returns record counts from all collections for debugging / SystemHealth page */
export const getDatabaseStats = async () => {
  const [products, customers, sales, tickets, users] = await Promise.all([
    productsCollection.query().fetchCount(),
    customersCollection.query().fetchCount(),
    salesCollection.query().fetchCount(),
    repairTicketsCollection.query().fetchCount(),
    usersCollection.query().fetchCount(),
  ]);
  return { products, customers, sales, repairTickets: tickets, users };
};

// ─── Local-write sync trigger ────────────────────────────────────────────────
/**
 * Subscribes to WatermelonDB's internal change stream for all synced tables.
 * When any local write is committed (create, update, delete), it debounces
 * by 500ms and calls the provided `onWrite` callback — used by syncService
 * to push changes to PostgreSQL immediately instead of waiting for the poll.
 *
 * Returns an unsubscribe function for cleanup.
 */
export const subscribeToLocalWrites = (onWrite: () => void): (() => void) => {
  const TABLES = ['products', 'customers', 'sales', 'repair_tickets'];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const subscription = database
    .withChangesForTables(TABLES)
    .subscribe((changes) => {
      // withChangesForTables fires for both local and pulled changes.
      // Filter to only locally-originated writes (source !== 'sync').
      const hasLocalChange = changes?.some(
        (c: any) => c.record?._raw?._status !== 'synced'
      );
      if (!hasLocalChange) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onWrite();
      }, 500);
    });

  return () => {
    subscription.unsubscribe();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
};

