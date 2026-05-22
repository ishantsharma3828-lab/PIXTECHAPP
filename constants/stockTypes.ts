
export type POStatus = 'draft' | 'ordered' | 'in_transit' | 'partial' | 'received' | 'cancelled';
export type PaymentType = 'cash' | 'debit' | 'credit';

export interface Supplier {
    id: string;
    name: string;
    contact?: string;
    email?: string;
    balance?: number;
}

export interface POItem {
    productId: string;
    name: string;
    sku: string;
    expectedQty: number;
    receivedQty: number;
    damagedQty: number;
    unitCost: number; // The cost agreed upon purchase
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    invoiceNumber?: string;
    deliveryNote?: string;
    paymentType: PaymentType;
    status: POStatus;
    dateCreated: string;
    expectedDeliveryDate?: string;
    location?: string;
    notes?: string;
    items: POItem[];
    totalCost: number;
    totalPaid?: number;
}
