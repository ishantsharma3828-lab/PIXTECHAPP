
import { RMA, RMAType, RMAStatus } from '../constants/rmaTypes';
import * as billingService from './billingService';
import * as stockService from './stockService';
import * as activityLogService from './activityLogService';
import { getCurrentUser } from './authService';
import { addNotification } from './notificationService';

const RMA_KEY = 'pos_rma_db';

export const getRMAs = (): RMA[] => {
    try {
        const stored = localStorage.getItem(RMA_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const saveRMA = (rma: RMA): RMA => {
    const list = getRMAs();
    const index = list.findIndex(r => r.id === rma.id);

    if (index >= 0) {
        list[index] = { ...rma, updatedDate: new Date().toISOString() };
    } else {
        list.unshift(rma);
    }

    localStorage.setItem(RMA_KEY, JSON.stringify(list));
    return rma;
};

export const createRMA = (data: Partial<RMA>): RMA => {
    const count = getRMAs().length + 1;
    const year = new Date().getFullYear();

    const newRMA: RMA = {
        id: `rma_${Date.now()}`,
        rmaNumber: `RMA-${year}-${count.toString().padStart(4, '0')}`,
        type: 'customer_return',
        linkedDocumentId: '',
        contactId: '',
        contactName: 'Unknown',
        productId: '',
        productName: '',
        quantity: 1,
        reason: 'defective',
        condition: 'opened',
        policyStatus: 'in_policy',
        customerNotes: '',
        status: 'requested',
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        financialImpact: 0,
        ...data
    };

    const saved = saveRMA(newRMA);

    const user = getCurrentUser();
    if (user) {
        activityLogService.logRMACreated(user.id, user.username, saved.rmaNumber);
        addNotification({
            title: 'New RMA Created',
            message: `RMA ${saved.rmaNumber} has been logged by ${user.username}.`,
            type: 'info',
            roleTarget: ['admin', 'manager']
        });
    }

    return saved;
};

export const updateRMAStatus = (id: string, status: RMAStatus, extraData?: Partial<RMA>): RMA | null => {
    const list = getRMAs();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return null;

    const updated = {
        ...list[index],
        status,
        updatedDate: new Date().toISOString(),
        ...extraData
    };

    list[index] = updated;
    localStorage.setItem(RMA_KEY, JSON.stringify(list));

    const user = getCurrentUser();
    if (user) {
        activityLogService.logRMAStatusChange(user.id, user.username, updated.rmaNumber, status);
        addNotification({
            title: 'RMA Status Updated',
            message: `RMA ${updated.rmaNumber} is now ${status}.`,
            type: status === 'closed' ? 'success' : 'info',
            roleTarget: ['admin', 'manager', 'cashier']
        });
    }

    return updated;
};

// --- LOOKUP HELPERS ---

export const findSourceDocument = async (docId: string, type: RMAType) => {
    if (type === 'customer_return') {
        const sales = await billingService.getSalesHistory();
        // Loose search on ID or FriendlyID
        return sales.find(s =>
            s.id.toLowerCase().includes(docId.toLowerCase()) ||
            (s.friendlyId && s.friendlyId.toLowerCase().includes(docId.toLowerCase()))
        );
    } else {
        const pos = stockService.getPurchaseOrders();
        return pos.find(p => p.poNumber.toLowerCase().includes(docId.toLowerCase()) || (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(docId.toLowerCase())));
    }
};
