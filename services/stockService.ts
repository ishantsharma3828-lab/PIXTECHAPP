
import { PurchaseOrder, POItem, Supplier, POStatus } from '../constants/stockTypes';
import * as inventoryService from './inventoryService';

const PO_KEY = 'pos_purchase_orders';
const SUPPLIERS_KEY = 'pos_suppliers';

// --- MOCK DATA ---
const MOCK_SUPPLIERS: Supplier[] = [
    { id: 'sup_1', name: 'Global Tech Dist', contact: 'Alice', balance: 0 },
    { id: 'sup_2', name: 'MegaParts Inc', contact: 'Bob', balance: 1200 },
    { id: 'sup_3', name: 'Local Supplies', contact: 'Charlie', balance: 0 },
];

// --- SUPPLIERS ---
export const getSuppliers = (): Supplier[] => {
    const stored = localStorage.getItem(SUPPLIERS_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(MOCK_SUPPLIERS));
    return MOCK_SUPPLIERS;
};

// --- PURCHASE ORDERS ---
export const getPurchaseOrders = (): PurchaseOrder[] => {
    try {
        const stored = localStorage.getItem(PO_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const savePurchaseOrder = (po: PurchaseOrder): void => {
    const orders = getPurchaseOrders();
    const index = orders.findIndex(o => o.id === po.id);
    if (index >= 0) {
        orders[index] = po;
    } else {
        orders.unshift(po);
    }
    localStorage.setItem(PO_KEY, JSON.stringify(orders));
};

export const createPO = (data: Partial<PurchaseOrder>): PurchaseOrder => {
    const count = getPurchaseOrders().length + 1;
    const newPO: PurchaseOrder = {
        id: `po_${Date.now()}`,
        poNumber: `PO-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`,
        supplierId: data.supplierId || '',
        supplierName: data.supplierName || 'Unknown',
        paymentType: 'cash',
        status: 'draft',
        dateCreated: new Date().toISOString(),
        items: [],
        totalCost: 0,
        ...data
    };
    savePurchaseOrder(newPO);
    return newPO;
};

// --- RECEIVING LOGIC ---

export const receiveItems = async (po: PurchaseOrder): Promise<PurchaseOrder> => {
    // 1. Update Inventory for each item
    for (const item of po.items) {
        if (item.receivedQty > 0) {
            try {
                // Fetch current product to calculate Weighted Average Cost
                const products = await inventoryService.getProducts();
                const product = products.find(p => p.id === item.productId);
                
                if (product) {
                    const currentQty = product.quantity;
                    const currentCost = product.costPrice || 0;
                    const incomingQty = item.receivedQty;
                    const incomingCost = item.unitCost;

                    // Weighted Average Formula:
                    // ((Current Qty * Current Cost) + (Incoming Qty * Incoming Cost)) / Total Qty
                    const totalValue = (currentQty * currentCost) + (incomingQty * incomingCost);
                    const totalQty = currentQty + incomingQty;
                    const newAverageCost = totalQty > 0 ? totalValue / totalQty : incomingCost;

                    await inventoryService.updateProduct(item.productId, {
                        quantity: totalQty,
                        costPrice: parseFloat(newAverageCost.toFixed(2))
                    });
                }
            } catch (e) {
                console.error(`Failed to update stock for ${item.name}`, e);
            }
        }
    }

    // 2. Update PO Status
    // If received < expected for any item, it might be partial. 
    // For simplicity here, we mark as 'received' if user clicks Finalize.
    const updatedPO: PurchaseOrder = {
        ...po,
        status: 'received'
    };
    savePurchaseOrder(updatedPO);
    return updatedPO;
};
