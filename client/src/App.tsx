import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ConsentBanner, ErrorBoundary, UpdateBanner } from "./global/components";
import { useServiceWorker } from './global/hooks';

const ThemedApp = () => {
  const { settings } = useSettings();

  // Register service worker and handle updates
  const { needRefresh, updateServiceWorker } = useServiceWorker();

  const theme = useMemo(() =>
    createAppTheme(settings.theme, settings.language),
    [settings.theme, settings.language]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRouter />
        <ConsentBanner />
        <UpdateBanner show={needRefresh} onUpdate={updateServiceWorker} />
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
