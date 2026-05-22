
import React, { createContext, useState, useEffect } from 'react';
import { getSettings, saveSettings as saveSettingsToStorage, restoreDefaultSettings, fetchSettingsFromSupabase, pushSettingsToSupabase, subscribeToSettings } from '../services/settingsService';
import { getCurrentUser } from '../services/authService';
import { applyCustomFonts } from '../services/fontLoader';
import { AppSettings, DEFAULT_SETTINGS, ColorScheme } from '../constants/defaultSettings';
import { TRANSLATIONS, Language } from '../constants/translations';

interface SettingsContextType {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  saveSettings: () => void;
  restoreDefaults: () => void;
  t: (key: string) => string;
  isDarkMode: boolean;
  currentColors: ColorScheme;
}

export const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => { },
  saveSettings: () => { },
  restoreDefaults: () => { },
  t: (key: string) => key,
  isDarkMode: false,
  currentColors: DEFAULT_SETTINGS.lightColors,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Ref to track if we have successfully initialized (fetched) settings
  // This prevents overwriting Cloud settings with Default settings before the fetch completes
  const settingsLoadedRef = React.useRef(false);

  // 1. Sync Settings from API (Initial Fetch + Polling)
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const initSettingsAndSubscribe = async () => {
      const user = getCurrentUser();
      if (user) {
        // A. Initial Fetch from Node.js API (falls back to localStorage when offline)
        const { settings: cloudSettings, sourceId } = await fetchSettingsFromSupabase(user.id);
        const subscribeId = sourceId || user.id;

        settingsLoadedRef.current = true;

        if (cloudSettings) {
          console.log('[Settings] Applied cloud settings (initial fetch)');
          setSettings(cloudSettings);
        }

        // B. Subscribe to settings updates (polling-based in Titan Stack)
        console.log('[Settings] Subscribing to settings for ID:', subscribeId);
        subscription = subscribeToSettings(subscribeId, (newSettings) => {
          console.log('[Settings] Applied settings update (poll)');
          setSettings(newSettings);
        });
      } else {
        settingsLoadedRef.current = true;
      }
    };

    initSettingsAndSubscribe();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 2. Auto-Push Changes to API (Debounced, Admin only)
  useEffect(() => {
    if (!settingsLoadedRef.current) return;

    const pushTimeout = setTimeout(async () => {
      const user = getCurrentUser();
      if (user && user.role === 'admin') {
        console.log('[Settings] Auto-pushing settings to API (Admin)...');
        await pushSettingsToSupabase(user.id, settings);
      } else if (user) {
        console.log('[Settings] Skipping settings push (non-admin).');
      }
    }, 2000);

    return () => clearTimeout(pushTimeout);
  }, [settings]);

  // 3. Dark Mode Logic
  useEffect(() => {
    const checkDarkMode = () => {
      if (settings.themeMode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return settings.themeMode === 'dark';
    };

    const isDark = checkDarkMode();
    setIsDarkMode(isDark);

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Listener for system preference changes if in system mode
    if (settings.themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const newIsDark = e.matches;
        setIsDarkMode(newIsDark);
        if (newIsDark) root.classList.add('dark');
        else root.classList.remove('dark');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings.themeMode]);

  // Apply colors based on mode and USER ROLE for GameX theme
  useEffect(() => {
    const root = document.documentElement;
    let colors = isDarkMode ? settings.darkColors : settings.lightColors;

    // GAMEX DYNAMIC ROLE COLORS
    if (settings.appLayout === 'gamex') {
      const userStr = localStorage.getItem('pos_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const roleColors: any = {
            admin: '#ff4d4d',       // Red (GameX Default)
            manager: '#a855f7',     // Purple
            cashier: '#3b82f6',     // Blue
            technician: '#f59e0b',  // Yellow
            inventory_manager: '#10b981', // Green
            customer: '#6b7280'     // Gray
          };
          
          if (user.role && roleColors[user.role]) {
            // Override the primary color with the role's color
            colors = { ...colors, primary: roleColors[user.role], accent: roleColors[user.role] };
          }
        } catch(e) {}
      }
    }

    // 1. Apply Colors
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);

    // 2. Apply Fonts
    // Crucial: Wrap font names in quotes to handle spaces (e.g. "Open Sans") and append generic fallback
    root.style.setProperty('--font-primary', `"${settings.primaryFont}", sans-serif`);
    root.style.setProperty('--font-primary-weight', settings.primaryFontWeight);
    root.style.setProperty('--font-primary-spacing', settings.primaryLetterSpacing);
    root.style.setProperty('--font-primary-color', settings.primaryFontColor);

    root.style.setProperty('--font-secondary', `"${settings.secondaryFont}", sans-serif`);
    root.style.setProperty('--font-secondary-weight', settings.secondaryFontWeight);
    root.style.setProperty('--font-secondary-spacing', settings.secondaryLetterSpacing);
    root.style.setProperty('--font-secondary-color', settings.secondaryFontColor);

    applyCustomFonts(settings.customFonts);

    // 3. Apply Font Size Scale
    if (settings.fontSizeScale === 'sm') {
      root.style.fontSize = '14px';
    } else if (settings.fontSizeScale === 'lg') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px'; // md
    }

    // 4. Apply Logo Size
    root.style.setProperty('--logo-size', `${settings.logoSize}px`);

    // Apply UI Scale
    const scale = settings.uiScale ? settings.uiScale / 100 : 1;
    root.style.setProperty('--ui-scale', `${scale}`);
    (root.style as any).zoom = scale.toString();

    // 5. Apply Language Direction
    if (settings.language === 'ar') {
      root.dir = 'rtl';
      root.lang = 'ar';
    } else {
      root.dir = 'ltr';
      root.lang = settings.language;
    }

  }, [settings, isDarkMode]);

  const handleSetSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    // Auto-save to local storage on any change to ensure persistence across reloads/restarts
    saveSettingsToStorage(newSettings);
  };

  const handleSaveSettings = () => {
    saveSettingsToStorage(settings);
  };

  const handleRestoreDefaults = () => {
    restoreDefaultSettings();
    setSettings(DEFAULT_SETTINGS);
  }

  // Translation Helper
  const t = (key: string): string => {
    const lang = settings.language as Language;
    // @ts-ignore
    const translation = TRANSLATIONS[lang]?.[key];
    if (translation) return translation;

    // Fallback to English
    // @ts-ignore
    const fallback = TRANSLATIONS['en']?.[key];
    return fallback || key;
  };

  const value = {
    settings,
    setSettings: handleSetSettings,
    saveSettings: handleSaveSettings,
    restoreDefaults: handleRestoreDefaults,
    t,
    isDarkMode,
    currentColors: isDarkMode ? settings.darkColors : settings.lightColors,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
