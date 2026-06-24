/**
 * hooks/usePermissions.ts
 * Titan Stack — Centralised RBAC Permission Hook
 *
 * Single source of truth for all role-based access decisions.
 * Reads the authenticated user's roles[] array (additive/most-permissive model).
 *
 * Usage:
 *   const { canEditProduct, visiblePrices, allowedTabs } = usePermissions();
 */

import { useMemo } from 'react';
import { getCurrentUser } from '../services/authService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PriceKey = 'cost_price' | 'price1' | 'price2' | 'price3' | 'price4';

export interface Permissions {
  // ── Identity ──────────────────────────────────────────────────────────────
  roles: string[];
  isManager: boolean;
  isCashier: boolean;
  isCommercial: boolean;   // commission_commercial
  isCommercial2: boolean;  // commission_commercial2
  isRepairman: boolean;
  isSpecialClient: boolean;
  isCustomer: boolean;

  // ── Tab access ────────────────────────────────────────────────────────────
  /** Set of route-keys the current user may visit. */
  allowedTabs: Set<string>;

  // ── Inventory ─────────────────────────────────────────────────────────────
  canAddProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  canImportProducts: boolean;
  canBulkEdit: boolean;
  canBulkDelete: boolean;
  /** Which price columns are visible in inventory / billing. */
  visiblePrices: PriceKey[];
  /** Price tiers the user may select in billing (1-indexed numbers). */
  selectablePriceTiers: number[];
  /** Whether stock quantity and in/out-of-stock status are visible. */
  showStock: boolean;

  // ── Billing / POS ─────────────────────────────────────────────────────────
  canApplyDiscount: boolean;
  allowedPaymentMethods: string[];

  // ── Sales Log ─────────────────────────────────────────────────────────────
  canDeleteSale: boolean;
  canVoidSale: boolean;
  canViewRevenueSummary: boolean;
  /** Commission reps: UI should also reflect that only their sales are loaded. */
  salesScopedToSelf: boolean;

  // ── Service Desk ──────────────────────────────────────────────────────────
  canCreateTicket: boolean;
  canEditTicket: boolean;

  // ── Expenses ──────────────────────────────────────────────────────────────
  canAddExpense: boolean;
  canViewExpenseHistory: boolean;

  // ── RMA / Returns ─────────────────────────────────────────────────────────
  canViewSupplierWarranty: boolean;

  // ── User Management ───────────────────────────────────────────────────────
  canManageUsers: boolean;
}

// ─── Tab keys (match your router paths) ──────────────────────────────────────

const ALL_TABS = new Set([
  'dashboard', 'inventory', 'billing', 'sales-log', 'pc-configurator',
  'service-desk', 'expenses', 'rma', 'contacts', 'zr-orders',
  'delivery-manager', 'debt-manager',
  'user-management', 'business-rules', 'settings', 'staff-panel',
]);

const CASHIER_TABS = new Set([
  'dashboard', 'inventory', 'billing', 'sales-log', 'pc-configurator',
  'service-desk', 'expenses', 'rma', 'contacts', 'zr-orders', 'delivery-manager',
]);

const COMMERCIAL_TABS = new Set([
  'dashboard', 'inventory', 'billing', 'sales-log', 'pc-configurator',
]);

const REPAIRMAN_TABS = new Set([
  'dashboard', 'inventory', 'service-desk',
]);

const SPECIAL_CLIENT_TABS = new Set([
  'dashboard', 'inventory',
]);

// ─── Payment methods available to non-manager roles ───────────────────────────

const STANDARD_PAYMENT_METHODS = ['cash', 'card', 'transfer', 'cod'];

// ─── Resolution helpers ───────────────────────────────────────────────────────

/** Union of two Sets — used for additive multi-role tab merging. */
const unionSets = <T>(...sets: Set<T>[]): Set<T> =>
  new Set(sets.flatMap(s => [...s]));

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const usePermissions = (): Permissions => {
  const user = getCurrentUser();

  return useMemo<Permissions>(() => {
    // Resolve roles array — fall back to legacy single-role string
    const roles: string[] = (user as any)?.roles?.length
      ? (user as any).roles
      : [user?.role || 'customer'];

    /** True if the user has at least one of the given roles (additive model). */
    const has = (...r: string[]): boolean => r.some(role => roles.includes(role));

    // ── Identity ────────────────────────────────────────────────────────────
    const isManager      = has('manager', 'admin');
    const isCashier      = has('cashier');
    const isCommercial   = has('commission_commercial');
    const isCommercial2  = has('commission_commercial2');
    const isRepairman    = has('technician', 'repairman');
    const isSpecialClient = has('special_client');
    const isCustomer     = !isManager && !isCashier && !isCommercial && !isCommercial2 && !isRepairman && !isSpecialClient;

    // ── Tab access (additive: union all allowed tab sets) ───────────────────
    let allowedTabs = new Set<string>();
    if (isManager)       allowedTabs = ALL_TABS;
    if (isCashier)       allowedTabs = unionSets(allowedTabs, CASHIER_TABS);
    if (isCommercial)    allowedTabs = unionSets(allowedTabs, COMMERCIAL_TABS);
    if (isCommercial2)   allowedTabs = unionSets(allowedTabs, COMMERCIAL_TABS);
    if (isRepairman)     allowedTabs = unionSets(allowedTabs, REPAIRMAN_TABS);
    if (isSpecialClient) allowedTabs = unionSets(allowedTabs, SPECIAL_CLIENT_TABS);
    // customer: no tabs (website only)

    // ── Inventory ───────────────────────────────────────────────────────────
    const canEditProduct   = isManager;
    const canAddProduct    = isManager;
    const canDeleteProduct = isManager;
    const canImportProducts = isManager;
    const canBulkEdit      = isManager;
    const canBulkDelete    = isManager;
    const showStock        = !isSpecialClient; // special_client hides stock qty

    // Price visibility — additive: collect all visible prices across roles
    const visiblePriceSet = new Set<PriceKey>(['price1']); // everyone sees price1
    if (isManager)     { visiblePriceSet.add('price2'); visiblePriceSet.add('price3'); visiblePriceSet.add('price4'); visiblePriceSet.add('cost_price'); }
    if (isCommercial)  { visiblePriceSet.add('price2'); visiblePriceSet.add('price3'); }
    if (isCommercial2) { visiblePriceSet.add('price2'); visiblePriceSet.add('price3'); visiblePriceSet.add('price4'); }
    const visiblePrices = [...visiblePriceSet] as PriceKey[];

    // Selectable price tiers in Billing / PC Builder
    const tierSet = new Set<number>([1]);
    if (isManager)     { tierSet.add(2); tierSet.add(3); tierSet.add(4); }
    if (isCommercial)  { tierSet.add(2); tierSet.add(3); }
    if (isCommercial2) { tierSet.add(2); tierSet.add(3); tierSet.add(4); }
    const selectablePriceTiers = [...tierSet].sort();

    // ── Billing ─────────────────────────────────────────────────────────────
    const canApplyDiscount       = isManager;
    const allowedPaymentMethods  = STANDARD_PAYMENT_METHODS;

    // ── Sales Log ───────────────────────────────────────────────────────────
    const canDeleteSale         = isManager;
    const canVoidSale           = isManager;
    const canViewRevenueSummary = isManager;
    const salesScopedToSelf     = (isCommercial || isCommercial2) && !isManager;

    // ── Service Desk ────────────────────────────────────────────────────────
    const canCreateTicket = isManager || isCashier || isRepairman;
    const canEditTicket   = isManager || isRepairman; // cashier cannot edit

    // ── Expenses ────────────────────────────────────────────────────────────
    const canAddExpense          = isManager || isCashier;
    const canViewExpenseHistory  = isManager;

    // ── RMA ─────────────────────────────────────────────────────────────────
    const canViewSupplierWarranty = isManager;

    // ── User Management ───────────────────────────────────────────────────────
    const canManageUsers = isManager;

    return {
      roles,
      isManager, isCashier, isCommercial, isCommercial2,
      isRepairman, isSpecialClient, isCustomer,
      allowedTabs,
      canAddProduct, canEditProduct, canDeleteProduct, canImportProducts,
      canBulkEdit, canBulkDelete,
      visiblePrices, selectablePriceTiers, showStock,
      canApplyDiscount, allowedPaymentMethods,
      canDeleteSale, canVoidSale, canViewRevenueSummary, salesScopedToSelf,
      canCreateTicket, canEditTicket,
      canAddExpense, canViewExpenseHistory,
      canViewSupplierWarranty,
      canManageUsers,
    };
  }, [user?.id, (user as any)?.roles?.join(','), user?.role]);
};
