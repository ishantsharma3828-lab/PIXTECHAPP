
export type ExpenseCategory = 'Rent' | 'Salaries' | 'Utilities' | 'Marketing' | 'Maintenance' | 'Logistics' | 'Inventory' | 'Office' | 'Other';
export type ExpensePaymentMethod = 'Cash' | 'Bank' | 'Card' | 'Cheque';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';

export interface Expense {
    id: string;
    date: string;
    category: ExpenseCategory;
    subcategory?: string;
    description: string;
    amount: number; // Total amount paid
    taxAmount: number;
    taxRate: number; // Percentage
    isTaxIncluded: boolean;
    paymentMethod: ExpensePaymentMethod;
    paidFrom: string; // e.g., "Cash Drawer", "Main Account"
    responsiblePerson: string;
    
    // Relationships
    relatedStoreId?: string;
    relatedTechnicianId?: string;
    relatedServiceTicketId?: string;
    
    receiptUrl?: string; // Data URL or Blob URL
    
    status: ExpenseStatus;
    createdBy: string;
    cancelledBy?: string;
    cancelledReason?: string;
}
