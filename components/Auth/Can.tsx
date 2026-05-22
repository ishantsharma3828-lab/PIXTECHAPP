/**
 * components/auth/Can.tsx
 * Inline permission gate for granular UI element hiding.
 *
 * Usage:
 *   <Can do="editProduct">
 *     <EditButton />
 *   </Can>
 *
 *   <Can do="viewRevenueSummary" fallback={<span>—</span>}>
 *     <RevenueWidget />
 *   </Can>
 */

import React from 'react';
import { usePermissions, Permissions } from '../../hooks/usePermissions';

// Map permission action strings → Permissions boolean keys
const ACTION_MAP: Record<string, keyof Permissions> = {
  addProduct:            'canAddProduct',
  editProduct:           'canEditProduct',
  deleteProduct:         'canDeleteProduct',
  importProducts:        'canImportProducts',
  bulkEdit:              'canBulkEdit',
  bulkDelete:            'canBulkDelete',
  applyDiscount:         'canApplyDiscount',
  deleteSale:            'canDeleteSale',
  voidSale:              'canVoidSale',
  viewRevenueSummary:    'canViewRevenueSummary',
  createTicket:          'canCreateTicket',
  editTicket:            'canEditTicket',
  addExpense:            'canAddExpense',
  viewExpenseHistory:    'canViewExpenseHistory',
  viewSupplierWarranty:  'canViewSupplierWarranty',
  showStock:             'showStock',
};

interface CanProps {
  /** Permission action key from ACTION_MAP above. */
  do: keyof typeof ACTION_MAP;
  children: React.ReactNode;
  /** Rendered when the permission is denied. Defaults to null (hidden). */
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ do: action, children, fallback = null }) => {
  const perms = usePermissions();
  const permKey = ACTION_MAP[action];
  const allowed = permKey ? (perms[permKey] as boolean) : false;
  return <>{allowed ? children : fallback}</>;
};

export default Can;
