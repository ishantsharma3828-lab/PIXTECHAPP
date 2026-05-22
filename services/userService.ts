
import { AppUser, UserActivity, UserPerformance } from '../constants/userTypes';
import { getSalesHistory } from './billingService';

const USERS_KEY = 'pos_users_db';

const DEFAULT_PERMISSIONS = {
    admin: { canVoidSales: true, canRefund: true, canEditStock: true, maxDiscountPercent: 100, accessReports: true, accessSettings: true },
    manager: { canVoidSales: true, canRefund: true, canEditStock: true, maxDiscountPercent: 50, accessReports: true, accessSettings: false },
    cashier: { canVoidSales: false, canRefund: false, canEditStock: false, maxDiscountPercent: 10, accessReports: false, accessSettings: false },
    technician: { canVoidSales: false, canRefund: false, canEditStock: true, maxDiscountPercent: 0, accessReports: false, accessSettings: false },
    inventory_manager: { canVoidSales: false, canRefund: false, canEditStock: true, maxDiscountPercent: 0, accessReports: true, accessSettings: false },
};

const MOCK_USERS: AppUser[] = [
    {
        id: 'u1', username: 'admin', fullName: 'System Administrator', role: 'admin', branch: 'Main HQ', email: 'admin@pos.com', phone: '555-0000',
        status: 'active', requirePasswordChange: false, twoFactorEnabled: true, riskScore: 0,
        permissions: DEFAULT_PERMISSIONS.admin, lastLogin: new Date().toISOString(), password: 'password'
    },
    {
        id: 'u2', username: 'sarah_m', fullName: 'Sarah Manager', role: 'manager', branch: 'Downtown Store', email: 'sarah@pos.com', phone: '555-1111',
        status: 'active', requirePasswordChange: false, twoFactorEnabled: false, riskScore: 12,
        permissions: DEFAULT_PERMISSIONS.manager, lastLogin: new Date(Date.now() - 86400000).toISOString(), password: 'password'
    },
    {
        id: 'u3', username: 'mike_c', fullName: 'Mike Cashier', role: 'cashier', branch: 'Downtown Store', email: 'mike@pos.com', phone: '555-2222',
        status: 'active', requirePasswordChange: true, twoFactorEnabled: false, riskScore: 45, // High risk due to voids?
        permissions: DEFAULT_PERMISSIONS.cashier, lastLogin: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 'u4', username: 'alex_t', fullName: 'Alex Tech', role: 'technician', branch: 'Service Center', email: 'alex@pos.com', phone: '555-3333',
        status: 'suspended', requirePasswordChange: false, twoFactorEnabled: false, riskScore: 88,
        permissions: DEFAULT_PERMISSIONS.technician, lastLogin: new Date(Date.now() - 604800000).toISOString()
    },
];

export const getUsers = (): AppUser[] => {
    try {
        const stored = localStorage.getItem(USERS_KEY);
        if (stored) return JSON.parse(stored);
        localStorage.setItem(USERS_KEY, JSON.stringify(MOCK_USERS));
        return MOCK_USERS;
    } catch (e) {
        return [];
    }
};

export const saveUser = (user: AppUser): AppUser => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === user.id);

    if (index >= 0) {
        users[index] = user;
    } else {
        users.push(user);
    }

    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return user;
};

export const createUser = (data: Partial<AppUser>): AppUser => {
    const role = data.role || 'cashier';
    const newUser: AppUser = {
        id: `user_${Date.now()}`,
        username: data.username || '',
        fullName: data.fullName || '',
        role,
        branch: data.branch || 'Main',
        email: data.email || '',
        phone: data.phone || '',
        status: 'active',
        requirePasswordChange: true,
        twoFactorEnabled: false,
        riskScore: 0,
        permissions: DEFAULT_PERMISSIONS[role],
        password: data.password || '',
        ...data
    } as AppUser;

    return saveUser(newUser);
};

export const deleteUser = (userId: string): boolean => {
    const users = getUsers();
    const filtered = users.filter(u => u.id !== userId);

    if (filtered.length === users.length) return false;

    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
    return true;
};

export const resetUserPassword = (userId: string) => {
    // In a real app, this would trigger an API call
    console.log(`Password reset for ${userId}`);
    return true;
};

// --- MOCK ACTIVITY ---

export const getUserActivity = async (userId: string): Promise<UserActivity[]> => {
    try {
        const sales = await getSalesHistory();
        const userSales = sales.filter(s => s.cashierId === userId);
        
        const salesActivity: UserActivity[] = userSales.map(sale => ({
            id: sale.id,
            userId,
            timestamp: sale.date,
            action: sale.status === 'void' ? 'Void' : 'Sale',
            details: sale.status === 'void' 
                ? `Voided Sale #${sale.friendlyId || sale.id.slice(0,8)}`
                : `Processed Sale #${sale.friendlyId || sale.id.slice(0,8)} (${sale.total.toFixed(2)})`,
            type: sale.status === 'void' ? 'warning' : 'success'
        }));

        // Dynamically import activityLogService to avoid circular dependency issues if any
        const activityLog = await import('./activityLogService');
        const otherActivity = activityLog.getActivityForUser(userId).filter(a => a.action !== 'Sale Completed');

        return [...salesActivity, ...otherActivity]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50);
    } catch (e) {
        console.error("Error fetching user activity:", e);
        return [];
    }
};

export const getUserPerformance = async (userId: string): Promise<UserPerformance> => {
    try {
        const sales = await getSalesHistory();
        const userSales = sales.filter(s => s.cashierId === userId);
        
        let salesVolume = 0;
        let totalItems = 0;
        let voids = 0;
        
        userSales.forEach(s => {
            if (s.status === 'void') {
                voids++;
            } else {
                salesVolume += s.total;
                totalItems += s.items.reduce((sum, item: any) => sum + item.quantity, 0);
            }
        });
        
        const validSalesCount = userSales.length - voids;
        const avgBasketSize = validSalesCount > 0 ? Math.round(totalItems / validSalesCount) : 0;
        const errorRate = userSales.length > 0 ? parseFloat(((voids / userSales.length) * 100).toFixed(1)) : 0;
        
        return {
            salesVolume,
            errorRate,
            refundRatio: errorRate,
            avgBasketSize,
            cashDiscrepancies: 0
        };
    } catch (e) {
        console.error("Error fetching user performance:", e);
        return { salesVolume: 0, errorRate: 0, refundRatio: 0, avgBasketSize: 0, cashDiscrepancies: 0 };
    }
};
