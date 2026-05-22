/**
 * services/authService.ts
 * Titan Stack — JWT-based Auth Service
 *
 * All auth operations now go through apiBridge.auth.*
 * JWT tokens are stored in localStorage via tokenManager.
 * The `User` type and local session cache are unchanged — the rest of
 * the app reads `getCurrentUser()` exactly as before.
 */

import { auth as apiAuth, tokenManager } from './apiBridge';
import { AccessRights } from '../constants/userTypes';
import * as activityLog from './activityLogService';
import { addNotification } from './notificationService';

const DEFAULT_PERMISSIONS: Record<string, AccessRights> = {
  admin:             { canVoidSales: true,  canRefund: true,  canEditStock: true,  maxDiscountPercent: 100, accessReports: true,  accessSettings: true  },
  manager:           { canVoidSales: true,  canRefund: true,  canEditStock: true,  maxDiscountPercent: 50,  accessReports: true,  accessSettings: false },
  cashier:           { canVoidSales: false, canRefund: false, canEditStock: false, maxDiscountPercent: 10,  accessReports: false, accessSettings: false },
  technician:        { canVoidSales: false, canRefund: false, canEditStock: true,  maxDiscountPercent: 0,   accessReports: false, accessSettings: false },
  inventory_manager: { canVoidSales: false, canRefund: false, canEditStock: true,  maxDiscountPercent: 0,   accessReports: true,  accessSettings: false },
  customer:          { canVoidSales: false, canRefund: false, canEditStock: false, maxDiscountPercent: 0,   accessReports: false, accessSettings: false },
};

export type User = {
  id?: string;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: 'admin' | 'employee' | 'manager' | 'cashier' | 'technician' | 'inventory_manager' | 'customer';
  branch?: string;
  organizationId: string;
  permissions: AccessRights;
  preferences?: {
    language?: string;
    notifications?: { orderStatus: boolean; ticketStatus: boolean; [key: string]: any; };
  };
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Maps a raw server user object to the typed `User` shape. */
const mapServerUser = (serverUser: any): User => {
  const role = serverUser?.role || 'customer';
  return {
    id:             serverUser?.id,
    email:          serverUser?.email || '',
    username:       serverUser?.username || serverUser?.email?.split('@')[0] || 'user',
    fullName:       serverUser?.full_name || serverUser?.fullName || 'User',
    phone:          serverUser?.phone || '',
    role:           role as User['role'],
    branch:         serverUser?.branch || '',
    organizationId: serverUser?.organization_id || serverUser?.organizationId || '',
    permissions:    serverUser?.permissions || DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.customer,
  };
};

/** Persists the user object to localStorage and returns it. */
const persistUser = (user: User): User => {
  localStorage.setItem('pos_user', JSON.stringify(user));
  return user;
};

// ─── Public Auth API ───────────────────────────────────────────────────────────

export const login = async (email: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await apiAuth.login(email, password);

    // OFFLINE / STUB MODE: If the bridge returns null (backend not ready),
    // fall back to a dev-mode local login using the cached user.
    if (!data && !error) {
      console.warn('[Auth] Backend not connected. Attempting local cache login.');
      const cached = getCurrentUser();
      if (cached && cached.email.toLowerCase() === email.toLowerCase()) return cached;

      // Minimal dev-mode admin user for local testing
      if (email === 'admin@pixtech.local') {
        const devUser: User = {
          id: 'dev-admin-001',
          email,
          username: 'admin',
          fullName: 'Dev Admin',
          role: 'admin',
          organizationId: 'dev-org-001',
          permissions: DEFAULT_PERMISSIONS.admin,
        };
        tokenManager.set('dev-jwt-placeholder');
        return persistUser(devUser);
      }
      return null;
    }

    if (error || !data) {
      console.error('[Auth] Login failed:', error);
      return null;
    }

    // Store the JWT
    if (data.token) tokenManager.set(data.token);

    const user = mapServerUser(data.user || data);
    const persisted = persistUser(user);
    // Log the login event for activity timeline
    if (persisted.id) activityLog.logLogin(persisted.id, persisted.username);
    return persisted;
  } catch (e) {
    console.error('[Auth] Login exception:', e);
    return null;
  }
};

export const register = async (
  email: string,
  password: string,
  fullName: string,
  storeName: string
): Promise<User | null> => {
  try {
    const { data, error } = await apiAuth.register({ email, password, fullName, storeName });
    if (error || !data) {
      console.error('[Auth] Register failed:', error);
      throw new Error(error || 'Registration failed');
    }
    if (data.token) tokenManager.set(data.token);
    const user = mapServerUser(data.user || data);
    return persistUser(user);
  } catch (e: any) {
    console.error('[Auth] Register exception:', e);
    throw e;
  }
};

export const logout = async (): Promise<void> => {
  // Log the logout before clearing session
  const current = getCurrentUser();
  if (current?.id) activityLog.logLogout(current.id, current.username);
  try {
    await apiAuth.logout();
  } catch (e) {
    console.warn('[Auth] Logout API call failed, clearing local session anyway.');
  }
  tokenManager.clear();
  localStorage.removeItem('pos_user');
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('pos_user');
  if (!userStr) return null;
  try {
    const u = JSON.parse(userStr) as User;
    // Ensure permissions are populated even for stale cache entries
    if (!u.permissions) {
      u.permissions = DEFAULT_PERMISSIONS[u.role] || DEFAULT_PERMISSIONS.customer;
      localStorage.setItem('pos_user', JSON.stringify(u));
    }
    return u;
  } catch {
    return null;
  }
};

export const refreshUserProfile = async (): Promise<User | null> => {
  try {
    const { data, error } = await apiAuth.me();
    if (error || !data) {
      console.warn('[Auth] Could not refresh profile from API:', error);
      return null;
    }
    const user = mapServerUser(data);
    return persistUser(user);
  } catch (e) {
    console.error('[Auth] refreshUserProfile exception:', e);
    return null;
  }
};

export const updateCurrentSession = async (
  updates: Partial<User> & { password?: string }
): Promise<void> => {
  const current = getCurrentUser();
  if (!current) return;

  const { data, error } = await apiAuth.updateMe(updates);
  if (error) {
    console.error('[Auth] updateCurrentSession failed:', error);
    throw new Error(error);
  }

  const sanitized = { ...updates };
  delete (sanitized as any).password;

  const updated: User = { ...current, ...sanitized };
  persistUser(updated);
};
