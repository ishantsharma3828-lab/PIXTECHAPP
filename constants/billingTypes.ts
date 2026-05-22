
import { Product } from './inventoryFields';

export interface CartItem extends Product {
  cartId: string; // Unique ID for this specific instance in cart
  quantity: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  notes?: string;
  unitPrice: number; // The base price selected (e.g. price1, price2, or custom)
  priceSelection: 'price1' | 'price2' | 'price3' | 'price4' | 'custom';
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  description: string;
  color?: string; // For UI styling
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  currentBalance: number;
  joinDate?: string;
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

export interface PaymentRecord {
  id: string;
  method: 'cash' | 'card' | 'transfer' | 'debt' | 'facilite' | 'cod';
  amount: number;
  timestamp: string;
  // Optional Metadata
  transactionId?: string;
  bankName?: string;
  receiptFile?: string | null; // Placeholder for file URL/Base64
  receiptName?: string;
  note?: string;
}

export interface DebtDetails {
  isDebt: boolean;
  totalDebtAmount: number;
  dueDate?: string;
  installmentPlan?: string;
  advancePayment?: number;
  notes?: string;
}

export interface Installment {
  id: string;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
}

export type DeliveryStatus = 'pending' | 'shipped' | 'delivered' | 'returned' | 'cancelled';

export interface DeliveryDetails {
  status: DeliveryStatus;
  address: string;
  driver?: string;
  trackingNumber?: string;
  scheduledDate?: string;
  notes?: string;
  // ZR Express integration fields
  zrExpressParcelId?: string;
  zrExpressTrackingNumber?: string;
  phone?: string;
  cityTerritoryId?: string;
  districtTerritoryId?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  action: 'created' | 'modified' | 'synced' | 'voided' | 'refunded' | 'printed';
  user: string;
  details?: string;
}

export type SaleStatus = 'completed' | 'pending' | 'refunded' | 'void' | 'draft';
export type SyncStatus = 'synced' | 'pending' | 'error';

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;

  // New Multi-Payment Structure
  payments: PaymentRecord[];
  debtDetails?: DebtDetails & {
    installments?: Installment[];
    netPayer?: number;
    paidAmount?: number;
    remainingAmount?: number;
  }; // Extended for Facilité
  deliveryDetails?: DeliveryDetails;

  friendlyId?: string; // e.g. "N° 01"

  // Legacy fields (kept optional for backward compatibility if needed)
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'split';
  paymentDetails?: any;

  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;

  cashierId: string;
  cashierName: string;
  status: SaleStatus;

  // Audit & Sync
  syncStatus?: SyncStatus;
  auditLog?: AuditLogEntry[];
  locationId?: string;
  organizationId?: string;
}

export interface DraftOrder {
  id: string;
  date: string;
  items: CartItem[];
  customer?: Customer | null;
  coupon?: Coupon | null;
  subtotal: number;
  total: number;
  pointsRedeemed: number;
  note?: string;
  cashierName?: string;
}
