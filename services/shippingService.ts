import { Sale } from '../constants/billingTypes';

// import { getSettings } from './settingsService';

const getApiConfig = () => {
    // Hardcoded credentials for ZR Express integration
    return {
        secretKey: "mfAnFntVPKBzw30nTeI54aeQP3bCFetenGGdhs2x2TU2PrwNLAgp0zOB7KKUt6fI",
        tenantId: "fcf200b8-a737-4cfb-baa7-f4610e823197",
        baseUrl: "https://api.zrexpress.app",
    };
};

export interface ShippingStatus {
    status: 'pending' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
    trackingId?: string;
    lastUpdated: string;
}

export interface ZRExpressOrderResponse {
    parcelId: string;
    trackingNumber: string;
    status: string;
}

/**
 * Create a new order in ZR Express system
 * Called automatically when COD payment is selected
 */

// Helper: Search for territories (City/District)
export const searchTerritories = async (keyword: string): Promise<any[]> => {
    try {
        const config = getApiConfig();
        const response = await fetch(`${config.baseUrl}/api/v1/territories/search`, {
            method: 'POST',
            headers: {
                'X-Api-Key': config.secretKey,
                'X-Tenant': config.tenantId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pageNumber: 1,
                pageSize: 100, // Increased to fetch all relevant cities
                keyword: keyword,
                level: 'City' // Default to cities
            })
        });
        if (!response.ok) return [];
        const result = await response.json();
        return result.data || result.items || [];
    } catch {
        return [];
    }
};

// Helper: Fetch Delivery Rates
export const getDeliveryRates = async (): Promise<any[]> => {
    try {
        const config = getApiConfig();
        // Fallback to fetch rates table if available.
        // We know the endpoint from Swagger: /api/v1/delivery-pricing/rates
        const response = await fetch(`${config.baseUrl}/api/v1/delivery-pricing/rates`, {
            method: 'GET',
            headers: {
                'X-Api-Key': config.secretKey,
                'X-Tenant': config.tenantId,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            console.error('[ZR Express] Fetch rates returned', response.status);
            return [];
        }
        const result = await response.json();
        // Since we didn't perfectly parse the JSON array vs object response, we assume it's either an array or has a data property.
        return Array.isArray(result) ? result : (result.data || result.items || [result]);
    } catch (e) {
        console.error('[ZR Express] Call to getDeliveryRates failed', e);
        return [];
    }
};

// Helper: Fetch Rate for a specific territory
export const getRateForTerritory = async (territoryId: string): Promise<number | null> => {
    try {
        const config = getApiConfig();
        const response = await fetch(`${config.baseUrl}/api/v1/delivery-pricing/rates/${territoryId}`, {
            method: 'GET',
            headers: {
                'X-Api-Key': config.secretKey,
                'X-Tenant': config.tenantId,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) return null;
        const result = await response.json();

        // Result is based on GetRateResponse schema:
        // { deliveryPrices: [{ pricingType: 'homeDelivery', totalCost: 600, ... }] }
        if (result && result.deliveryPrices && result.deliveryPrices.length > 0) {
            // Find base shipping price (homeDelivery usually)
            const homePrice = result.deliveryPrices.find((p: any) => p.pricingType === 'homeDelivery' || p.serviceType === 'home');
            if (homePrice && typeof homePrice.totalCost === 'number') {
                return homePrice.totalCost;
            }
            // Fallback to first available pricing
            return result.deliveryPrices[0].totalCost || result.deliveryPrices[0].price;
        }
        return null;
    } catch (e) {
        console.error('[ZR Express] Fetch specific rate failed', e);
        return null;
    }
};

// Helper: Get or Create Customer
const getOrCreateCustomer = async (sale: Sale, cityId: string): Promise<string | null> => {
    const config = getApiConfig();
    const headers = {
        'X-Api-Key': config.secretKey,
        'X-Tenant': config.tenantId,
        'Content-Type': 'application/json'
    };

    const phone = sale.deliveryDetails?.phone || sale.customerPhone || '0000000000';
    const name = sale.customerName || 'Walk-in Customer';

    try {
        // 1. Search existing customer by phone
        const searchResp = await fetch(`${config.baseUrl}/api/v1/customers/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                pageNumber: 1,
                pageSize: 1,
                keyword: phone
            })
        });

        if (searchResp.ok) {
            const searchResult = await searchResp.json();
            if (searchResult.data && searchResult.data.length > 0) {
                console.log(`[ZR Express] Found existing customer: ${searchResult.data[0].id}`);
                return searchResult.data[0].id;
            }
        }

        // 2. Create new individual customer if not found
        const createResp = await fetch(`${config.baseUrl}/api/v1/customers/individual`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: name,
                phone: { number1: phone },
                deliveryPreference: 'home',
                defaultTerritoryId: cityId,
                address: sale.deliveryDetails?.address || sale.customerAddress || ''
            })
        });

        if (createResp.ok) {
            const createResult = await createResp.json();
            console.log(`[ZR Express] Created new customer: ${createResult.id}`);
            return createResult.id;
        } else {
            const err = await createResp.text();
            console.error('[ZR Express] Customer creation failed on API:', err);
        }
    } catch (e) {
        console.error('[ZR Express] Customer resolution failed', e);
    }
    return null;
};



// Helper: Fetch ZR Express Categories
export const fetchZRCategories = async (): Promise<any[]> => {
    try {
        const config = getApiConfig();
        const response = await fetch(`${config.baseUrl}/api/v1/categories/search`, {
            method: 'POST',
            headers: {
                'X-Api-Key': config.secretKey,
                'X-Tenant': config.tenantId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pageNumber: 1,
                pageSize: 100, // Fetch enough categories
                keyword: ''
            })
        });
        if (!response.ok) return [];
        const result = await response.json();
        return result.data || [];
    } catch (e) {
        console.error('[ZR Express] Failed to fetch categories', e);
        return [];
    }
};

// Helper: Create Product in ZR Express
export const createZRExpressProduct = async (product: any): Promise<string | null> => {
    try {
        const config = getApiConfig();
        // We require categoryId and subCategoryId. If not present, we can't create.
        if (!product.zrCategoryId || !product.zrSubCategoryId) {
            console.warn('[ZR Express] Product missing category/subcategory mapping.');
            return null;
        }

        const payload = {
            name: product.name,
            sku: product.sku || `SKU-${product.id.substring(0, 8)}`,
            basePrice: product.price1 || 1,
            purchasePrice: product.costPrice || 0,
            length: 10, // Defaults or allow user to set?
            width: 10,
            height: 10,
            weight: 1, // Default 1kg
            localStock: product.quantity || 0,
            categoryId: product.zrCategoryId,
            subCategoryId: product.zrSubCategoryId
        };

        const response = await fetch(`${config.baseUrl}/api/v1/products`, {
            method: 'POST',
            headers: {
                'X-Api-Key': config.secretKey,
                'X-Tenant': config.tenantId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('[ZR Express] Product creation failed:', err);
            return null;
        }

        const result = await response.json();
        return result.id; // Returns UUID
    } catch (e) {
        console.error('[ZR Express] Create product failed', e);
        return null;
    }
};


export const createZRExpressOrder = async (sale: Sale): Promise<ZRExpressOrderResponse | null> => {
    console.log(`[ZR Express] Creating order for sale ${sale.id}...`);

    try {
        const config = getApiConfig();

        // 1. Resolve Address (City/District)
        let cityId = sale.deliveryDetails?.cityTerritoryId;

        // Fallback: search for Tunis or first available city if none selected
        if (!cityId) {
            const territories = await searchTerritories("Tunis");
            const city = territories.find((t: any) => t.level === 'City') || (await searchTerritories(""))?.find((t: any) => t.level === 'City');

            if (city) {
                cityId = city.id;
                console.log(`[ZR Express] Using default city: ${city.name}`);
            } else {
                console.warn("[ZR Express] No city found. Order might fail.");
                cityId = "00000000-0000-0000-0000-000000000000"; // Fallback nil UUID
            }
        }

        // 2. Get/Create Customer
        const customerId = await getOrCreateCustomer(sale, cityId);
        if (!customerId) {
            throw new Error("Could not resolve customer.");
        }

        // 3. Prepare Items Description (bypass product sync)
        const itemsDescription = sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

        const url = `${config.baseUrl}/api/v1/parcels`;

        const headers = {
            'X-Api-Key': config.secretKey,
            'X-Tenant': config.tenantId,
            'Content-Type': 'application/json'
        };

        const orderData = {
            customer: {
                customerId: customerId, // Must be UUID
                name: sale.customerName,
                phone: { number1: sale.deliveryDetails?.phone || sale.customerPhone }
            },
            deliveryAddress: {
                cityTerritoryId: cityId,
                street: sale.deliveryDetails?.address || sale.customerAddress || 'Address provided'
            },
            orderedProducts: sale.items
                .filter(i => i.zrExpressProductId)
                .map(i => ({
                    productId: i.zrExpressProductId,
                    quantity: i.quantity
                })),
            description: itemsDescription, // Put items here
            amount: Math.round(sale.total),
            deliveryType: 'home',
            stockType: 'local',
            weight: { weight: 1.0 } // Default weight
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ZR Express API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('[ZR Express] Order created successfully:', result);

        return {
            parcelId: result.id,
            trackingNumber: result.trackingNumber,
            status: result.status || 'created'
        };
    } catch (error) {
        console.error('[ZR Express] Order creation failed:', error);
        return null;
    }
};

/**
 * Get shipping label (borderaux) PDF for a parcel
 * Returns PDF blob that can be downloaded or printed
 */


/**
 * Get shipping label (borderaux) PDF for a parcel
 * Returns PDF blob that can be downloaded or printed
 */
export const getShippingLabel = async (trackingNumber: string): Promise<Blob | null> => {
    console.log(`[ZR Express] Fetching label for tracking number: ${trackingNumber}`);

    try {
        const config = getApiConfig();
        const url = `${config.baseUrl}/api/v1/parcels/labels/individual/pdf`;

        const headers = {
            'X-Api-Key': config.secretKey,
            'X-Tenant': config.tenantId,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                trackingNumbers: [trackingNumber],
                format: 'A4'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ZR Express API returned ${response.status}: ${errorText}`);
        }

        const pdfBlob = await response.blob();
        console.log('[ZR Express] Label retrieved successfully');
        return pdfBlob;
    } catch (error) {
        console.error('[ZR Express] Label fetch failed:', error);
        return null;
    }
};

/**
 * Update order status in ZR Express
 */
export const updateOrderStatus = async (trackingNumber: string, status: string): Promise<boolean> => {
    console.log(`[ZR Express] Updating parcel ${trackingNumber} to state ${status}`);

    try {
        const config = getApiConfig();
        const url = `${config.baseUrl}/api/v1/order/${trackingNumber}/status`;

        const headers = {
            'X-Api-Key': config.secretKey,
            'X-Tenant': config.tenantId,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({
                newStateId: status,
                comment: ''
            })
        });

        if (!response.ok) {
            // ... error handling
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Get tracking information for a parcel
 */
export const getTrackingInfo = async (trackingNumber: string) => {
    try {
        const config = getApiConfig();
        const response = await fetch(`${config.baseUrl}/api/v1/parcels/${trackingNumber}`, {
            method: 'GET',
            headers: {
                'X-Api-Key': config.secretKey,
                'X-Tenant': config.tenantId,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        return {
            status: result.status || 'unknown',
            trackingNumber: result.trackingNumber,
            lastUpdated: result.lastUpdated || result.updatedAt,
            location: result.currentLocation,
            history: result.history || []
        };
    } catch (error) {
        console.error('[ZR Express] Tracking fetch failed:', error);
        return { status: 'unknown', error: error instanceof Error ? error.message : 'Unknown error' };
    }
};

/**
 * Fetch orders from ZR Express (Sync)
 */
export const fetchZRExpressOrders = async (): Promise<any[]> => {
    try {
        const config = getApiConfig();
        // Use SEARCH endpoint as identified by browser subagent
        const url = `${config.baseUrl}/api/v1/parcels/search`;

        const headers = {
            'X-Api-Key': config.secretKey,
            'X-Tenant': config.tenantId,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                pageNumber: 1,
                pageSize: 50,
                includeProducts: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ZR Express API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        // Assuming result structure is { data: [...], totalCount: ... } or just [...]
        return result.data || result || [];
    } catch (error) {
        console.error('[ZR Express] Fetch orders failed:', error);
        return [];
    }
};

/**
 * Fetch Claims from ZR Express
 */
export const fetchZRExpressClaims = async (): Promise<any[]> => {
    try {
        const config = getApiConfig();
        const url = `${config.baseUrl}/api/v1/claims/search`;

        const headers = {
            'X-Api-Key': config.secretKey,
            'X-Tenant': config.tenantId,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                pageNumber: 1,
                pageSize: 50
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ZR Express API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return result.items || result.data || result || [];
    } catch (error) {
        console.error('[ZR Express] Fetch claims failed:', error);
        return [];
    }
};

/**
 * Delete/Cancel a ZR Express Order
 */
export const deleteZRExpressOrder = async (parcelId: string): Promise<boolean> => {
    try {
        const config = getApiConfig();
        const url = `${config.baseUrl}/api/v1/parcels/${parcelId}`;

        const headers = {
            'X-Api-Key': config.secretKey,
            'X-Tenant': config.tenantId,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {
            method: 'DELETE',
            headers: headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ZR Express] Delete parcel failed ${response.status}: ${errorText}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[ZR Express] Delete parcel failed:', error);
        return false;
    }
};

/**
 * Request Refund for a ZR Express Order
 */
export const refundZRExpressOrder = async (parcelId: string): Promise<boolean> => {
    try {
        const config = getApiConfig();
        const url = `${config.baseUrl}/api/v1/parcels/${parcelId}/state/refund`;

        const headers = {
            'X-Api-Key': config.secretKey,
            'X-Tenant': config.tenantId,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {
            method: 'PATCH',
            headers: headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ZR Express] Refund parcel failed ${response.status}: ${errorText}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[ZR Express] Refund parcel failed:', error);
        return false;
    }
};

// Legacy syncDelivery function - kept for backward compatibility
// This is now replaced by createZRExpressOrder for COD orders
export const syncDelivery = async (sale: Sale, status: string) => {
    console.log(`[ZR Express] Legacy sync called for sale ${sale.id} with status ${status}`);

    // If the sale already has a ZR Express tracking number, just log it
    if (sale.deliveryDetails?.zrExpressTrackingNumber) {
        console.log(`[ZR Express] Sale already has tracking number: ${sale.deliveryDetails.zrExpressTrackingNumber}`);
        return { success: true, message: 'Already synced with ZR Express' };
    }

    // Otherwise, this is a legacy call - just return success
    return { success: true, message: 'Legacy sync - use createZRExpressOrder for new orders' };
};
