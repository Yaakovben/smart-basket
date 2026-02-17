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

// Automatic cache clearing on new deployments
// __BUILD_VERSION__ is injected by Vite at build time (unique per build)
const handleNewVersion = async () => {
  const storedVersion = localStorage.getItem('app_build_version');

  // Same version — nothing to do
  if (storedVersion === __BUILD_VERSION__) return;

  // Prevent reload loop: if we already reloaded for this version, just save and stop
  if (sessionStorage.getItem('version_reload_done') === __BUILD_VERSION__) {
    localStorage.setItem('app_build_version', __BUILD_VERSION__);
    return;
  }

  try {
    // 1. Clear all browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // 2. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }

    // 3. Save version and mark reload
    localStorage.setItem('app_build_version', __BUILD_VERSION__);
    sessionStorage.setItem('version_reload_done', __BUILD_VERSION__);

    // 4. Hard reload to get fresh content (only if there was a previous version)
    if (storedVersion) {
      window.location.reload();
      return;
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { context: 'version_update' } });
    // Save version even on error to avoid retry loops
    localStorage.setItem('app_build_version', __BUILD_VERSION__);
  }
};

// Run immediately on module load
handleNewVersion();

// Hide initial loader - called by AppRouter when auth is ready
export const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      loader.remove();
      // Remove green background from body once app is loaded
      document.body.classList.add('app-loaded');
    }, 300);
  }
};

const ThemedApp = () => {
  const { settings } = useSettings();

  // Register service worker for PWA support
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
