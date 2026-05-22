/**
 * services/apiBridge.ts
 * Titan Stack — Custom Node.js REST API Bridge
 *
 * This is the single point of contact between the React frontend and
 * the future custom Node.js + PostgreSQL backend. All remote operations
 * go through here. Until the backend is built, every call returns a
 * structured null/mock response so the UI compiles and runs offline.
 *
 * HOW IT WORKS:
 * 1. The bridge reads the JWT from localStorage on every call.
 * 2. It injects `Authorization: Bearer <token>` on all authenticated requests.
 * 3. On 401 responses, it clears the local session and triggers a re-login.
 * 4. All methods are clearly stubbed with a TODO comment for the backend route.
 *
 * CONFIGURATION:
 * Set VITE_API_URL in your .env file to point to your Node.js server.
 * Example: VITE_API_URL=http://localhost:4000
 */

// ─── Config ────────────────────────────────────────────────────────────────────
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'pos_jwt_token';

// ─── Token Management ──────────────────────────────────────────────────────────
export const tokenManager = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

// ─── Base Fetch Wrapper ────────────────────────────────────────────────────────
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
}

async function request<T = any>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  isPublic: boolean = false
): Promise<ApiResponse<T>> {
  const token = tokenManager.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!isPublic && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ── STUB GUARD ───────────────────────────────────────────────────────────────
  // While the backend is not yet running, return a graceful null response
  // instead of crashing the app with a network error.
  // Remove this block once your Node.js server is live.
  const isBackendReady = (import.meta as any).env?.VITE_BACKEND_READY === 'true';
  if (!isBackendReady) {
    console.debug(`[apiBridge] STUB: ${method} ${path}`, body ?? '');
    return { data: null, error: null, status: 0 };
  }
  // ── END STUB GUARD ───────────────────────────────────────────────────────────

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      // Token expired — clear session and reload to trigger login
      tokenManager.clear();
      localStorage.removeItem('pos_user');
      window.location.href = '/';
      return { data: null, error: 'Unauthorized', status: 401 };
    }

    const data = response.status !== 204 ? await response.json() : null;

    if (!response.ok) {
      return { data: null, error: data?.message || `HTTP ${response.status}`, status: response.status };
    }

    return { data, error: null, status: response.status };
  } catch (err: any) {
    console.error(`[apiBridge] Network error on ${method} ${path}:`, err.message);
    return { data: null, error: err.message || 'Network error', status: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// Node.js backend: routes/auth.js
// ═══════════════════════════════════════════════════════════════════════════════
export const auth = {
  /**
   * POST /api/auth/login
   * Returns: { token: string, user: UserProfile }
   */
  login: (email: string, password: string) =>
    request('POST', '/api/auth/login', { email, password }, true),

  /**
   * POST /api/auth/register
   * Returns: { token: string, user: UserProfile }
   */
  register: (data: { email: string; password: string; fullName: string; storeName: string }) =>
    request('POST', '/api/auth/register', data, true),

  /**
   * POST /api/auth/refresh
   * Sends the current token and receives a fresh one.
   */
  refreshToken: () =>
    request('POST', '/api/auth/refresh'),

  /**
   * POST /api/auth/logout
   * Invalidates the token server-side (if using a token blacklist).
   */
  logout: () =>
    request('POST', '/api/auth/logout'),

  /**
   * GET /api/auth/me
   * Returns the current user's profile from the server.
   */
  me: () =>
    request('GET', '/api/auth/me'),

  /**
   * PATCH /api/auth/me
   * Updates the authenticated user's profile (name, phone, password).
   */
  updateMe: (updates: Record<string, any>) =>
    request('PATCH', '/api/auth/me', updates),
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT ENDPOINTS (Admin only)
// Node.js backend: routes/users.js
// ═══════════════════════════════════════════════════════════════════════════════
export const users = {
  /**
   * GET /api/users
   * Returns all users in the organization.
   */
  getAll: () =>
    request('GET', '/api/users'),

  /**
   * POST /api/users
   * Creates a new staff user. Admin only.
   */
  create: (userData: Record<string, any>) =>
    request('POST', '/api/users', userData),

  /**
   * PATCH /api/users/:id
   * Updates a user's role, username, or other profile fields.
   */
  update: (id: string, updates: Record<string, any>) =>
    request('PATCH', `/api/users/${id}`, updates),

  /**
   * DELETE /api/users/:id
   * Hard-deletes a user. Admin only.
   */
  delete: (id: string) =>
    request('DELETE', `/api/users/${id}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS ENDPOINTS
// Node.js backend: routes/settings.js
// ═══════════════════════════════════════════════════════════════════════════════
export const settings = {
  /**
   * GET /api/settings/:orgId
   * Fetches global settings for the organization (admin settings cascade to all staff).
   */
  fetch: (orgId: string) =>
    request('GET', `/api/settings/${orgId}`),

  /**
   * PUT /api/settings/:orgId
   * Persists the full settings object. Admin only.
   */
  push: (orgId: string, settingsData: Record<string, any>) =>
    request('PUT', `/api/settings/${orgId}`, settingsData),
};

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE / FILE UPLOAD ENDPOINTS
// Node.js backend: routes/storage.js (multer + S3/local disk)
// ═══════════════════════════════════════════════════════════════════════════════
export const storage = {
  /**
   * POST /api/storage/upload
   * Uploads a file (image, logo, etc.) to server-side storage.
   * Returns: { url: string } — public URL of the uploaded file.
   *
   * Note: Uses FormData (multipart), not JSON. Bypasses the base `request()`.
   */
  uploadImage: async (file: Blob, path: string): Promise<string | null> => {
    const isBackendReady = (import.meta as any).env?.VITE_BACKEND_READY === 'true';
    if (!isBackendReady) {
      console.debug('[apiBridge] STUB: POST /api/storage/upload');
      return null;
    }

    const token = tokenManager.get();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    try {
      const response = await fetch(`${API_BASE}/api/storage/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data?.url ?? null;
    } catch (err) {
      console.error('[apiBridge] Upload failed:', err);
      return null;
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC ENDPOINTS (for future WatermelonDB ↔ PostgreSQL sync)
// Node.js backend: routes/sync.js
// ═══════════════════════════════════════════════════════════════════════════════
export const sync = {
  /**
   * GET /api/sync/pull?lastPulledAt=<timestamp>
   * Returns all changes since last sync (WatermelonDB sync protocol).
   */
  pull: (lastPulledAt: number | null) =>
    request('GET', `/api/sync/pull?lastPulledAt=${lastPulledAt ?? 0}`),

  /**
   * POST /api/sync/push
   * Sends local changes to the server.
   */
  push: (changes: Record<string, any>, lastPulledAt: number) =>
    request('POST', '/api/sync/push', { changes, lastPulledAt }),
};
