/**
 * db/models/User.ts
 * WatermelonDB Model — Staff User / Profile
 */

import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @text('organization_id') organizationId!: string;
  @text('username') username!: string;
  @text('full_name') fullName!: string;
  @text('email') email!: string;
  @text('phone') phone!: string;
  @text('role') role!: string;
  @text('branch') branch!: string;
  @text('permissions_json') permissionsJson!: string;
  @text('pin_code_hash') pinCodeHash!: string;
  @field('updated_at') updatedAt!: number;

  get permissions(): Record<string, any> {
    try { return JSON.parse(this.permissionsJson || '{}'); } catch { return {}; }
  }
}
