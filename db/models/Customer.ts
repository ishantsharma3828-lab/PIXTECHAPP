/**
 * db/models/Customer.ts
 * WatermelonDB Model — Customer
 */

import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Customer extends Model {
  static table = 'customers';

  @text('organization_id') organizationId!: string;
  @text('name') name!: string;
  @text('email') email!: string;
  @text('phone') phone!: string;
  @text('address') address!: string;
  @text('city') city!: string;
  @text('company_name') companyName!: string;
  @field('loyalty_points') loyaltyPoints!: number;
  @field('total_spent') totalSpent!: number;
  @field('current_balance') currentBalance!: number;
  @field('credit_limit') creditLimit!: number;
  @text('tier') tier!: string;
  @text('tags_json') tagsJson!: string;
  @text('notes') notes!: string;
  @text('status') status!: string;
  @field('updated_at') updatedAt!: number;

  get tags(): string[] {
    try { return JSON.parse(this.tagsJson || '[]'); } catch { return []; }
  }
}
