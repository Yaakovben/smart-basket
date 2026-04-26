import { useSettings } from '../context/SettingsContext';

/**
 * useIsDark — shortcut ל-`settings.theme === 'dark'` שחוזר בעשרות קומפוננטות.
 * לא מוסיף ביצועים, רק חותך רעש ב-destructure של useSettings.
 *
 * לפני:  const { settings } = useSettings(); const isDark = settings.theme === 'dark';
 * אחרי:  const isDark = useIsDark();
 */
export const useIsDark = (): boolean => {
  const { settings } = useSettings();
  return settings.theme === 'dark';
};
