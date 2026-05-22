/**
 * services/syncService.ts
 * Titan Stack — Sync Service (Stub)
 *
 * This service previously orchestrated RxDB ↔ Supabase replication.
 * It is now a stub that is ready to wire up WatermelonDB's built-in
 * sync protocol against the custom Node.js backend via apiBridge.
 *
 * When the backend is ready, implement `synchronize()` from WatermelonDB
 * using the `sync.pull` and `sync.push` methods from apiBridge.
 *
 * Reference: https://nozbe.github.io/WatermelonDB/docs/Sync
 */

import { database } from '../db';
import { subscribeToLocalWrites } from '../db';
import * as apiBridge from './apiBridge';
import { synchronize } from '@nozbe/watermelondb/sync';

// ─── Sync State ────────────────────────────────────────────────────────────────
let isSyncing = false;

/**
 * Performs a full WatermelonDB ↔ Node.js sync cycle.
 * Currently a stub — activates when VITE_BACKEND_READY=true.
 */
export const startSync = async (): Promise<void> => {
  if (isSyncing) {
    console.log('[SyncService] Sync already in progress, skipping.');
    return;
  }

  isSyncing = true;
  console.log('[SyncService] Starting sync cycle...');

  // Capture pulled IDs to reconcile backend deletions afterwards
  const pulledIds: Record<string, Set<string>> = {};

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        console.log(`[SyncService:PULL] ⬇️ Starting pull request. lastPulledAt: ${lastPulledAt}`);
        try {
          const { data, error } = await apiBridge.sync.pull(lastPulledAt);
          if (error) throw new Error(error || 'Pull failed');
          if (!data)  throw new Error('Pull failed: No data');

          // Capture every ID returned by the server for post-sync reconciliation
          for (const [table, changes] of Object.entries(data.changes as Record<string, any>)) {
            const ids = new Set<string>([
              ...(changes.created || []).map((r: any) => r.id),
              ...(changes.updated || []).map((r: any) => r.id),
            ]);
            pulledIds[table] = ids;
          }

          console.log(`[SyncService:PULL] ✅ Pull successful. timestamp: ${data.timestamp}`);
          return data;
        } catch (e) {
          console.error(`[SyncService:PULL] 🚨 CRITICAL PULL EXCEPTION:`, e);
          throw e;
        }
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        console.log(`[SyncService:PUSH] ⬆️ Starting push request.`);
        try {
          const { error } = await apiBridge.sync.push(changes, lastPulledAt);
          if (error) throw new Error(error);
          console.log(`[SyncService:PUSH] ✅ Push successful!`);
        } catch (e) {
          console.error(`[SyncService:PUSH] 🚨 CRITICAL PUSH EXCEPTION:`, e);
          throw e;
        }
      },
    });

    // ── Backend-deletion reconciliation ────────────────────────────────────────
    // The pull returns ALL records in PG. Any local record whose ID is missing
    // from the pull was physically deleted on the backend (pgAdmin, direct SQL).
    // We destroyPermanently() those orphans so the frontend stays in sync.
    const tableCollections: Record<string, any> = {
      products:       database.get('products'),
      customers:      database.get('customers'),
      sales:          database.get('sales'),
      repair_tickets: database.get('repair_tickets'),
    };

    for (const [table, collection] of Object.entries(tableCollections)) {
      const serverIds = pulledIds[table];
      if (!serverIds || serverIds.size === 0) continue; // skip if pull returned nothing (error case)

      const localRecords = await collection.query().fetch();
      const orphans = localRecords.filter((r: any) => !serverIds.has(r.id));

      if (orphans.length > 0) {
        console.log(`[SyncService] 🗑️ Reconciling ${orphans.length} backend-deleted record(s) from ${table}`);
        await database.write(async () => {
          for (const record of orphans) {
            await record.destroyPermanently();
          }
        });
      }
    }

    console.log('[SyncService] Sync cycle completed successfully.');
  } catch (err) {
    console.error('[SyncService] Sync failed:', err);
    throw err;
  } finally {
    isSyncing = false;
  }
};


let syncInterval: NodeJS.Timeout | null = null;
let isOnlineListenerAdded = false;
let eventSource: EventSource | null = null;

/**
 * Starts real-time sync via Server-Sent Events (SSE).
 *
 * Flow: PG row change → pg_notify trigger → Node.js LISTEN → SSE push → startSync()
 *
 * The browser's native EventSource auto-reconnects on drops.
 * A 30-second interval is kept as a safety fallback only.
 */
export const startAutoSync = (): (() => void) => {
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
  const token  = localStorage.getItem('pos_jwt_token');

  // Initial sync on mount
  startSync();

  // ── Local-write instant push ───────────────────────────────────────────────
  // Watches WatermelonDB for any local write and pushes to backend immediately
  // (debounced 500ms to batch rapid consecutive edits like bulk imports).
  const unsubscribeWrites = subscribeToLocalWrites(() => {
    // Guard: never fire during an active sync — pull-applied records can
    // momentarily appear as local writes, which would cause a sync loop.
    if (isSyncing) return;
    console.log('[SyncService] 📝 Local write detected — pushing immediately.');
    startSync();
  });

  // SSE real-time connection
  // EventSource doesn't support custom headers so token is passed as query param.
  if (eventSource) { eventSource.close(); eventSource = null; }

  const sseUrl = `${apiUrl}/api/sse?token=${token}`;
  eventSource  = new EventSource(sseUrl);

  eventSource.onopen = () => {
    console.log('[SyncService] ✅ SSE connected. Real-time sync active.');
  };

  eventSource.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (payload.type === 'sync') {
        console.log(`[SyncService] ⚡ PG change on "${payload.table}" (${payload.op}). Syncing now...`);
        startSync();
      }
    } catch (_) {}
  };

  eventSource.onerror = () => {
    console.warn('[SyncService] SSE error — browser will auto-reconnect.');
  };

  // Safety fallback: poll every 30s in case SSE misses a notification
  syncInterval = setInterval(() => {
    if (navigator.onLine) startSync();
  }, 30000);

  // Immediate sync on network reconnection
  const handleOnline = () => {
    console.log('[SyncService] Network reconnected. Triggering immediate sync.');
    startSync();
  };

  if (!isOnlineListenerAdded) {
    window.addEventListener('online', handleOnline);
    isOnlineListenerAdded = true;
  }

  return () => {
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    if (eventSource)  { eventSource.close();          eventSource  = null; }
    unsubscribeWrites();
    window.removeEventListener('online', handleOnline);
    isOnlineListenerAdded = false;
    console.log('[SyncService] Auto-sync stopped.');
  };
};


/**
 * @deprecated The concept of "healing" org IDs was specific to the
 * Supabase/RxDB architecture. In the Titan Stack, the org ID is
 * always set at creation time from the JWT payload.
 *
 * This stub is kept to prevent import errors in App.tsx during migration.
 */
export const healLocalData = async (
  _db: any,
  _organizationId: string
): Promise<void> => {
  console.log('[SyncService] healLocalData is a no-op in the Titan Stack.');
};

/**
 * Manual sync trigger — called from the Dashboard sync button.
 * Fetches the current user profile from the API and starts a sync cycle.
 */
export const performManualSync = async (_db: any): Promise<any> => {
  console.log('[SyncService] Manual sync triggered.');

  // Try to refresh user profile from the API bridge
  const { data: freshUser, error } = await apiBridge.auth.me();

  if (error) {
    console.warn('[SyncService] Could not refresh profile from API, using local cache.');
  } else if (freshUser) {
    localStorage.setItem('pos_user', JSON.stringify(freshUser));
  }

  // Run sync cycle
  await startSync();

  // Return the current user (from local cache if API unavailable)
  const cachedUser = localStorage.getItem('pos_user');
  return cachedUser ? JSON.parse(cachedUser) : null;
};
