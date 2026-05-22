/**
 * components/auth/TabGuard.tsx
 * Route-level access guard. Wrap each page component with this.
 *
 * Usage (in your router):
 *   <TabGuard tab="inventory"><InventoryPage /></TabGuard>
 */

import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface TabGuardProps {
  /** The tab key — must match the keys used in usePermissions allowedTabs. */
  tab: string;
  children: React.ReactNode;
  /** Custom fallback UI. Defaults to a centred "Access Restricted" message. */
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 p-8">
    <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
    <div className="text-center">
      <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-white">Access Restricted</h2>
      <p className="text-sm text-slate-500">You don't have permission to view this section.</p>
    </div>
  </div>
);

export const TabGuard: React.FC<TabGuardProps> = ({ tab, children, fallback }) => {
  const { allowedTabs } = usePermissions();
  if (!allowedTabs.has(tab)) return <>{fallback ?? <DefaultFallback />}</>;
  return <>{children}</>;
};

export default TabGuard;
