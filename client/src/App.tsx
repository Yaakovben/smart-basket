import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import * as Sentry from '@sentry/react';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ErrorBoundary } from "./global/components";
import { OfflineBanner } from "./global/components/OfflineBanner";
import { useServiceWorker } from './global/hooks';

// ניקוי cache אוטומטי בפריסות חדשות
// גרסה ייחודית לכל build, מוזרקת ע"י Vite
const handleNewVersion = async () => {
  const storedVersion = localStorage.getItem('app_build_version');

  if (storedVersion === __BUILD_VERSION__) return;

  // מניעת לולאת רענון: אם כבר רעננו את הדף לגרסה הזו
  if (sessionStorage.getItem('version_reload_done') === __BUILD_VERSION__) {
    localStorage.setItem('app_build_version', __BUILD_VERSION__);
    return;
  }

  try {
    // 1. ניקוי כל המטמון
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // 2. ביטול רישום של כל service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }

    // 3. שמירת גרסה וסימון רענון
    localStorage.setItem('app_build_version', __BUILD_VERSION__);
    sessionStorage.setItem('version_reload_done', __BUILD_VERSION__);

    // 4. רענון קשיח לקבלת תוכן טרי (רק אם הייתה גרסה קודמת)
    if (storedVersion) {
      window.location.reload();
      return;
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { context: 'version_update' } });
    localStorage.setItem('app_build_version', __BUILD_VERSION__);
  }
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
