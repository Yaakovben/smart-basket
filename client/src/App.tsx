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

// ניקוי cache אוטומטי בפריסות חדשות (לא חוסם את הטעינה)
// גרסה ייחודית לכל build, מוזרקת ע"י Vite
const handleNewVersion = () => {
  const storedVersion = localStorage.getItem('app_build_version');

  if (storedVersion === __BUILD_VERSION__) return;

  // מניעת לולאת רענון: אם כבר רעננו את הדף לגרסה הזו
  if (sessionStorage.getItem('version_reload_done') === __BUILD_VERSION__) {
    localStorage.setItem('app_build_version', __BUILD_VERSION__);
    return;
  }

  // רענון מיידי לגרסה חדשה אם הייתה גרסה קודמת
  if (storedVersion) {
    localStorage.setItem('app_build_version', __BUILD_VERSION__);
    sessionStorage.setItem('version_reload_done', __BUILD_VERSION__);
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
      } catch {}
      window.location.reload();
    };
    cleanup();
    return;
  }

  // התקנה ראשונה: שמירת גרסה בלי חסימה
  localStorage.setItem('app_build_version', __BUILD_VERSION__);
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
