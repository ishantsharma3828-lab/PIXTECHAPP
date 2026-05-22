/**
 * services/activityLogService.ts
 * Tracks real user actions: logins, logouts, sales, ticket events.
 * Used by UserProfilePanel to show real timeline and performance data.
 */

import { UserActivity } from '../constants/userTypes';

const ACTIVITY_KEY = 'pos_user_activity_log';

export interface ActivityEntry {
    id: string;
    userId: string;
    username: string;
    timestamp: string;
    action: string;
    details: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    meta?: Record<string, any>; // Extra data (saleId, ticketId, amount, etc.)
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export const getAllActivity = (): ActivityEntry[] => {
    try {
        const stored = localStorage.getItem(ACTIVITY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const getActivityForUser = (userId: string): UserActivity[] => {
    const all = getAllActivity();
    return all
        .filter(e => e.userId === userId)
        .slice(0, 100) // Last 100 entries per user
        .map(e => ({
            id: e.id,
            userId: e.userId,
            timestamp: e.timestamp,
            action: e.action,
            details: e.details,
            type: e.type,
        }));
};

// ─── Performance Calc ──────────────────────────────────────────────────────────

export const getPerformanceForUser = (userId: string) => {
    const all = getAllActivity().filter(e => e.userId === userId);
    
    const sales = all.filter(e => e.meta?.type === 'sale');
    const salesVolume = sales.reduce((sum, e) => sum + (e.meta?.amount || 0), 0);
    const avgBasketSize = sales.length > 0 ? Math.round(salesVolume / sales.length) : 0;
    
    const ticketsClosed = all.filter(e => e.meta?.type === 'ticket_closed').length;
    const totalTickets = all.filter(e => e.meta?.type === 'ticket_created' || e.meta?.type === 'ticket_closed').length;

    return {
        salesVolume: Math.round(salesVolume),
        avgBasketSize,
        errorRate: 0,         // Not tracked yet
        refundRatio: 0,       // Not tracked yet
        cashDiscrepancies: 0, // Not tracked yet
        ticketsClosed,
        totalTickets,
        totalSales: sales.length,
    };
};

// ─── Write ─────────────────────────────────────────────────────────────────────

const log = (entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void => {
    try {
        const all = getAllActivity();
        const newEntry: ActivityEntry = {
            ...entry,
            id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
        };
        // Prepend; keep last 2000 entries total across all users
        const updated = [newEntry, ...all].slice(0, 2000);
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
    } catch {
        // Silently ignore storage errors
    }
};

// ─── Specific Event Loggers ────────────────────────────────────────────────────

export const logLogin = (userId: string, username: string): void => {
    log({ userId, username, action: 'Logged In', details: `Session started for @${username}`, type: 'info', meta: { type: 'login' } });
};

export const logLogout = (userId: string, username: string): void => {
    log({ userId, username, action: 'Logged Out', details: `Session ended for @${username}`, type: 'info', meta: { type: 'logout' } });
};

export const logSale = (userId: string, username: string, saleId: string, amount: number, customerName: string): void => {
    log({
        userId, username,
        action: 'Sale Completed',
        details: `Processed sale of ${amount.toFixed(2)} for ${customerName} (${saleId})`,
        type: 'success',
        meta: { type: 'sale', saleId, amount, customerName },
    });
};

export const logTicketCreated = (userId: string, username: string, ticketNumber: string, deviceType: string): void => {
    log({
        userId, username,
        action: 'Ticket Created',
        details: `Opened repair ticket ${ticketNumber} for ${deviceType}`,
        type: 'info',
        meta: { type: 'ticket_created', ticketNumber },
    });
};

export const logTicketStatusChange = (userId: string, username: string, ticketNumber: string, newStatus: string): void => {
    const statusLabels: Record<string, string> = {
        diagnosis: 'moved to Diagnosis',
        pending_admin: 'submitted diagnosis for admin review',
        pending_customer: 'sent quote for customer approval',
        repair: 'started Repair',
        qc: 'moved to QC Check',
        ready: 'marked device Ready for Pickup',
        closed: 'closed ticket',
    };
    const isClosed = newStatus === 'closed';
    log({
        userId, username,
        action: `Ticket ${statusLabels[newStatus] || `status → ${newStatus}`}`,
        details: `Ticket ${ticketNumber} ${statusLabels[newStatus] || `updated to ${newStatus}`}`,
        type: isClosed ? 'success' : 'info',
        meta: { type: isClosed ? 'ticket_closed' : 'ticket_updated', ticketNumber, newStatus },
    });
};

export const logRMA = (userId: string, username: string, rmaNumber: string, actionDesc: string): void => {
    log({
        userId, username,
        action: 'RMA Update',
        details: `RMA ${rmaNumber}: ${actionDesc}`,
        type: 'warning',
        meta: { type: 'rma_update', rmaNumber },
    });
};

export const logRMACreated = (userId: string, username: string, rmaNumber: string): void => {
    log({
        userId, username,
        action: 'RMA Created',
        details: `Created RMA ${rmaNumber}`,
        type: 'warning',
        meta: { type: 'rma_created', rmaNumber },
    });
};

export const logRMAStatusChange = (userId: string, username: string, rmaNumber: string, status: string): void => {
    log({
        userId, username,
        action: 'RMA Status Change',
        details: `RMA ${rmaNumber} updated to ${status}`,
        type: status === 'closed' || status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'info',
        meta: { type: 'rma_status', rmaNumber, status },
    });
};

export const logExpenseCreated = (userId: string, username: string, expenseId: string, amount: number): void => {
    log({
        userId, username,
        action: 'Expense Submitted',
        details: `Submitted new expense ${expenseId} for ${amount}`,
        type: 'info',
        meta: { type: 'expense_created', expenseId, amount },
    });
};

export const logExpenseStatusChange = (userId: string, username: string, expenseId: string, status: string): void => {
    log({
        userId, username,
        action: 'Expense Update',
        details: `Expense ${expenseId} marked as ${status}`,
        type: status === 'approved' || status === 'paid' ? 'success' : status === 'rejected' || status === 'cancelled' ? 'danger' : 'warning',
        meta: { type: 'expense_status', expenseId, status },
    });
};

export const logDeliveryStatusChange = (userId: string, username: string, saleId: string, status: string): void => {
    log({
        userId, username,
        action: 'Delivery Update',
        details: `Delivery for sale ${saleId} marked as ${status}`,
        type: status === 'delivered' ? 'success' : status === 'returned' ? 'danger' : 'info',
        meta: { type: 'delivery_status', saleId, status },
    });
};

export const logZRExpressSync = (userId: string, username: string, orderCount: number): void => {
    log({
        userId, username,
        action: 'ZR Express Sync',
        details: `Synced ${orderCount} orders from ZR Express`,
        type: 'info',
        meta: { type: 'zr_sync', orderCount },
    });
};
