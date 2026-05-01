import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ErrorBoundary } from "./global/components";
import { OfflineBanner } from "./global/components/OfflineBanner";
import { ReconnectingBanner } from "./global/components/ReconnectingBanner";
import { useServiceWorker } from './global/hooks';

// ניקוי cache אוטומטי בפריסות חדשות (לא חוסם את הטעינה).
// גרסה ייחודית לכל build, מוזרקת ע"י Vite. הגנה: אם ההזרקה נכשלה
// (typeof === 'undefined') מדלגים על הלוגיקה כולה כדי למנוע סיכון
// ללולאת רענון אינסופית.
const handleNewVersion = () => {
  // הגנה: אם __BUILD_VERSION__ לא הוזרק (build בעייתי או runtime ישן),
  // לא מבצעים השוואה - הגרסה תיכתב ב-build הבא.
  if (typeof __BUILD_VERSION__ === 'undefined' || !__BUILD_VERSION__) {
    console.warn('[version] __BUILD_VERSION__ not injected - skipping cache cleanup');
    return;
  }
  const buildVersion = __BUILD_VERSION__;
  const storedVersion = localStorage.getItem('app_build_version');

  if (storedVersion === buildVersion) return;

  // מניעת לולאת רענון: אם כבר רעננו את הדף לגרסה הזו
  if (sessionStorage.getItem('version_reload_done') === buildVersion) {
    localStorage.setItem('app_build_version', buildVersion);
    return;
  }

  // רענון מיידי לגרסה חדשה אם הייתה גרסה קודמת
  if (storedVersion) {
    localStorage.setItem('app_build_version', buildVersion);
    sessionStorage.setItem('version_reload_done', buildVersion);
    // ניקוי cache ברקע לפני רענון
    const cleanup = async () => {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
        }
      } catch (err) {
        console.warn('[version] cache/SW cleanup failed (non-fatal):', err);
      }
      window.location.reload();
    };
    cleanup();
    return;
  }

  // התקנה ראשונה: שמירת גרסה בלי חסימה
  localStorage.setItem('app_build_version', buildVersion);
};

handleNewVersion();

// הסתרת מסך הטעינה הראשוני, נקרא כשהאימות מוכן
export const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      loader.remove();
      document.body.classList.add('app-loaded');
    }, 300);
  }
};

const ThemedApp = () => {
  const { settings } = useSettings();

  useServiceWorker();

  const theme = useMemo(() =>
    createAppTheme(settings.theme, settings.language),
    [settings.theme, settings.language]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OfflineBanner />
      <ReconnectingBanner />
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <SettingsProvider>
      <ThemedApp />
    </SettingsProvider>
  </ErrorBoundary>
);

export default App;
