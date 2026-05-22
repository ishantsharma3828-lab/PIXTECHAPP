
export type UserRole = 'admin' | 'manager' | 'cashier' | 'technician' | 'inventory_manager' | 'employee' | 'customer';
export type UserStatus = 'active' | 'suspended' | 'terminated';

export interface AccessRights {
    canVoidSales: boolean;
    canRefund: boolean;
    canEditStock: boolean;
    maxDiscountPercent: number; // 0-100
    accessReports: boolean;
    accessSettings: boolean;
}

export interface AppUser {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    roles?: string[];
    branch: string;
    email: string;
    phone: string;

    status: UserStatus;

    // Security
    requirePasswordChange: boolean;
    twoFactorEnabled: boolean;
    pinCode?: string; // Encrypted in real app
    password?: string;

    // Calculated
    riskScore: number; // 0-100
    lastLogin?: string;
    lastAction?: string;

    permissions: AccessRights;
    preferences?: {
        language?: string;
        notifications?: {
            orderStatus: boolean;
            ticketStatus: boolean;
        }
    };
}

export interface UserActivity {
    id: string;
    userId: string;
    timestamp: string;
    action: string;
    details: string;
    type: 'info' | 'warning' | 'danger' | 'success';
}

export interface UserPerformance {
    salesVolume: number;
    errorRate: number; // Percentage
    refundRatio: number; // Percentage
    avgBasketSize: number;
    cashDiscrepancies: number;
}
