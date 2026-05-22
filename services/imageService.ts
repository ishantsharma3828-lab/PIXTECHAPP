/**
 * services/imageService.ts
 * Titan Stack — Image Service
 *
 * IndexedDB blob storage logic is 100% preserved (saveImage, getImageBlobById,
 * hydrateImageURLs, compressImage, deleteImageById, migrateImages).
 *
 * Supabase-specific code replaced:
 * - `supabaseUrl` import removed; hydrateImageURLs now works with any absolute URL
 * - `uploadImage()` now routes through apiBridge.storage.uploadImage
 */

import { storage as apiStorage } from './apiBridge';

// ─── IndexedDB Setup ───────────────────────────────────────────────────────────
const DB_NAME  = 'pos_inventory_db';
const DB_STORE = 'product_images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase>;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };

      request.onsuccess  = (event) => resolve((event.target as IDBOpenDBRequest).result);
      request.onerror    = (event) => {
        console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
        reject('IndexedDB error');
      };
    });
  }
  return dbPromise;
}

// ─── Core Blob Operations ──────────────────────────────────────────────────────

export async function saveImage(
  productId: string,
  fileBlob: Blob
): Promise<{ id: string; url: string }> {
  const db = await getDB();
  const id = `${productId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const req   = store.put(fileBlob, id);

    req.onsuccess = () => resolve({ id, url: URL.createObjectURL(fileBlob) });
    req.onerror   = () => { console.error('Failed to save image:', req.error); reject(req.error); };
  });
}

export async function getImageBlobById(id: string): Promise<Blob | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req   = store.get(id);

    req.onsuccess = () => resolve(req.result ? (req.result as Blob) : null);
    req.onerror   = () => { console.error('Failed to get image:', req.error); reject(req.error); };
  });
}

async function saveBlobWithId(id: string, blob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const req   = store.put(blob, id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─── Image Hydration ───────────────────────────────────────────────────────────

const pendingCache = new Set<string>();

async function cacheFromUrl(id: string, url: string) {
  if (pendingCache.has(id)) return;
  pendingCache.add(id);
  try {
    const res = await fetch(url);
    if (res.ok) {
      await saveBlobWithId(id, await res.blob());
      console.log(`[Cache] Cached image ${id}`);
    }
  } catch {
    // Silent — caching is best-effort
  } finally {
    pendingCache.delete(id);
  }
}

/**
 * Resolves image references to usable URLs.
 * Priority: local IndexedDB blob → remote URL (with lazy background cache).
 */
export async function hydrateImageURLs(
  images: { id: string; url?: string }[]
): Promise<{ id: string; url: string }[]> {
  if (!images) return [];

  return Promise.all(
    images.map(async (img) => {
      // 1. Try local IndexedDB first
      const blob = await getImageBlobById(img.id);
      if (blob) return { id: img.id, url: URL.createObjectURL(blob) };

      // 2. Fall back to remote URL
      let finalUrl = img.url || '';

      // Trigger lazy background cache so next load is local
      if (finalUrl.startsWith('http')) {
        cacheFromUrl(img.id, finalUrl);
      }

      return { id: img.id, url: finalUrl };
    })
  );
}

export async function deleteImageById(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => { console.error('Failed to delete image:', req.error); reject(req.error); };
  });
}

export async function saveMultiple(
  productId: string,
  blobs: Blob[]
): Promise<{ id: string; url: string }[]> {
  const results = [];
  for (const b of blobs) results.push(await saveImage(productId, b));
  return results;
}

export async function migrateImages(
  tempId: string,
  newId: string
): Promise<{ id: string; url: string }[]> {
  const db = await getDB();
  const tx         = db.transaction(DB_STORE, 'readwrite');
  const store      = tx.objectStore(DB_STORE);
  const cursorReq  = store.openCursor();
  const newImages: { id: string; url: string }[] = [];

  return new Promise((resolve) => {
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const key = cursor.key as string;
        if (key.startsWith(tempId + ':')) {
          const blob   = cursor.value as Blob;
          const newKey = key.replace(tempId, newId);
          store.put(blob, newKey);
          newImages.push({ id: newKey, url: URL.createObjectURL(blob) });
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve(newImages);
      }
    };
  });
}

// ─── Compression ───────────────────────────────────────────────────────────────

export async function compressImage(file: Blob): Promise<Blob> {
  if (file.type && !file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      const MAX_SIZE = 1280;

      if (width > height) {
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
      } else {
        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob && blob.size < file.size ? blob : file),
        'image/jpeg',
        0.7
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─── Remote Upload (apiBridge) ─────────────────────────────────────────────────

/**
 * Compresses and uploads an image to the Node.js storage endpoint.
 * Falls back to null (caller uses local blob URL) when backend is offline.
 */
export async function uploadImage(file: Blob, path: string): Promise<string | null> {
  try {
    const compressed = await compressImage(file);
    return await apiStorage.uploadImage(compressed, path);
  } catch (e) {
    console.error('[ImageService] Upload exception:', e);
    return null;
  }
}
