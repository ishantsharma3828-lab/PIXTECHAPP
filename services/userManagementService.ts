/**
 * services/userManagementService.ts
 * Titan Stack — User Management via apiBridge
 *
 * All Supabase Admin API calls are replaced with apiBridge stubs.
 * The UI (UserManagement page) continues to work unchanged.
 */

import { users as apiUsers } from './apiBridge';
import { AppUser, UserRole } from '../constants/userTypes';
import { getActivityForUser, getPerformanceForUser } from './activityLogService';

const getPermissionsForRole = (role: string) => {
  const DEFAULT_PERMISSIONS = {
    admin:             { canVoidSales: true,  canRefund: true,  canEditStock: true,  maxDiscountPercent: 100, accessReports: true,  accessSettings: true  },
    manager:           { canVoidSales: true,  canRefund: true,  canEditStock: true,  maxDiscountPercent: 50,  accessReports: true,  accessSettings: false },
    cashier:           { canVoidSales: false, canRefund: false, canEditStock: false, maxDiscountPercent: 10,  accessReports: false, accessSettings: false },
    technician:        { canVoidSales: false, canRefund: false, canEditStock: true,  maxDiscountPercent: 0,   accessReports: false, accessSettings: false },
    inventory_manager: { canVoidSales: false, canRefund: false, canEditStock: true,  maxDiscountPercent: 0,   accessReports: true,  accessSettings: false },
  };
  return DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.cashier;
};

const mapToAppUser = (raw: any): AppUser => ({
  id:                   raw.id,
  username:             raw.username || raw.email?.split('@')[0] || 'user',
  fullName:             raw.full_name || raw.fullName || 'Unknown',
  role:                 (raw.role || 'cashier') as UserRole,
  roles:                raw.roles || [raw.role || 'cashier'],
  branch:               raw.branch || 'Main HQ',
  email:                raw.email || '',
  phone:                raw.phone || '',
  status:               raw.status || 'active',
  requirePasswordChange: false,
  twoFactorEnabled:     false,
  riskScore:            0,
  permissions:          getPermissionsForRole(raw.role),
  lastLogin:            raw.updated_at || raw.last_login,
});

export const getUsers = async (): Promise<AppUser[]> => {
  const { data, error } = await apiUsers.getAll();
  if (error || !data) {
    console.error('[UserManagement] Failed to fetch users:', error);
    return [];
  }
  return Array.isArray(data) ? data.map(mapToAppUser) : [];
};

export const saveUser = async (user: AppUser): Promise<AppUser> => {
  const { data, error } = await apiUsers.update(user.id!, {
    username: user.username,
    role:     user.role,
    phone:    user.phone,
    branch:   user.branch,
    full_name: user.fullName,
  });
  if (error) throw new Error(error);
  return data ? mapToAppUser(data) : user;
};

export const createUser = async (
  userData: Partial<AppUser> & { password?: string }
): Promise<AppUser> => {
  if (!userData.email || !userData.password) throw new Error('Email and password are required');

  const { data, error } = await apiUsers.create({
    email:    userData.email,
    password: userData.password,
    role:     userData.role || 'cashier',
    username: userData.username,
    fullName: userData.fullName,
    branch:   userData.branch,
  });

  if (error || !data) throw new Error(error || 'User creation failed');
  return mapToAppUser(data);
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const { error } = await apiUsers.delete(userId);
  if (error) {
    console.error('[UserManagement] Delete user failed:', error);
    return false;
  }
  return true;
};

// Real activity data from the activity log
export const getUserActivity  = (userId: string) => getActivityForUser(userId);
export const getUserPerformance = (userId: string) => getPerformanceForUser(userId);
