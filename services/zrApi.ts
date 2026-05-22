// If running from file:// (Electron built), use absolute URLs. Otherwise (Vite dev server), use proxy relative URLs.
const isBuilt = window.location.protocol === 'file:';
const API_BASE_URL = isBuilt ? 'https://api.zrexpress.app/api/v1' : '/api/v1';
const ANALYTICS_BASE_URL = isBuilt ? 'https://analytics.zrexpress.app/cubejs-api' : '/cubejs-api';

const SECRET_KEY = 'kcLWBed9kpljbkcGmKszzDJDuTCWKKICpAawJbmjsBrHVzsnTt0QMCJCvpDMUopq';
const TENANT_ID = 'fcf200b8-a737-4cfb-baa7-f4610e823197';

interface FetchOptions extends RequestInit {
    params?: Record<string, string | number | boolean>;
}

class ZRExpressAPI {
    private getHeaders(): HeadersInit {
        return {
            'Content-Type': 'application/json',
            // Updated to use the documented X-Api-Key instead of Authorization Bearer
            'X-Api-Key': SECRET_KEY,
            'X-Tenant': TENANT_ID,
        };
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const { params, ...customConfig } = options;

        let url = `${API_BASE_URL}${endpoint}`;
        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                // To avoid double question marks if endpoint already contains ?
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }

        const config: RequestInit = {
            ...customConfig,
            headers: {
                ...this.getHeaders(),
                ...customConfig.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`API Error: ${response.status} - ${errorData ? JSON.stringify(errorData) : response.statusText}`);
            }
            return await response.json() as T;
        } catch (error) {
            console.error('ZRExpress API Request failed:', error);
            throw error;
        }
    }

    // Define module endpoints here. They will be populated as we build the UI.
    public get(endpoint: string, params?: FetchOptions['params']) {
        return this.request(endpoint, { method: 'GET', params });
    }

    public post(endpoint: string, body: any) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    }

    public put(endpoint: string, body: any) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    }

    public patch(endpoint: string, body: any) {
        return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
    }

    public delete(endpoint: string) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Analytics (Cube.js) support for Dashboard
    public async fetchAnalytics(query: any, jwtToken?: string) {
        // Analytics endpoint must route through the dev proxy if running in a browser
        const url = `${ANALYTICS_BASE_URL}/v1/load?query=${encodeURIComponent(JSON.stringify(query))}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant': TENANT_ID,
                    // If a JWT is provided, use it (required for Cube.js). Otherwise fallback to secret.
                    'Authorization': `Bearer ${jwtToken || SECRET_KEY}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`${errorData?.error || `Analytics API Error: ${response.status}`}`);
            }
            return await response.json();
        } catch (error) {
            console.error('ZRExpress Analytics Request failed:', error);
            throw error;
        }
    }
}

export const api = new ZRExpressAPI();
