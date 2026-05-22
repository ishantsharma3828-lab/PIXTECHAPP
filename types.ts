
import React from 'react';

export interface NavItem {
  path: string;
  name: string;
  icon: React.ReactNode;
  roles?: ('admin' | 'employee' | 'manager' | 'cashier' | 'technician' | 'inventory_manager' | 'customer')[];
}
