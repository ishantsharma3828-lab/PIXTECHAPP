
export type RMAType = 'customer_return' | 'supplier_warranty';
export type RMAReason = 'doa' | 'defective' | 'wrong_item' | 'buyers_remorse' | 'warranty_claim';
export type RMACondition = 'new' | 'opened' | 'damaged';
export type RMAStatus = 'requested' | 'approved' | 'received' | 'inspecting' | 'pending_admin' | 'awaiting_supplier' | 'repaired' | 'replaced' | 'refunded' | 'closed' | 'rejected';

export interface RMA {
    id: string;
    rmaNumber: string;
    type: RMAType;
    
    // Links
    linkedDocumentId: string; // Invoice ID or PO ID
    contactId: string; // Customer or Supplier ID
    contactName: string;
    
    // Item Details
    productId: string;
    productName: string;
    serialNumber?: string;
    quantity: number;
    
    // Intake Info
    reason: RMAReason;
    condition: RMACondition;
    policyStatus: 'in_policy' | 'out_of_policy';
    customerNotes: string;
    images?: string[];
    
    // Status & Workflow
    status: RMAStatus;
    createdDate: string;
    updatedDate: string;
    assignedStaff?: string;
    
    // Resolution
    inspectionNotes?: string;
    technicianResult?: 'pass' | 'fail' | 'ntf'; // No Trouble Found
    financialImpact?: number; // Cost of refund/replacement
    resolution?: string;
}
