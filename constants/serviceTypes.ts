
import { Product } from './inventoryFields';

export type ServiceStatus = 
    | 'intake' 
    | 'diagnosis' 
    | 'pending_admin'      // Waiting for admin/manager hidden review
    | 'pending_customer'   // Waiting for customer to approve/decline
    | 'repair' 
    | 'qc' 
    | 'ready' 
    | 'closed';

export type UrgencyLevel = 'normal' | 'high' | 'emergency';

export interface DeviceCondition {
    screenOk: boolean;
    portsOk: boolean;
    bodyOk: boolean;
    batteryOk: boolean;
}

export interface TicketDevice {
    id: string;
    type: string;
    brand: string;
    model: string;
    serialNumber: string;
    password?: string; // Unlock code
    conditionNotes?: string;
    condition: DeviceCondition;
    accessories: string; // Cables, bags, etc. left with device
}

export interface ServiceItem {
    id: string;
    type: 'part' | 'labor';
    name: string;
    quantity: number;
    unitPrice: number;
    costPrice?: number;
    inventoryProductId?: string; // Link to inventory if it's a part
}

export interface DiagnosisPart {
    id: number;
    name: string;
    qty: number;
    price: number;
}

export interface ServiceTicket {
    id: string;
    ticketNumber: string; // Readable ID e.g., SR-1001
    customerId: string;
    customerName: string;
    customerPhone?: string;
    
    devices: TicketDevice[];
    
    problemDescription: string;
    
    urgency: UrgencyLevel;
    status: ServiceStatus;
    
    technicianId?: string;
    technicianName?: string;
    
    dateIn: string;
    dateEstimated?: string;
    dateOut?: string;
    
    technicianNotes: string;
    diagnosis: string;

    // Technician's original diagnosis (always preserved, repairman always sees this)
    diagnosisData: {
        techNotes: string;
        parts: DiagnosisPart[];
        laborCost: number;
        estimatedHours: number;
        approved: boolean;
    };

    // Admin/Manager hidden review — only visible to admin & cashier roles
    adminReview?: {
        adjustedParts: DiagnosisPart[];
        adjustedLaborCost: number;
        adminNotes: string;       // Internal only, never shown to repairman
        reviewedBy: string;
        reviewedAt: string;
    };

    // Customer's confirmation decision
    customerConfirmation?: {
        decision: 'approved' | 'declined';
        declineReason?: string;
        decidedAt: string;
        decidedBy: string; // Staff username who recorded the decision
    };
    
    repairNotes: string;
    
    qc: {
        checks: Record<string, boolean>;
        notes: string;
    };
    
    items: ServiceItem[]; // Parts and Labor
    
    totalEstimate: number;
    deposit: number;
}
