import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import * as Sentry from '@sentry/react';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ErrorBoundary } from "./global/components";
import { useServiceWorker } from './global/hooks';

// Clear all the  caches on app load (one-time cleanup for v2.0 migration)
const CACHE_VERSION = 'v2.0';
const clearAllCaches = async () => {
  const cacheCleared = localStorage.getItem('cache_cleared');
  if (cacheCleared === CACHE_VERSION) return; // Already cleared for this version

  try {
    // Clear all browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    localStorage.setItem('cache_cleared', CACHE_VERSION);
  } catch (error) {
    Sentry.captureException(error, { tags: { context: 'cache_clear' } });
  }
};

// Run immediately on module load
clearAllCaches();

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
