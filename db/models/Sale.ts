/**
 * db/models/Sale.ts
 * WatermelonDB Model — Sale / Order
 */

import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Sale extends Model {
  static table = 'sales';

  @text('organization_id') organizationId!: string;
  @text('cashier_id') cashierId!: string;
  @text('customer_id') customerId!: string;
  @text('friendly_id') friendlyId!: string;
  @field('subtotal') subtotal!: number;
  @field('tax') tax!: number;
  @field('discount') discount!: number;
  @field('total') total!: number;
  @text('items_json') itemsJson!: string;
  @text('payments_json') paymentsJson!: string;
  @text('status') status!: string;
  @text('delivery_details_json') deliveryDetailsJson!: string;
  @text('debt_details_json') debtDetailsJson!: string;
  @text('audit_log_json') auditLogJson!: string;
  @field('synced_at') syncedAt!: number;
  @field('updated_at') updatedAt!: number;

  get items(): any[] {
    try { return JSON.parse(this.itemsJson || '[]'); } catch { return []; }
  }

  get payments(): any[] {
    try { return JSON.parse(this.paymentsJson || '[]'); } catch { return []; }
  }

  get deliveryDetails(): any {
    try { return JSON.parse(this.deliveryDetailsJson || 'null'); } catch { return null; }
  }

  get debtDetails(): any {
    try { return JSON.parse(this.debtDetailsJson || 'null'); } catch { return null; }
  }

  get auditLog(): any[] {
    try { return JSON.parse(this.auditLogJson || '[]'); } catch { return []; }
  }
}
