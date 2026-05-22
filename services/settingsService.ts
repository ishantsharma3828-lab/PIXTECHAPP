/**
 * services/settingsService.ts
 * Titan Stack — Settings Service
 *
 * Core logic (getSettings, saveSettings) is unchanged — all stored in localStorage.
 * Supabase realtime channel is replaced with a lightweight polling stub.
 * Remote fetch/push now goes through apiBridge.settings.
 */

import { DEFAULT_SETTINGS, AppSettings } from '../constants/defaultSettings';
import { settings as apiSettings } from './apiBridge';

const SETTINGS_KEY = 'pos_app_settings';

// ─── Local Storage Layer (unchanged) ──────────────────────────────────────────

export const getSettings = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      const migrated: any = {};

      // Migrate: Address string → object array
      if (parsed.companyAddress && typeof parsed.companyAddress === 'string') {
        migrated.companyAddresses = [{ id: 'addr_migrated_1', street: parsed.companyAddress, city: '', state: '', zip: '', country: '' }];
        delete parsed.companyAddress;
      }
      if (parsed.companyAddresses && Array.isArray(parsed.companyAddresses)) {
        migrated.companyAddresses = parsed.companyAddresses.map((addr: any, idx: number) =>
          typeof addr === 'string' ? { id: `addr_migrated_${idx}`, street: addr, city: '', state: '', zip: '', country: '' } : addr
        );
      }

      // Migrate: Phone string → array
      if (parsed.companyPhone && typeof parsed.companyPhone === 'string') {
        migrated.companyPhones = [parsed.companyPhone];
        delete parsed.companyPhone;
      }

      // Migrate: Email string → array
      if (parsed.companyEmail && typeof parsed.companyEmail === 'string') {
        migrated.companyEmails = [parsed.companyEmail];
        delete parsed.companyEmail;
      }

      // Migrate: Website string → array
      if (parsed.companyWebsite && typeof parsed.companyWebsite === 'string') {
        migrated.companyWebsites = [parsed.companyWebsite];
        delete parsed.companyWebsite;
      }

      // Migrate: Business activity string → array
      if (parsed.businessActivity && typeof parsed.businessActivity === 'string') {
        migrated.businessActivities = [parsed.businessActivity];
        delete parsed.businessActivity;
      }

      // Migrate: Social media flat fields → array
      if (!parsed.socialMediaLinks) {
        const links = [];
        if (parsed.facebookUrl)  links.push({ platform: 'Facebook',  url: parsed.facebookUrl });
        if (parsed.instagramUrl) links.push({ platform: 'Instagram', url: parsed.instagramUrl });
        if (parsed.twitterUrl)   links.push({ platform: 'Twitter',   url: parsed.twitterUrl });
        if (links.length > 0) migrated.socialMediaLinks = links;
      }

      // Migrate: Colors flat → nested
      if (parsed.primaryColor && !parsed.lightColors) {
        migrated.lightColors = {
          primary:   parsed.primaryColor   || DEFAULT_SETTINGS.lightColors.primary,
          secondary: parsed.secondaryColor || DEFAULT_SETTINGS.lightColors.secondary,
          accent:    parsed.accentColor    || DEFAULT_SETTINGS.lightColors.accent,
        };
        migrated.darkColors = DEFAULT_SETTINGS.darkColors;
        delete parsed.primaryColor;
        delete parsed.secondaryColor;
        delete parsed.accentColor;
      }

      return { ...DEFAULT_SETTINGS, ...parsed, ...migrated };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('[Settings] Failed to get settings, returning default.', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[Settings] Failed to save settings.', error);
  }
};

export const restoreDefaultSettings = (): void => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error('[Settings] Failed to restore default settings.', error);
  }
};

// ─── Remote Layer (apiBridge) ──────────────────────────────────────────────────

/**
 * Fetches settings from the Node.js API.
 * Falls back to local settings if the backend is not yet connected.
 * Previously named `fetchSettingsFromSupabase`.
 */
export const fetchSettingsFromSupabase = async (
  userId: string
): Promise<{ settings: AppSettings | null; sourceId: string | null }> => {
  // Derive orgId — in Titan Stack the user carries it in their local session
  const userStr = localStorage.getItem('pos_user');
  const orgId = userStr ? (JSON.parse(userStr)?.organizationId || userId) : userId;

  try {
    const { data, error } = await apiSettings.fetch(orgId);
    if (error || !data) {
      // Backend not ready → serve from local cache
      return { settings: getSettings(), sourceId: orgId };
    }

    const merged: AppSettings = { ...DEFAULT_SETTINGS, ...(data as AppSettings) };
    saveSettings(merged);
    return { settings: merged, sourceId: orgId };
  } catch (err) {
    console.error('[Settings] fetchSettings error:', err);
    return { settings: null, sourceId: null };
  }
};

export const getAdminIdForOrganization = async (_orgId: string): Promise<string | null> => {
  // Stub — the Node.js API will handle this via JWT org context
  return null;
};

/**
 * Pushes settings to the Node.js API.
 * Previously named `pushSettingsToSupabase`.
 */
export const pushSettingsToSupabase = async (userId: string, settings: AppSettings): Promise<void> => {
  const userStr = localStorage.getItem('pos_user');
  const orgId = userStr ? (JSON.parse(userStr)?.organizationId || userId) : userId;

  const { error } = await apiSettings.push(orgId, settings as any);
  if (error) {
    console.error('[Settings] Failed to push settings:', error);
  } else {
    console.log('[Settings] Settings pushed to API successfully.');
  }
};

/**
 * Subscribes to remote settings changes.
 * Supabase realtime channel is replaced with a simple polling interval.
 * Returns a cleanup function (matches the old `channel` return interface).
 */
export const subscribeToSettings = (
  _userId: string,
  onUpdate: (newSettings: AppSettings) => void
): { unsubscribe: () => void } => {
  console.log('[Settings] Polling mode enabled (realtime channel replaced).');

  const userStr = localStorage.getItem('pos_user');
  const orgId = userStr ? JSON.parse(userStr)?.organizationId : null;
  if (!orgId) return { unsubscribe: () => {} };

  // Poll every 60 seconds for settings updates from the API
  const interval = setInterval(async () => {
    const { data } = await apiSettings.fetch(orgId);
    if (data) {
      const merged = { ...DEFAULT_SETTINGS, ...(data as AppSettings) };
      onUpdate(merged);
    }
  }, 60_000);

  return { unsubscribe: () => clearInterval(interval) };
};
