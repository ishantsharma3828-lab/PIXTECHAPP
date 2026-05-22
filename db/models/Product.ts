/**
 * db/models/Product.ts
 * WatermelonDB Model — Product
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Product extends Model {
  static table = 'products';

  @text('organization_id') organizationId!: string;
  @text('name') name!: string;
  @text('sku') sku!: string;
  @text('brand') brand!: string;
  @text('category') category!: string;
  @field('cost_price') costPrice!: number;
  @field('price1') price1!: number;
  @field('price2') price2!: number;
  @field('price3') price3!: number;
  @field('price4') price4!: number;
  @field('quantity') quantity!: number;
  @field('min_stock') minStock!: number;
  @text('description') description!: string;
  @text('custom_fields_json') customFieldsJson!: string;
  @text('images_json') imagesJson!: string;
  @text('warranty_json') warrantyJson!: string;
  @text('approval_status') approvalStatus!: string;
  @field('is_deleted') isDeleted!: boolean;
  @field('updated_at') updatedAt!: number;

  // Computed accessors — serialize/deserialize JSON at the boundary
  get customFields(): Record<string, any> {
    try { return JSON.parse(this.customFieldsJson || '{}'); } catch { return {}; }
  }

  get images(): { id: string; url: string }[] {
    try { return JSON.parse(this.imagesJson || '[]'); } catch { return []; }
  }

  get warranty(): { enabled: boolean; days: number } {
    try { return JSON.parse(this.warrantyJson || '{"enabled":false,"days":0}'); } catch { return { enabled: false, days: 0 }; }
  }
}
