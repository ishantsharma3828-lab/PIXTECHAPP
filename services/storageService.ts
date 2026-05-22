/**
 * services/storageService.ts
 * Titan Stack — File Storage via apiBridge
 *
 * Replaces Supabase Storage bucket calls with apiBridge.storage stubs.
 * Files are uploaded to the future Node.js server (which will proxy to
 * S3, Cloudflare R2, or local disk). Returns null until backend is live.
 */

import { storage as apiStorage } from './apiBridge';

export const STORAGE_BUCKET = 'product-images';

/**
 * Uploads a file to server-side storage and returns the public URL.
 * @param file  The file to upload
 * @param folder  Folder path within storage (e.g. 'logos', 'products')
 */
export async function uploadFile(file: File, folder: string = 'misc'): Promise<string> {
  const fileExt  = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

  const url = await apiStorage.uploadImage(file, fileName);

  if (!url) {
    // Backend not yet live — return a local object URL as a temporary stand-in
    console.warn('[Storage] Backend not connected. Using temporary local object URL.');
    return URL.createObjectURL(file);
  }

  return url;
}

/**
 * Uploads a company logo.
 */
export async function uploadLogo(file: File): Promise<string> {
  return uploadFile(file, 'logos');
}
