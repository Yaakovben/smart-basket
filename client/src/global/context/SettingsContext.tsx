/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { AppSettings, Language, ThemeMode, NotificationSettings } from '../types';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../constants';
import { translations, type TranslationKeys } from '../i18n/translations';
import { saveNotifSettingsToIDB } from '../../settingsIDB';

interface SettingsContextType {
  settings: AppSettings;
  updateTheme: (theme: ThemeMode) => void;
  updateLanguage: (language: Language) => void;
  updateNotifications: (notifications: Partial<NotificationSettings>) => void;
  toggleGroupMute: (groupId: string) => void;
  isGroupMuted: (groupId: string) => boolean;
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
  // Sync notification settings to IndexedDB for service worker access
  saveNotifSettingsToIDB(settings.notifications).catch(() => {/* ignore */});
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadSettings();
    // Sync to IndexedDB on initial load so SW has current settings
    saveNotifSettingsToIDB(loaded.notifications).catch(() => {/* ignore */});
    return loaded;
  });

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

  const toggleGroupMute = useCallback((groupId: string) => {
    setSettings(prev => {
      const muted = prev.notifications.mutedGroupIds || [];
      const updatedMuted = muted.includes(groupId)
        ? muted.filter(id => id !== groupId)
        : [...muted, groupId];
      const updated = { ...prev, notifications: { ...prev.notifications, mutedGroupIds: updatedMuted } };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const isGroupMuted = useCallback((groupId: string): boolean => {
    return (settings.notifications.mutedGroupIds || []).includes(groupId);
  }, [settings.notifications.mutedGroupIds]);

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
    toggleGroupMute,
    isGroupMuted,
    toggleDarkMode,
    t
  }), [settings, updateTheme, updateLanguage, updateNotifications, toggleGroupMute, isGroupMuted, toggleDarkMode, t]);

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
