/**
 * services/inventoryService.ts
 * Titan Stack — Inventory Service (WatermelonDB)
 *
 * Ported from RxDB to WatermelonDB query API.
 * - `db.products.find({ selector }).exec()` → `productsCollection.query(Q.where(...)).fetch()`
 * - `db.products.findOne(id).exec()` → `productsCollection.find(id)` (throws if missing)
 * - `doc.patch({...})` → `await database.write(() => doc.update(r => {...}))`
 * - `db.products.insert(data)` → `await database.write(() => productsCollection.create(r => {...}))`
 * - `db.products.bulkInsert([])` → `await database.write(() => database.batch(...))`
 * - `doc.remove()` → `await database.write(() => doc.destroyPermanently())`
 *
 * The startSync() call in the module initializer is removed — sync is now
 * triggered explicitly from the Dashboard button via syncService.
 */

import { Q } from '@nozbe/watermelondb';
import { database, productsCollection } from '../db';
import { Product } from '../constants/inventoryFields';
import { getCurrentUser } from './authService';
import * as imageService from './imageService';
import * as aiService from './aiService';
import { v4 as uuidv4 } from 'uuid';

// Helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Seed Data ─────────────────────────────────────────────────────────────────
const seedIfEmpty = async () => {
  const count = await productsCollection.query().fetchCount();
  if (count > 0) return;

  console.log('[Inventory] Seeding initial mock data...');
  const orgId = getCurrentUser()?.organizationId || 'local';
  const nowMs = Date.now();

  await database.write(async () => {
    await productsCollection.create((r: any) => {
      r._raw.id        = uuidv4();
      r.organizationId = orgId;
      r.name           = 'Quantum Core Processor X1';
      r.sku            = 'QCP-X1-2024';
      r.brand          = 'Nova Systems';
      r.category       = 'Processors';
      r.costPrice      = 150;
      r.price1         = 299.99;
      r.price2         = 289.99;
      r.price3         = 279.99;
      r.price4         = 269.99;
      r.quantity       = 50;
      r.minStock       = 10;
      r.description    = 'The latest generation of quantum-entangled processors.';
      r.customFieldsJson = JSON.stringify({ supplier: 'NS-INT' });
      r.imagesJson     = '[]';
      r.warrantyJson   = JSON.stringify({ enabled: true, days: 730 });
      r.approvalStatus = 'approved';
      r.isDeleted      = false;
      r.updatedAt      = nowMs;
    });
  });
};

// Seed on module load (non-blocking)
seedIfEmpty().catch(e => console.warn('[Inventory] Seed failed:', e));

// ─── Map WatermelonDB doc → Product ───────────────────────────────────────────
const mapDocToProduct = (doc: any): Product => ({
  ...doc._raw,
  id:           doc.id,
  name:         doc.name,
  sku:          doc.sku,
  brand:        doc.brand,
  category:     doc.category,
  costPrice:    doc.costPrice,
  price1:       doc.price1,
  price2:       doc.price2,
  price3:       doc.price3,
  price4:       doc.price4,
  quantity:     doc.quantity,
  minStock:     doc.minStock,
  description:  doc.description,
  customFields: doc.customFields,
  images:       doc.images,
  warranty:     doc.warranty,
  approvalStatus: doc.approvalStatus,
  is_deleted:   doc.isDeleted,
  organization_id: doc.organizationId,
  updated_at:   new Date(doc.updatedAt).toISOString(),
});

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface PriceAdjustment {
  type: 'percentage_increase' | 'percentage_decrease' | 'absolute_increase' | 'absolute_decrease' | 'set_to';
  value: number;
}

export interface BatchUpdates {
  category?: string;
  brand?: string;
  price1?: PriceAdjustment;
  minStock?: number;
  addImages?: Blob;
  removeImages?: boolean;
  autoFillAI?: boolean;
  generateDescAI?: boolean;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const getProducts = async (): Promise<Product[]> => {
  const docs = await productsCollection.query(
    Q.where('is_deleted', false)
  ).fetch();

  const products = docs.map(mapDocToProduct);

  // Hydrate images from IndexedDB blob store
  try {
    return await Promise.all(
      products.map(async (p) => {
        if (p.images && p.images.length > 0) {
          try {
            (p as any).images = await imageService.hydrateImageURLs(p.images);
          } catch (err) {
            console.warn(`[Inventory] Image hydration failed for ${p.id}`, err);
          }
        }
        return p;
      })
    );
  } catch {
    return products;
  }
};

export const addProduct = async (
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'organization_id'>
): Promise<Product> => {
  const user  = getCurrentUser();
  const orgId = user?.organizationId || 'local';
  const id    = uuidv4();
  const nowMs = Date.now();

  const needsApproval  = user?.role === 'manager' || user?.role === 'inventory_manager';
  const approvalStatus = needsApproval ? 'pending' : 'approved';

  await database.write(async () => {
    await productsCollection.create((r: any) => {
      r._raw.id        = id;
      r.organizationId = orgId;
      r.name           = productData.name;
      r.sku            = productData.sku || '';
      r.brand          = productData.brand || '';
      r.category       = productData.category || '';
      r.costPrice      = productData.costPrice || 0;
      r.price1         = productData.price1 || 0;
      r.price2         = productData.price2 || 0;
      r.price3         = productData.price3 || 0;
      r.price4         = productData.price4 || 0;
      r.quantity       = productData.quantity || 0;
      r.minStock       = productData.minStock || 0;
      r.description    = productData.description || '';
      r.customFieldsJson = JSON.stringify(productData.customFields || {});
      r.imagesJson     = JSON.stringify(productData.images || []);
      r.warrantyJson   = JSON.stringify(productData.warranty || { enabled: false, days: 0 });
      r.approvalStatus = approvalStatus;
      r.isDeleted      = false;
      r.updatedAt      = nowMs;
    });
  });

  return { ...productData, id, organization_id: orgId, updated_at: new Date(nowMs).toISOString() } as unknown as Product;
};

export const addMultipleProducts = async (
  productsData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<number> => {
  const user  = getCurrentUser();
  const orgId = user?.organizationId || 'local';
  const nowMs = Date.now();

  await database.write(async () => {
    await database.batch(
      ...productsData.map(p =>
        productsCollection.prepareCreate((r: any) => {
          r._raw.id        = uuidv4();
          r.organizationId = orgId;
          r.name           = p.name;
          r.sku            = p.sku || '';
          r.brand          = p.brand || '';
          r.category       = p.category || '';
          r.costPrice      = (p as any).costPrice || 0;
          r.price1         = p.price1 || 0;
          r.price2         = p.price2 || 0;
          r.price3         = p.price3 || 0;
          r.price4         = p.price4 || 0;
          r.quantity       = p.quantity || 0;
          r.minStock       = (p as any).minStock || 0;
          r.description    = p.description || '';
          r.customFieldsJson = JSON.stringify((p as any).customFields || {});
          r.imagesJson     = JSON.stringify(p.images || []);
          r.warrantyJson   = JSON.stringify((p as any).warranty || { enabled: false, days: 0 });
          r.approvalStatus = 'approved';
          r.isDeleted      = false;
          r.updatedAt      = nowMs;
        })
      )
    );
  });

  return productsData.length;
};

export const updateProduct = async (
  productId: string,
  updates: Partial<Product>
): Promise<Product> => {
  const user   = getCurrentUser();
  const nowMs  = Date.now();
  let doc: any;
  try { doc = await productsCollection.find(productId); } catch {
    throw new Error('Product not found');
  }

  await database.write(async () => {
    await doc.update((r: any) => {
      if (updates.name       !== undefined) r.name       = updates.name;
      if (updates.sku        !== undefined) r.sku        = updates.sku;
      if (updates.brand      !== undefined) r.brand      = updates.brand;
      if (updates.category   !== undefined) r.category   = updates.category;
      if ((updates as any).costPrice !== undefined)  r.costPrice  = (updates as any).costPrice;
      if (updates.price1     !== undefined) r.price1     = updates.price1;
      if (updates.price2     !== undefined) r.price2     = updates.price2;
      if (updates.price3     !== undefined) r.price3     = updates.price3;
      if (updates.price4     !== undefined) r.price4     = updates.price4;
      if (updates.quantity   !== undefined) r.quantity   = updates.quantity;
      if ((updates as any).minStock !== undefined)  r.minStock   = (updates as any).minStock;
      if (updates.description !== undefined) r.description = updates.description;
      if ((updates as any).customFields !== undefined)
        r.customFieldsJson = JSON.stringify((updates as any).customFields);
      if (updates.images !== undefined) r.imagesJson = JSON.stringify(updates.images);
      if ((updates as any).warranty !== undefined)
        r.warrantyJson = JSON.stringify((updates as any).warranty);
      if ((updates as any).approvalStatus !== undefined)
        r.approvalStatus = (updates as any).approvalStatus;
      // RBAC: inventory_manager edits go back to pending
      if (user?.role === 'inventory_manager' && (updates as any).approvalStatus === undefined)
        r.approvalStatus = 'pending';
      r.updatedAt = nowMs;
    });
  });

  return mapDocToProduct(doc);
};

export const getSelectedItems = async (productIds: string[]): Promise<Product[]> => {
  const docs = await productsCollection.query(
    Q.where('id', Q.oneOf(productIds))
  ).fetch();
  return docs.map(mapDocToProduct);
};

export const moveProductsToTrash = async (productIds: string[]): Promise<void> => {
  const docs = await productsCollection.query(
    Q.where('id', Q.oneOf(productIds))
  ).fetch();

  await database.write(async () => {
    await database.batch(
      ...docs.map((doc: any) => doc.prepareUpdate((r: any) => {
        r.isDeleted = true;
        r.updatedAt = Date.now();
      }))
    );
  });
};

export const getTrashedProducts = async (): Promise<Product[]> => {
  const docs = await productsCollection.query(
    Q.where('is_deleted', true)
  ).fetch();
  return docs.map(mapDocToProduct);
};

export const restoreProductsFromTrash = async (productIds: string[]): Promise<void> => {
  const docs = await productsCollection.query(
    Q.where('id', Q.oneOf(productIds))
  ).fetch();

  await database.write(async () => {
    await database.batch(
      ...docs.map((doc: any) => doc.prepareUpdate((r: any) => {
        r.isDeleted = false;
        r.updatedAt = Date.now();
      }))
    );
  });
};

export const permanentlyDeleteProducts = async (productIds: string[]): Promise<void> => {
  const docs = await productsCollection.query(
    Q.where('id', Q.oneOf(productIds))
  ).fetch();

  for (const doc of docs) {
    // Clean up local images first
    const images = (doc as any).images;
    if (images) {
      for (const img of images) {
        await imageService.deleteImageById(img.id);
      }
    }
    // Use markAsDeleted() instead of destroyPermanently() so the deletion
    // is included in the next WatermelonDB sync push to PostgreSQL.
    // destroyPermanently() removes the record locally only and never syncs.
    await database.write(async () => {
      await (doc as any).markAsDeleted();
    });
  }
};

// ─── Batch Processor ───────────────────────────────────────────────────────────
export const batchUpdateProducts = async (
  productIds: string[],
  updates: BatchUpdates,
  onProgress?: (current: number, total: number) => void
): Promise<{ successCount: number; failureCount: number; stopped?: boolean }> => {
  let successCount = 0;
  let failureCount = 0;
  let processedCount = 0;
  const total = productIds.length;

  for (const id of productIds) {
    processedCount++;
    if (onProgress) onProgress(processedCount, total);

    try {
      let doc: any;
      try { doc = await productsCollection.find(id); } catch { failureCount++; continue; }

      const product    = mapDocToProduct(doc);
      let wasModified  = false;
      const mods: any  = {};

      // Images
      if (updates.addImages && (!product.images || product.images.length < 5)) {
        const compressed   = await imageService.compressImage(updates.addImages);
        const savedInfo    = await imageService.saveImage(id, compressed);
        const user         = getCurrentUser();
        const storagePath  = `${user?.organizationId || 'local'}/${id}/${Date.now()}.jpg`;
        const publicUrl    = await imageService.uploadImage(compressed, storagePath);
        if (publicUrl) savedInfo.url = publicUrl;
        mods.imagesJson = JSON.stringify([...(product.images || []), savedInfo]);
        wasModified = true;
      }

      if (updates.removeImages && product.images?.length) {
        for (const img of product.images) await imageService.deleteImageById(img.id);
        mods.imagesJson = '[]';
        wasModified = true;
      }

      // Standard fields
      if (updates.category !== undefined)  { mods.category = updates.category; wasModified = true; }
      if (updates.brand    !== undefined)  { mods.brand    = updates.brand;    wasModified = true; }
      if (updates.minStock !== undefined)  { mods.minStock = updates.minStock; wasModified = true; }

      if (updates.price1) {
        const { type, value } = updates.price1;
        let newPrice = product.price1 || 0;
        switch (type) {
          case 'percentage_increase': newPrice *= (1 + value / 100); break;
          case 'percentage_decrease': newPrice *= (1 - value / 100); break;
          case 'absolute_increase':   newPrice += value; break;
          case 'absolute_decrease':   newPrice -= value; break;
          case 'set_to':              newPrice  = value; break;
        }
        mods.price1 = Math.max(0, parseFloat(newPrice.toFixed(2)));
        wasModified = true;
      }

      // AI Operations
      if ((updates.autoFillAI || updates.generateDescAI) && product.name) {
        try {
          if (updates.autoFillAI && updates.generateDescAI) {
            const r = await aiService.analyzeAndDescribeProduct(product.name);
            mods.brand = r.brand || product.brand;
            mods.category = r.category || product.category;
            mods.sku  = (product.sku && product.sku.length > 3) ? product.sku : (r.sku || product.sku);
            mods.description = r.description || product.description;
            const existing = (product as any).customFields || {};
            mods.customFieldsJson = JSON.stringify({ ...existing, socket: r.socket || existing.socket, memory_type: r.memory_type || existing.memory_type, wattage: r.wattage || existing.wattage });
            wasModified = true;
            await delay(5000);
          } else if (updates.autoFillAI) {
            const d = await aiService.analyzeProductDetails(product.name);
            mods.brand    = d.brand    || product.brand;
            mods.category = d.category || product.category;
            mods.sku      = (product.sku && product.sku.length > 3) ? product.sku : (d.sku || product.sku);
            const existing = (product as any).customFields || {};
            mods.customFieldsJson = JSON.stringify({ ...existing, socket: d.socket || existing.socket, memory_type: d.memory_type || existing.memory_type, wattage: d.wattage || existing.wattage });
            wasModified = true;
            await delay(5000);
          } else if (updates.generateDescAI) {
            const desc = await aiService.generateTechnicalDescription(product.name);
            if (desc) { mods.description = desc; wasModified = true; await delay(5000); }
          }
        } catch (e: any) {
          if (e.message === 'QUOTA_EXCEEDED') {
            if (wasModified) {
              await database.write(async () => {
                await doc.update((r: any) => {
                  Object.assign(r, mods);
                  r.updatedAt = Date.now();
                });
              });
            }
            return { successCount, failureCount, stopped: true };
          }
          console.error('[Inventory] AI error:', e);
        }
      }

      if (wasModified) {
        await database.write(async () => {
          await doc.update((r: any) => {
            Object.assign(r, mods);
            r.updatedAt = Date.now();
          });
        });
        successCount++;
      }
    } catch (e) {
      console.error(`[Inventory] batchUpdate failed for ${id}:`, e);
      failureCount++;
    }
  }

  return { successCount, failureCount };
};
