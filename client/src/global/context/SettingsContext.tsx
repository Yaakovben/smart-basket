/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { AppSettings, Language, ThemeMode, NotificationSettings } from '../types';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../constants';
import { translations, type TranslationKeys } from '../i18n/translations';
import { saveNotifSettingsToIDB } from '../../settingsIDB';
import { authApi } from '../../services/api';

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

// hadStoredSettings מסמן אם בכניסה הראשונית היה כבר מידע שמור.
// משמש כדי לדלג על כתיבה ל-IDB באתחול כשאין שום שינוי לשמור (משתמש חדש).
let hadStoredSettings = false;
const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      hadStoredSettings = true;
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed, notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications } };
    }
  } catch {
    // התעלמות משגיאת localStorage
  }
  return DEFAULT_SETTINGS;
};

const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  // סנכרון הגדרות התראות ל-IndexedDB עבור ה-Service Worker
  saveNotifSettingsToIDB(settings.notifications).catch(() => {/* ignore */});
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadSettings();
    // סנכרון ל-IndexedDB רק כשהיו הגדרות שמורות (כלומר שונה מברירת המחדל).
    // למשתמש חדש בלי הגדרות אין מה לסנכרן ב-cold start - חוסך כתיבה ורינדור מיותרים.
    if (hadStoredSettings) {
      saveNotifSettingsToIDB(loaded.notifications).catch(() => {/* ignore */});
    }
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

  // Toggle אופטימי בקליינט + סנכרון מיידי לשרת. ה-server source-of-truth
  // (User.mutedGroupIds ב-MongoDB) הוא זה שמכריע אם להישלח push בפועל.
  // לכן חובה לסנכרן - אחרת השתקה לא תעצור התראות וביטול לא יחזיר אותן.
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
    // שליחה לשרת ברקע. נכשל בשקט - הקליינט כבר התעדכן אופטימית.
    authApi.toggleMuteGroup(groupId).catch(() => { /* ignore */ });
  }, []);

  // סנכרון חד-פעמי בעת טעינה: מושכים את הרשימה האמיתית מהשרת
  // ומשלבים עם הקיים מקומית. השרת תמיד מנצח. רץ פעם בכל session.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    authApi.getProfile()
      .then(profile => {
        if (!profile?.mutedGroupIds) return;
        const serverMuted = profile.mutedGroupIds.map(String);
        setSettings(prev => {
          const localMuted = prev.notifications.mutedGroupIds || [];
          if (localMuted.length === serverMuted.length
              && localMuted.every(id => serverMuted.includes(id))) return prev;
          const updated = { ...prev, notifications: { ...prev.notifications, mutedGroupIds: serverMuted } };
          saveSettings(updated);
          return updated;
        });
      })
      .catch(() => { /* offline / not logged in - לא קריטי */ });
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
