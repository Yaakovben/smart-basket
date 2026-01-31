/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { AppSettings, Language, ThemeMode, NotificationSettings } from '../types';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../constants';
import { translations, type TranslationKeys } from '../i18n/translations';

interface SettingsContextType {
  settings: AppSettings;
  updateTheme: (theme: ThemeMode) => void;
  updateLanguage: (language: Language) => void;
  updateNotifications: (notifications: Partial<NotificationSettings>) => void;
  toggleDarkMode: () => void;
  t: (key: TranslationKeys) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed, notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications } };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
};

const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateTheme = useCallback((theme: ThemeMode) => {
    setSettings(prev => {
      const updated = { ...prev, theme };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateLanguage = useCallback((language: Language) => {
    setSettings(prev => {
      const updated = { ...prev, language };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateNotifications = useCallback((notificationUpdates: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, notifications: { ...prev.notifications, ...notificationUpdates } };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    setSettings(prev => {
      const updated = { ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' as ThemeMode };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const t = useCallback((key: TranslationKeys): string => {
    return translations[settings.language][key] || key;
  }, [settings.language]);

  const value = useMemo(() => ({
    settings,
    updateTheme,
    updateLanguage,
    updateNotifications,
    toggleDarkMode,
    t
  }), [settings, updateTheme, updateLanguage, updateNotifications, toggleDarkMode, t]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
