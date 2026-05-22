/**
 * services/billingService.ts
 * Titan Stack — Billing Service (WatermelonDB)
 *
 * Ported from RxDB to WatermelonDB. All sale/draft/customer operations
 * use the new query API. JSON payload columns (items, payments, etc.)
 * are serialized/deserialized at the service boundary.
 *
 * Public API is 100% compatible with the existing Billing UI components.
 */

import { Q } from '@nozbe/watermelondb';
import { database, salesCollection } from '../db';
import { CartItem, Sale, SaleStatus, DraftOrder, Customer, Coupon, AuditLogEntry } from '../constants/billingTypes';
import { updateProduct, getProducts } from './inventoryService';
import * as contactService from './contactService';
import * as businessRulesService from './businessRulesService';
import { getCurrentUser } from './authService';
import * as shippingService from './shippingService';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';

// ─── Map WatermelonDB Sale doc → Sale type ─────────────────────────────────────
const mapDocToSale = (doc: any): Sale => ({
  id:             doc.id,
  friendlyId:     doc.friendlyId,
  date:           new Date(doc.updatedAt || doc.syncedAt || Date.now()).toISOString(),
  organizationId: doc.organizationId,
  cashierId:      doc.cashierId,
  cashierName:    'Unknown',
  customerName:   'Customer',
  customerId:     doc.customerId,
  subtotal:       doc.subtotal,
  tax:            doc.tax,
  discount:       doc.discount,
  total:          doc.total,
  items:          doc.items,
  payments:       doc.payments,
  status:         doc.status as SaleStatus,
  syncStatus:     doc.syncedAt ? 'synced' : 'pending',
  deliveryDetails: doc.deliveryDetails,
  debtDetails:    doc.debtDetails,
  auditLog:       doc.auditLog,
});

// ─── Invoice Number Generator ──────────────────────────────────────────────────
const generateInvoiceNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix      = `INV-${currentYear}`;

  const recentDocs = await salesCollection.query(
    Q.sortBy('created_at', Q.desc),
    Q.take(50)
  ).fetch();

  let maxNum = 0;
  recentDocs.forEach((doc: any) => {
    const fid = doc.friendlyId;
    if (fid && fid.startsWith(prefix)) {
      const num = parseInt(fid.replace(prefix, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  let nextNum     = maxNum + 1;
  let candidateId = `${prefix}${String(nextNum).padStart(3, '0')}`;

  // Collision check
  let existing = await salesCollection.query(
    Q.where('friendly_id', candidateId)
  ).fetch();

  while (existing.length > 0) {
    nextNum++;
    candidateId = `${prefix}${String(nextNum).padStart(3, '0')}`;
    existing    = await salesCollection.query(Q.where('friendly_id', candidateId)).fetch();
  }

  return candidateId;
};

// ─── saveSale ──────────────────────────────────────────────────────────────────
export const saveSale = async (
  saleData: Omit<Sale, 'id' | 'date' | 'syncStatus' | 'auditLog'>
): Promise<Sale> => {
  const user      = getCurrentUser();
  const newSaleId = uuidv4();
  const nowMs     = Date.now();

  const initialAudit: AuditLogEntry = {
    timestamp: new Date(nowMs).toISOString(),
    action:    'created',
    user:      saleData.cashierName,
    details:   `Items: ${saleData.items.length}, Total: ${saleData.total}, Customer: ${saleData.customerName || 'Walk-in'}`,
  };

  let friendlyId = `TMP-${Date.now()}`;
  try { friendlyId = await generateInvoiceNumber(); } catch (e) {
    console.error('[Billing] Invoice number generation failed:', e);
    friendlyId = `INV-${Date.now().toString().slice(-6)}`;
  }

  const hasCOD     = saleData.payments.some(p => p.method === 'cod');
  const totalPaid  = saleData.payments.reduce((sum, p) => sum + p.amount, 0);

  let initialStatus: SaleStatus = saleData.status || 'completed';
  if (!saleData.status) {
    if (hasCOD) initialStatus = 'pending';
    else if (totalPaid < saleData.total - 0.01) initialStatus = 'pending';
  }

  // Persist to WatermelonDB
  await database.write(async () => {
    await salesCollection.create((r: any) => {
      r._raw.id           = newSaleId;
      r.organizationId    = user?.organizationId || 'local';
      r.cashierId         = user?.id || '';
      r.customerId        = saleData.customerId || '';
      r.friendlyId        = friendlyId;
      r.subtotal          = saleData.subtotal;
      r.tax               = saleData.tax;
      r.discount          = saleData.discount;
      r.total             = saleData.total;
      r.itemsJson         = JSON.stringify(saleData.items);
      r.paymentsJson      = JSON.stringify(saleData.payments);
      r.status            = initialStatus;
      r.deliveryDetailsJson = JSON.stringify(saleData.deliveryDetails || null);
      r.debtDetailsJson   = JSON.stringify(saleData.debtDetails || null);
      r.auditLogJson      = JSON.stringify([initialAudit]);
      r.syncedAt          = nowMs; // creation timestamp
    });
  });

  // Post-sale side effects (non-draft only)
  if (initialStatus !== 'draft') {
    // Update inventory
    for (const item of saleData.items) {
      try {
        const products = await getProducts();
        const current  = products.find(p => p.id === item.id);
        if (current) await updateProduct(item.id, { quantity: Math.max(0, current.quantity - item.quantity) });
      } catch (e) { console.error(`[Billing] Stock update failed for ${item.name}:`, e); }
    }

    // Update customer balance
    if (saleData.customerId) {
      try {
        const contacts = await contactService.getContacts();
        const contact  = contacts.find(c => c.id === saleData.customerId);
        if (contact) {
          const debtAmount = saleData.debtDetails?.totalDebtAmount || 0;
          await contactService.saveContact({ ...contact, currentBalance: contact.currentBalance + debtAmount });
        }
      } catch (e) { console.error('[Billing] Customer balance update failed:', e); }
    }

    // Create ZR Express order for COD
    if (hasCOD && saleData.deliveryDetails) {
      try {
        const zrResponse = await shippingService.createZRExpressOrder({
          ...saleData,
          id:          newSaleId,
          friendlyId,
          date:        new Date(nowMs).toISOString(),
          status:      initialStatus,
          syncStatus:  'pending',
          auditLog:    [],
          cashierId:   user?.id || 'unknown',
          cashierName: saleData.cashierName || 'Unknown',
        } as any);

        if (zrResponse) {
          const savedDoc: any = await salesCollection.find(newSaleId).catch(() => null);
          if (savedDoc) {
            await database.write(async () => {
              await savedDoc.update((r: any) => {
                r.deliveryDetailsJson = JSON.stringify({
                  ...saleData.deliveryDetails,
                  zrExpressParcelId:      zrResponse.parcelId,
                  zrExpressTrackingNumber: zrResponse.trackingNumber,
                });
              });
            });
          }
        }
      } catch (e) { console.error('[Billing] ZR Express order failed:', e); }
    }
  }

  return {
    ...saleData,
    id: newSaleId,
    friendlyId,
    date:       new Date(nowMs).toISOString(),
    syncStatus: 'pending',
    auditLog:   [initialAudit],
    status:     initialStatus,
  };
};

// ─── getSalesHistory ───────────────────────────────────────────────────────────
export const getSalesHistory = async (): Promise<Sale[]> => {
  const docs = await salesCollection.query(
    Q.sortBy('created_at', Q.desc)
  ).fetch();
  return docs.map(mapDocToSale);
};

// ─── updateSale ───────────────────────────────────────────────────────────────
export const updateSale = async (saleId: string, updates: Partial<Sale>): Promise<void> => {
  let doc: any;
  try { doc = await salesCollection.find(saleId); } catch { return; }

  await database.write(async () => {
    await doc.update((r: any) => {
      if (updates.status         !== undefined) r.status          = updates.status;
      if (updates.items          !== undefined) r.itemsJson        = JSON.stringify(updates.items);
      if (updates.payments       !== undefined) r.paymentsJson     = JSON.stringify(updates.payments);
      if (updates.deliveryDetails !== undefined) r.deliveryDetailsJson = JSON.stringify(updates.deliveryDetails);
      if (updates.debtDetails    !== undefined) r.debtDetailsJson  = JSON.stringify(updates.debtDetails);
      if (updates.auditLog       !== undefined) r.auditLogJson     = JSON.stringify(updates.auditLog);
      r.syncedAt = 0; // Mark as needing re-sync
    });
  });
};

// ─── voidSale ─────────────────────────────────────────────────────────────────
export const voidSale = async (saleId: string, _user: string, _reason: string): Promise<Sale | null> => {
  let doc: any;
  try { doc = await salesCollection.find(saleId); } catch { return null; }

  await database.write(async () => {
    await doc.update((r: any) => { r.status = 'void'; });
  });

  return mapDocToSale(doc);
};

// ─── deleteSale ───────────────────────────────────────────────────────────────
export const deleteSale = async (saleId: string): Promise<boolean> => {
  let doc: any;
  try { doc = await salesCollection.find(saleId); } catch { return false; }
  await database.write(async () => { await doc.destroyPermanently(); });
  return true;
};

// ─── markCODPaid ──────────────────────────────────────────────────────────────
export const markCODPaid = async (saleId: string): Promise<Sale | null> => {
  let doc: any;
  try { doc = await salesCollection.find(saleId); } catch { return null; }

  const sale = mapDocToSale(doc);
  if (!sale.payments.some(p => p.method === 'cod')) throw new Error('Not a COD order');
  if (sale.status !== 'pending') return sale;

  const auditEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(), action: 'modified',
    user: 'Admin', details: 'COD Payment Collected on Delivery',
  };

  const newAuditLog = [...(sale.auditLog || []), auditEntry];

  await database.write(async () => {
    await doc.update((r: any) => {
      r.status       = 'completed';
      r.auditLogJson = JSON.stringify(newAuditLog);
      r.syncedAt     = 0;
    });
  });

  return { ...sale, status: 'completed', auditLog: newAuditLog };
};

// ─── updateDebtInstallment ────────────────────────────────────────────────────
export const updateDebtInstallment = async (
  saleId: string,
  installmentIndex: number,
  paymentMethod: 'cash' | 'card' | 'transfer' = 'cash'
): Promise<Sale | null> => {
  let doc: any;
  try { doc = await salesCollection.find(saleId); } catch { throw new Error('Sale not found'); }

  const sale = mapDocToSale(doc);
  if (!sale.debtDetails?.installments) throw new Error('No installments found');

  const installments  = [...sale.debtDetails.installments];
  const targetInst    = installments[installmentIndex];
  if (!targetInst || targetInst.isPaid) return sale;

  installments[installmentIndex] = { ...targetInst, isPaid: true, paidDate: new Date().toISOString() };

  const amountPaid    = targetInst.amount;
  const currentPaid   = sale.debtDetails.paidAmount || sale.debtDetails.advancePayment || 0;
  const currentRemain = sale.debtDetails.remainingAmount ?? sale.debtDetails.totalDebtAmount;
  const newPaid       = currentPaid + amountPaid;
  const newRemaining  = Math.max(0, currentRemain - amountPaid);
  const isFullyPaid   = newRemaining <= 0.01;

  const newPayment: any = {
    id: `pay_inst_${Date.now()}`, method: paymentMethod, amount: amountPaid,
    timestamp: new Date().toISOString(),
    note: `Installment ${installmentIndex + 1} Payment via ${paymentMethod}`,
  };

  const newPayments     = [...sale.payments, newPayment];
  const newStatus       = isFullyPaid ? 'completed' : sale.status;
  const updatedDebt     = { ...sale.debtDetails, installments, paidAmount: newPaid, remainingAmount: newRemaining };
  const auditEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(), action: 'modified', user: 'Admin',
    details: `Paid Installment #${installmentIndex + 1} (${amountPaid}) via ${paymentMethod}`,
  };
  const newAuditLog = [...(sale.auditLog || []), auditEntry];

  // Update customer balance
  if (sale.customerId) {
    try {
      const contacts = await contactService.getContacts();
      const contact  = contacts.find(c => c.id === sale.customerId);
      if (contact) {
        await contactService.saveContact({ ...contact, currentBalance: contact.currentBalance - amountPaid });
      }
    } catch (e) { console.error('[Billing] Balance update after installment failed:', e); }
  }

  await database.write(async () => {
    await doc.update((r: any) => {
      r.status          = newStatus;
      r.paymentsJson    = JSON.stringify(newPayments);
      r.debtDetailsJson = JSON.stringify(updatedDebt);
      r.auditLogJson    = JSON.stringify(newAuditLog);
      r.syncedAt        = 0;
    });
  });

  return { ...sale, status: newStatus as SaleStatus, payments: newPayments, debtDetails: updatedDebt, auditLog: newAuditLog };
};

// ─── updateDeliveryStatus ─────────────────────────────────────────────────────
export const updateDeliveryStatus = async (
  saleId: string,
  status: 'pending' | 'shipped' | 'delivered' | 'returned' | 'cancelled'
) => {
  let doc: any;
  try { doc = await salesCollection.find(saleId); } catch { return; }
  const sale = mapDocToSale(doc);

  await database.write(async () => {
    await doc.update((r: any) => {
      r.deliveryDetailsJson = JSON.stringify({
        ...(sale.deliveryDetails || {}), status, address: sale.deliveryDetails?.address || 'N/A',
      });
      r.syncedAt = 0;
    });
  });

  await shippingService.syncDelivery(sale, status);
};

// ─── Coupon & Cart Helpers (unchanged — pure computation) ─────────────────────
export const getAvailableCoupons = (): Coupon[] =>
  (businessRulesService.getCoupons() as any[]).filter(c => c.isActive) as unknown as Coupon[];

export const validateCoupon = (code: string, subtotal: number): { valid: boolean; coupon?: Coupon; error?: string } => {
  const coupons = getAvailableCoupons();
  const coupon  = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
  if (!coupon) return { valid: false, error: 'Invalid coupon code.' };
  if (coupon.minOrder && subtotal < coupon.minOrder) return { valid: false, error: `Minimum order of ${coupon.minOrder} required.` };
  if ((coupon as any).expiryDate && new Date((coupon as any).expiryDate) < new Date())
    return { valid: false, error: 'Coupon has expired.' };
  return { valid: true, coupon };
};

export const calculateLineTotal = (item: CartItem): number => {
  let price = item.unitPrice;
  if (item.discountType === 'percentage') price = price * (1 - item.discountValue / 100);
  else price = Math.max(0, price - item.discountValue);
  return Number((price * item.quantity).toFixed(2));
};

export const calculateCartTotals = (
  items: CartItem[],
  coupon: Coupon | null = null,
  pointsRedeemed: number = 0,
  shippingFee: number = 0
) => {
  const rules         = businessRulesService.getBusinessRules();
  const taxConfig     = rules.tax;
  const loyaltyConfig = rules.loyalty;

  const subtotal          = items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  let couponDiscountValue = 0;
  if (coupon) {
    couponDiscountValue = coupon.type === 'percentage'
      ? subtotal * (coupon.value / 100)
      : coupon.value;
  }

  const redemptionValue   = loyaltyConfig.redemptionRate || 0.01;
  const loyaltyDiscount   = pointsRedeemed * redemptionValue;
  const totalDiscounts    = couponDiscountValue + loyaltyDiscount;
  const taxableAmount     = Math.max(0, subtotal - totalDiscounts);

  let tax = 0, finalTotal = taxableAmount;
  if (taxConfig.enabled) {
    const rate = taxConfig.defaultTaxRate / 100;
    if (taxConfig.isTaxIncluded) {
      const base = taxableAmount / (1 + rate);
      tax        = taxableAmount - base;
      finalTotal = taxableAmount + shippingFee;
    } else {
      tax        = taxableAmount * rate;
      finalTotal = taxableAmount + tax + shippingFee;
    }
  } else {
    finalTotal = taxableAmount + shippingFee;
  }

  const pointsPerCurrency = loyaltyConfig.enabled ? (loyaltyConfig.pointsPerCurrency || 1) : 0;
  const pointsEarned      = Math.floor(finalTotal * pointsPerCurrency);

  return {
    subtotal:       Number(subtotal.toFixed(2)),
    tax:            Number(tax.toFixed(2)),
    autoDiscount:   0,
    couponDiscount: Number(couponDiscountValue.toFixed(2)),
    loyaltyDiscount: Number(loyaltyDiscount.toFixed(2)),
    totalDiscounts: Number(totalDiscounts.toFixed(2)),
    shippingFee:    Number(shippingFee.toFixed(2)),
    total:          Number(finalTotal.toFixed(2)),
    pointsEarned,
  };
};

// ─── Drafts (localStorage — unchanged) ────────────────────────────────────────
const DRAFTS_KEY = 'draftOrders';

export const saveDraft = (data: Omit<DraftOrder, 'id' | 'date'>): void => {
  const drafts: DraftOrder[] = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
  const newDraft: DraftOrder = { ...data, id: `draft_${Date.now()}`, date: new Date().toISOString() };
  localStorage.setItem(DRAFTS_KEY, JSON.stringify([newDraft, ...drafts]));
};

export const getDrafts = (): DraftOrder[] =>
  JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');

export const getQuotes = (): DraftOrder[] => getDrafts();

export const deleteDraft = (id: string): void => {
  const filtered = getDrafts().filter(d => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
};

// ─── Customers (delegates to contactService) ──────────────────────────────────
export const getCustomers = async (): Promise<Customer[]> => {
  const contacts = await contactService.getContacts();
  return contacts.map(c => ({
    id:            c.id,
    name:          c.name,
    phone:         c.phone || '',
    email:         c.email || '',
    address:       c.address || '',
    loyaltyPoints: 0,
    totalSpent:    0,
    currentBalance: c.currentBalance || 0,
    joinDate:      c.createdAt,
    tier:          'Bronze',
  }));
};

export const addCustomer = async (
  customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent' | 'tier' | 'currentBalance'>
): Promise<Customer> => {
  const contact = await contactService.createContact({
    name: customerData.name, phone: customerData.phone,
    email: customerData.email, address: customerData.address,
    roles: ['customer'], type: 'individual',
  });
  return {
    id: contact.id, name: contact.name,
    phone: contact.phone || '', email: contact.email || '',
    address: contact.address || '', loyaltyPoints: 0,
    totalSpent: 0, currentBalance: 0, joinDate: contact.createdAt, tier: 'Bronze',
  };
};

// ─── Export Helpers (unchanged — pure data transformation) ────────────────────
export const exportSalesToExcel = async (sales: Sale[]) => {
  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Data');
  worksheet.columns = [
    { header: 'Date',           key: 'date',     width: 20 },
    { header: 'Invoice #',      key: 'invoice',  width: 15 },
    { header: 'Cashier',        key: 'cashier',  width: 15 },
    { header: 'Customer',       key: 'customer', width: 20 },
    { header: 'Total',          key: 'total',    width: 15 },
    { header: 'Payment Method', key: 'method',   width: 20 },
    { header: 'Status',         key: 'status',   width: 15 },
    { header: 'Delivery',       key: 'delivery', width: 15 },
  ];
  sales.forEach(sale => {
    worksheet.addRow({
      date:     new Date(sale.date).toLocaleString(),
      invoice:  sale.friendlyId || sale.id.substring(0, 8),
      cashier:  sale.cashierName || 'Unknown',
      customer: sale.customerName || 'Walk-in',
      total:    sale.total,
      method:   sale.payments.map(p => p.method).join(', '),
      status:   sale.status,
      delivery: sale.deliveryDetails?.status || '-',
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link   = document.createElement('a');
  link.href    = URL.createObjectURL(blob);
  link.download = `sales_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSalesToCSV = (sales: Sale[]) => {
  const headers = ['Date', 'Invoice #', 'Cashier', 'Customer', 'Items', 'Total', 'Payment', 'Status'];
  const rows    = sales.map(s => [
    new Date(s.date).toLocaleString(), s.id,
    s.cashierName, s.customerName || 'Walk-in',
    s.items.length, s.total.toFixed(2),
    s.payments.map(p => p.method).join(', '), s.status,
  ]);
  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href  = URL.createObjectURL(blob);
  link.download = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
