import { useMemo, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ErrorBoundary } from "./global/components";
import { useServiceWorker } from './global/hooks';

// Hide initial loader when app is ready
const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => loader.remove(), 300);
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

  // Hide initial loader after app is mounted and ready
  useEffect(() => {
    // Small delay to ensure content is painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hideInitialLoader();
      });
    });
  }, []);

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
